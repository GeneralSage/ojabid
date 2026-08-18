export const contractConfig = {
  chainName: import.meta.env.VITE_OJABID_CHAIN_NAME ?? "Ethereum Sepolia",
  chainId: Number(import.meta.env.VITE_OJABID_CHAIN_ID ?? 11155111),
  auctionAddress: import.meta.env.VITE_OJABID_AUCTION_ADDRESS ?? "",
  relayAddress: import.meta.env.VITE_OJABID_RELAY_ADDRESS ?? "",
  rpcUrl: import.meta.env.VITE_OJABID_SEPOLIA_RPC_URL ?? "",
  apiBaseUrl: (import.meta.env.VITE_OJABID_API_BASE_URL ?? "").replace(/\/$/, ""),
  currency: "NGN",
  currencySymbol: String.fromCodePoint(0x20a6),
} as const;

const evmAddress = /^0x[a-fA-F0-9]{40}$/;

export const hasConfiguredDeployment = evmAddress.test(contractConfig.auctionAddress)
  && evmAddress.test(contractConfig.relayAddress)
  && contractConfig.rpcUrl.length > 0;
