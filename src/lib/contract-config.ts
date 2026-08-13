export const contractConfig = {
  chainName: import.meta.env.VITE_OJABID_CHAIN_NAME ?? "FHEVM host chain",
  chainId: Number(import.meta.env.VITE_OJABID_CHAIN_ID ?? 11155111),
  auctionAddress: import.meta.env.VITE_OJABID_AUCTION_ADDRESS ?? "",
  currency: "NGN",
  currencySymbol: "₦",
} as const;

export const hasConfiguredDeployment = contractConfig.auctionAddress.length > 0;
