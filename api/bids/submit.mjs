import { assertAllowedOrigin, publicError, readJson, requireAddress, requireAuctionId, requireExactBytes32, requireHex, requirePost, sendJson, verifyAuctionToken } from "../_security.mjs";
import { platformAuctionContract } from "../_contract.mjs";

export default async function handler(request, response) {
  if (!requirePost(request, response)) return;
  try {
    assertAllowedOrigin(request);
    const body = await readJson(request);
    const auctionId = requireAuctionId(body.auctionId);
    const bidderId = requireAddress(body.bidderId, "bidder ID");
    const encryptedBid = requireExactBytes32(body.encryptedBid, "encrypted bid");
    const inputProof = requireHex(body.inputProof, "input proof", 128_000);
    verifyAuctionToken(body.accessToken, auctionId, bidderId);

    const { contract } = await platformAuctionContract();
    let lot = await contract.getAuction(auctionId);
    const now = BigInt(Math.floor(Date.now() / 1_000));
    // The contract has a permissionless open transition. The relay advances it on the first valid offer
    // so buyers do not need a wallet or a background cron job merely to open an on-time lot.
    if (Number(lot.status) === 0 && BigInt(lot.startAt) <= now) {
      const opening = await contract.openAuction(auctionId);
      await opening.wait(1);
      lot = await contract.getAuction(auctionId);
    }
    if (Number(lot.status) !== 1 || BigInt(lot.endAt) <= now) {
      throw new Error("This auction is not accepting offers.");
    }
    const transaction = await contract.submitBidFor(auctionId, bidderId, encryptedBid, inputProof);
    await transaction.wait(1);
    sendJson(response, 200, { transactionHash: transaction.hash });
  } catch (error) {
    sendJson(response, 400, { error: publicError(error) });
  }
}
