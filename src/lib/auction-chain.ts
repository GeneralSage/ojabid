import { Contract, JsonRpcProvider } from "ethers";
import { contractConfig, hasConfiguredDeployment } from "./contract-config";
import type { AuctionStatus } from "../types";

const auctionReadAbi = [
  "function getAuction(uint256 auctionId) view returns (address organiser, uint64 startAt, uint64 endAt, uint64 minimumBid, uint64 bidIncrement, uint64 reservePrice, uint32 bidderCount, uint8 status)",
];

export type PublicAuctionState = {
  status: AuctionStatus;
  endsIn: string;
  sealedOfferCount: number;
  openingBidNaira: number;
  bidIncrementNaira: number;
};

function relativeTime(seconds: number) {
  if (seconds <= 0) return "now";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days} day${days === 1 ? "" : "s"}${hours ? ` ${hours} hr` : ""}`;
  if (hours > 0) return `${hours} hr${hours === 1 ? "" : "s"}${minutes ? ` ${minutes} min` : ""}`;
  return `${Math.max(minutes, 1)} min`;
}

function koboToNaira(amount: bigint) {
  const naira = amount / 100n;
  if (naira > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Auction value exceeds supported display range.");
  return Number(naira);
}

function toDisplayState(lot: {
  startAt: bigint;
  endAt: bigint;
  minimumBid: bigint;
  bidIncrement: bigint;
  bidderCount: bigint;
  status: bigint;
}, now: number): PublicAuctionState {
  const startAt = Number(lot.startAt);
  const endAt = Number(lot.endAt);
  const status = Number(lot.status);
  const startsIn = startAt - now;
  const endsIn = endAt - now;

  if (status === 0) {
    return {
      status: "Opening soon",
      endsIn: startsIn > 0 ? `Registration closes in ${relativeTime(startsIn)}` : "Opening for the first offer",
      sealedOfferCount: Number(lot.bidderCount),
      openingBidNaira: koboToNaira(lot.minimumBid),
      bidIncrementNaira: koboToNaira(lot.bidIncrement),
    };
  }

  if (status === 1 && endsIn > 0) {
    return {
      status: endsIn <= 2 * 3_600 ? "Closing soon" : "Open",
      endsIn: `Closes in ${relativeTime(endsIn)}`,
      sealedOfferCount: Number(lot.bidderCount),
      openingBidNaira: koboToNaira(lot.minimumBid),
      bidIncrementNaira: koboToNaira(lot.bidIncrement),
    };
  }

  return {
    status: "Closed",
    endsIn: status === 4 ? "Result settled" : "Auction closed",
    sealedOfferCount: Number(lot.bidderCount),
    openingBidNaira: koboToNaira(lot.minimumBid),
    bidIncrementNaira: koboToNaira(lot.bidIncrement),
  };
}

/** Reads only the contract's public rules, lifecycle and encrypted-offer count. */
export async function fetchPublicAuctionStates(auctionIds: number[]) {
  if (!hasConfiguredDeployment) return new Map<number, PublicAuctionState>();
  const provider = new JsonRpcProvider(contractConfig.rpcUrl, contractConfig.chainId, { staticNetwork: true });
  const contract = new Contract(contractConfig.auctionAddress, auctionReadAbi, provider);
  const now = Math.floor(Date.now() / 1_000);
  const reads = await Promise.allSettled(auctionIds.map(async (auctionId) => ({ auctionId, lot: await contract.getAuction(auctionId) })));
  const states = new Map<number, PublicAuctionState>();
  for (const read of reads) {
    if (read.status !== "fulfilled") continue;
    states.set(read.value.auctionId, toDisplayState(read.value.lot, now));
  }
  return states;
}
