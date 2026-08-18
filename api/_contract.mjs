import { Contract, JsonRpcProvider, Wallet, getAddress, isAddress } from "ethers";

export const auctionAbi = [
  "function approveBidder(uint256 auctionId, address bidder)",
  "function openAuction(uint256 auctionId)",
  "function getAuction(uint256 auctionId) view returns (address organiser, uint64 startAt, uint64 endAt, uint64 minimumBid, uint64 bidIncrement, uint64 reservePrice, uint32 bidderCount, uint8 status)",
  "function submitBidFor(uint256 auctionId, address bidderId, bytes32 encryptedBid, bytes inputProof)",
];

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} configuration.`);
  return value;
}

export async function platformAuctionContract() {
  const rpcUrl = requiredEnvironment("OJABID_SEPOLIA_RPC_URL");
  const auctionAddress = requiredEnvironment("OJABID_AUCTION_ADDRESS");
  const privateKey = requiredEnvironment("OJABID_PLATFORM_PRIVATE_KEY");
  const configuredRelayAddress = requiredEnvironment("OJABID_RELAY_ADDRESS");
  if (!isAddress(auctionAddress)) throw new Error("Missing OJABID_AUCTION_ADDRESS configuration.");
  if (!isAddress(configuredRelayAddress)) throw new Error("Missing OJABID_RELAY_ADDRESS configuration.");
  const provider = new JsonRpcProvider(rpcUrl, 11155111, { staticNetwork: true });
  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) throw new Error("OjaBid relay must use Ethereum Sepolia.");
  const signer = new Wallet(privateKey, provider);
  if (getAddress(configuredRelayAddress) !== signer.address) {
    throw new Error("OjaBid relay signer does not match the deployed contract configuration.");
  }
  return { contract: new Contract(getAddress(auctionAddress), auctionAbi, signer), relayAddress: signer.address };
}
