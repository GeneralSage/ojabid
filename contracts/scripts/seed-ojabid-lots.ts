import { vars } from "hardhat/config";
import { ethers } from "hardhat";
import { isAddress } from "ethers";

const KOBO_PER_NAIRA = 100;
const START_DELAY_SECONDS = 30 * 60;
const AUCTION_DURATION_SECONDS = 7 * 24 * 60 * 60;

type OjaBidLot = {
  lot: string;
  minimumNaira: number;
  incrementNaira: number;
};

// These are deliberately public auction rules. Bid maxima themselves are never included in this script.
const lots: OjaBidLot[] = [
  { lot: "OJ-2401", minimumNaira: 24_000_000, incrementNaira: 100_000 },
  { lot: "OJ-2398", minimumNaira: 52_000_000, incrementNaira: 250_000 },
  { lot: "OJ-2404", minimumNaira: 9_000_000, incrementNaira: 50_000 },
  { lot: "OJ-2387", minimumNaira: 26_000_000, incrementNaira: 250_000 },
  { lot: "OJ-2408", minimumNaira: 17_000_000, incrementNaira: 100_000 },
  { lot: "OJ-2410", minimumNaira: 31_000_000, incrementNaira: 250_000 },
  { lot: "OJ-2412", minimumNaira: 38_000_000, incrementNaira: 250_000 },
  { lot: "OJ-2414", minimumNaira: 42_000_000, incrementNaira: 250_000 },
  { lot: "OJ-2416", minimumNaira: 50_000_000, incrementNaira: 250_000 },
  { lot: "OJ-2418", minimumNaira: 41_000_000, incrementNaira: 250_000 },
  { lot: "OJ-2420", minimumNaira: 8_500_000, incrementNaira: 50_000 },
  { lot: "OJ-2422", minimumNaira: 9_500_000, incrementNaira: 50_000 },
];

async function main() {
  const auctionAddress = vars.get("OJABID_AUCTION_ADDRESS", "");
  if (!isAddress(auctionAddress)) {
    throw new Error("Set OJABID_AUCTION_ADDRESS to the deployed ConfidentialAutoAuction address before seeding.");
  }

  const [organiser] = await ethers.getSigners();
  const auction = await ethers.getContractAt("ConfidentialAutoAuction", auctionAddress, organiser);
  const count = await auction.auctionCount();
  if (count !== 0n) {
    throw new Error(`Refusing to seed ${auctionAddress}: it already contains ${count.toString()} auction(s).`);
  }

  const latestBlock = await ethers.provider.getBlock("latest");
  if (!latestBlock) throw new Error("Could not determine the current Sepolia block time.");
  const startAt = BigInt(latestBlock.timestamp + START_DELAY_SECONDS);
  const endAt = startAt + BigInt(AUCTION_DURATION_SECONDS);

  console.log(`Seeding ${lots.length} OjaBid lots. Registration closes at ${new Date(Number(startAt) * 1_000).toISOString()}.`);
  console.log(`Bidding closes at ${new Date(Number(endAt) * 1_000).toISOString()}.`);

  for (const lot of lots) {
    const minimumKobo = BigInt(lot.minimumNaira * KOBO_PER_NAIRA);
    const incrementKobo = BigInt(lot.incrementNaira * KOBO_PER_NAIRA);
    const transaction = await auction.createAuction(startAt, endAt, minimumKobo, incrementKobo, 0);
    const receipt = await transaction.wait(1);
    console.log(`${lot.lot} seeded: ${transaction.hash} (block ${receipt?.blockNumber ?? "pending"})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
