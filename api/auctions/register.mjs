import { assertAllowedOrigin, createAuctionToken, publicError, readJson, requireAccessCode, requireAddress, requireAuctionId, requirePost, sendJson } from "../_security.mjs";
import { platformAuctionContract } from "../_contract.mjs";

export default async function handler(request, response) {
  if (!requirePost(request, response)) return;
  try {
    assertAllowedOrigin(request);
    const body = await readJson(request);
    const auctionId = requireAuctionId(body.auctionId);
    const bidderId = requireAddress(body.bidderId, "bidder ID");
    requireAccessCode(body.accessCode);

    const { contract } = await platformAuctionContract();
    const lot = await contract.getAuction(auctionId);
    if (Number(lot.status) !== 0 || BigInt(lot.startAt) <= BigInt(Math.floor(Date.now() / 1_000))) {
      throw new Error("Registration for this lot is closed. Choose an upcoming auction.");
    }
    const transaction = await contract.approveBidder(auctionId, bidderId);
    await transaction.wait(1);
    sendJson(response, 200, { accessToken: createAuctionToken({ auctionId, bidderId }), transactionHash: transaction.hash });
  } catch (error) {
    sendJson(response, 400, { error: publicError(error) });
  }
}
