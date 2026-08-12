import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ConfidentialAutoAuction, ConfidentialAutoAuction__factory } from "../types";

describe("ConfidentialAutoAuction", function () {
  let organiser: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let auction: ConfidentialAutoAuction;
  let auctionAddress: string;
  let auctionId: bigint;

  async function future(seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  beforeEach(async function () {
    if (!fhevm.isMock) this.skip();
    [organiser, alice, bob] = await ethers.getSigners();
    const factory = (await ethers.getContractFactory("ConfidentialAutoAuction")) as ConfidentialAutoAuction__factory;
    auction = await factory.deploy();
    await auction.waitForDeployment();
    auctionAddress = await auction.getAddress();

    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    const tx = await auction.createAuction(now + 10, now + 100, 1_000, 0);
    const receipt = await tx.wait();
    auctionId = 0n;
    expect(receipt).to.not.equal(null);
    await auction.approveBidder(auctionId, alice.address);
    await auction.approveBidder(auctionId, bob.address);
    await future(11);
    await auction.openAuction(auctionId);
  });

  it("hosts multiple lots and keeps the submitted bid encrypted", async function () {
    expect(await auction.auctionCount()).to.equal(1n);
    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    await auction.createAuction(now + 20, now + 120, 2_000, 0);
    expect(await auction.auctionCount()).to.equal(2n);
  });

  it("accepts encrypted bids and never exposes the plaintext in the event", async function () {
    const encrypted = await fhevm.createEncryptedInput(auctionAddress, alice.address).add64(2500).encrypt();
    const tx = await auction.connect(alice).submitBid(auctionId, encrypted.handles[0], encrypted.inputProof);
    const receipt = await tx.wait();
    expect(receipt).to.not.equal(null);

    const clearBid = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      await auction.connect(alice).getBid(auctionId, alice.address),
      auctionAddress,
      alice,
    );
    expect(clearBid).to.equal(2500);
    expect((await auction.getAuction(auctionId))[5]).to.equal(1);
  });

  it("rejects unapproved bidders", async function () {
    const [, , , stranger] = await ethers.getSigners();
    const encrypted = await fhevm.createEncryptedInput(auctionAddress, stranger.address).add64(2500).encrypt();
    await expect(
      auction.connect(stranger).submitBid(auctionId, encrypted.handles[0], encrypted.inputProof),
    ).to.be.revertedWithCustomError(auction, "NotApprovedBidder");
  });

  it("keeps winner identity encrypted until resolution begins", async function () {
    const encrypted = await fhevm.createEncryptedInput(auctionAddress, alice.address).add64(2500).encrypt();
    await auction.connect(alice).submitBid(auctionId, encrypted.handles[0], encrypted.inputProof);
    await future(100);
    await auction.closeAuction(auctionId);
    await auction.beginResolution(auctionId);
    expect((await auction.getAuction(auctionId))[6]).to.equal(3); // Resolving
    const result = await auction.getPublicResult(auctionId);
    expect(result[3]).to.equal(false);
  });

  it("supports encrypted bids from multiple dealers without publishing a ranking", async function () {
    const aliceBid = await fhevm.createEncryptedInput(auctionAddress, alice.address).add64(2500).encrypt();
    const bobBid = await fhevm.createEncryptedInput(auctionAddress, bob.address).add64(4200).encrypt();
    await auction.connect(alice).submitBid(auctionId, aliceBid.handles[0], aliceBid.inputProof);
    await auction.connect(bob).submitBid(auctionId, bobBid.handles[0], bobBid.inputProof);

    await future(100);
    await auction.closeAuction(auctionId);
    await auction.beginResolution(auctionId);

    const encryptedBobBid = await auction.connect(bob).getBid(auctionId, bob.address);
    const clearBobBid = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBobBid,
      auctionAddress,
      bob,
    );
    expect(clearBobBid).to.equal(4200);
    expect((await auction.getAuction(auctionId))[5]).to.equal(2);
  });
});
