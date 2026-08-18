import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ConfidentialAutoAuction, ConfidentialAutoAuction__factory } from "../types";

describe("ConfidentialAutoAuction", function () {
  let _organiser: HardhatEthersSigner;
  let _platformRelay: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;
  let auction: ConfidentialAutoAuction;
  let auctionAddress: string;
  let auctionId: bigint;

  async function advance(seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  async function encryptedBid(amountInKobo: number) {
    // The browser encrypts to the platform relay address. The relay submits only ciphertext and proof.
    return fhevm.createEncryptedInput(auctionAddress, _platformRelay.address).add64(amountInKobo).encrypt();
  }

  async function submit(bidderId: HardhatEthersSigner, amountInKobo: number) {
    const encrypted = await encryptedBid(amountInKobo);
    return auction
      .connect(_platformRelay)
      .submitBidFor(auctionId, bidderId.address, encrypted.handles[0], encrypted.inputProof);
  }

  async function resolveAndSettle(caller: HardhatEthersSigner = outsider) {
    const resolutionTx = await auction.connect(caller).beginResolution(auctionId);
    const resolutionReceipt = await resolutionTx.wait();
    const resolution = resolutionReceipt!.logs
      .map((log) => {
        try {
          return auction.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event) => event?.name === "ResultReady");

    expect(resolution).to.not.equal(undefined);
    const decrypted = await fhevm.publicDecrypt([
      resolution!.args.encryptedWinningBid,
      resolution!.args.encryptedWinner,
    ]);
    await auction.connect(caller).settleResult(auctionId, decrypted.abiEncodedClearValues, decrypted.decryptionProof);
  }

  beforeEach(async function () {
    if (!fhevm.isMock) this.skip();
    [_organiser, _platformRelay, alice, bob, outsider] = await ethers.getSigners();
    const factory = (await ethers.getContractFactory("ConfidentialAutoAuction")) as ConfidentialAutoAuction__factory;
    auction = await factory.deploy(_platformRelay.address);
    await auction.waitForDeployment();
    auctionAddress = await auction.getAddress();

    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    // 1,000 kobo = ₦10. All contract money values are integer kobo.
    await auction.createAuction(now + 10, now + 100, 1_000, 100, 0);
    auctionId = 0n;
    await auction.approveBidder(auctionId, alice.address);
    await auction.approveBidder(auctionId, bob.address);
    await advance(11);
    await auction.connect(outsider).openAuction(auctionId);
  });

  it("hosts multiple lots and exposes only public lot rules", async function () {
    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    await auction.createAuction(now + 20, now + 120, 2_000, 500, 3_000);
    expect(await auction.auctionCount()).to.equal(2n);
    const lot = await auction.getAuction(auctionId);
    expect(lot.minimumBid).to.equal(1_000);
    expect(lot.bidIncrement).to.equal(100);
    expect(lot.bidderCount).to.equal(0);
  });

  it("accepts only a relay-submitted proof bound to the platform account", async function () {
    const encrypted = await encryptedBid(250_000);
    await expect(
      auction.connect(alice).submitBidFor(auctionId, alice.address, encrypted.handles[0], encrypted.inputProof),
    ).to.be.revertedWithCustomError(auction, "NotBidRelay");

    await submit(alice, 250_000);
    expect((await auction.getAuction(auctionId)).bidderCount).to.equal(1);
  });

  it("does not publish a bidder identity or plaintext value in BidSubmitted", async function () {
    const tx = await submit(alice, 250_000);
    const receipt = await tx.wait();
    const bidEvent = receipt!.logs
      .map((log) => {
        try {
          return auction.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event) => event?.name === "BidSubmitted");

    expect(bidEvent!.args).to.not.have.property("bidder");
    expect(bidEvent!.args.encryptedBid).to.not.equal(250_000);
    expect((await auction.getAuction(auctionId)).bidderCount).to.equal(1);
  });

  it("rejects unapproved bidders, repeat bids, late approval and active-auction cancellation", async function () {
    const strangerInput = await encryptedBid(250_000);
    await expect(
      auction.connect(_platformRelay).submitBidFor(auctionId, outsider.address, strangerInput.handles[0], strangerInput.inputProof),
    ).to.be.revertedWithCustomError(auction, "NotApprovedBidder");

    await expect(auction.approveBidder(auctionId, outsider.address)).to.be.revertedWithCustomError(
      auction,
      "InvalidStatus",
    );
    await expect(auction.cancelAuction(auctionId)).to.be.revertedWithCustomError(auction, "InvalidStatus");

    await submit(alice, 250_000);
    const secondBid = await encryptedBid(300_000);
    await expect(
      auction.connect(_platformRelay).submitBidFor(auctionId, alice.address, secondBid.handles[0], secondBid.inputProof),
    ).to.be.revertedWithCustomError(auction, "AlreadyBid");
  });

  it("does not let an invalid or off-increment first offer become the winner", async function () {
    await submit(alice, 1_050); // valid minimum, but not on the 100-kobo increment.
    await submit(bob, 250_000);
    await advance(100);
    await auction.connect(outsider).closeAuction(auctionId);
    await resolveAndSettle();

    const result = await auction.getPublicResult(auctionId);
    expect(result.winner).to.equal(bob.address);
    expect(result.winningBid).to.equal(250_000);
    expect(result.reserveMet).to.equal(true);
    expect(result.settled).to.equal(true);
  });

  it("uses first valid sealed offer as the deterministic tie breaker", async function () {
    await submit(alice, 250_000);
    await submit(bob, 250_000);
    await advance(100);
    await auction.connect(outsider).closeAuction(auctionId);
    await resolveAndSettle();

    const result = await auction.getPublicResult(auctionId);
    expect(result.winner).to.equal(alice.address);
    expect(result.winningBid).to.equal(250_000);
  });

  it("settles a no-offer lot cleanly without public decryption", async function () {
    await advance(100);
    await auction.connect(outsider).closeAuction(auctionId);
    await expect(auction.connect(outsider).beginResolution(auctionId))
      .to.emit(auction, "AuctionSettled")
      .withArgs(auctionId, ethers.ZeroAddress, 0, false);

    const result = await auction.getPublicResult(auctionId);
    expect(result.winner).to.equal(ethers.ZeroAddress);
    expect(result.winningBid).to.equal(0);
    expect(result.reserveMet).to.equal(false);
    expect(result.settled).to.equal(true);
  });

  it("accepts only the proof-backed FHE public decryption outcome", async function () {
    await submit(alice, 250_000);
    await submit(bob, 420_000);
    await advance(100);
    await auction.connect(outsider).closeAuction(auctionId);
    await resolveAndSettle();

    const result = await auction.getPublicResult(auctionId);
    expect(result.winner).to.equal(bob.address);
    expect(result.winningBid).to.equal(420_000);
    expect(result.settled).to.equal(true);
  });
});
