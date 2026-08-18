import { getAddress, hexlify, randomBytes } from "ethers";
import { contractConfig, hasConfiguredDeployment } from "./contract-config";

type RelayRegistration = { accessToken: string; transactionHash: string };
type RelaySubmission = { transactionHash: string };

function apiUrl(path: string) {
  return `${contractConfig.apiBaseUrl}${path}`;
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(body.error ?? "The confidential auction service could not complete that request.");
  return body;
}

function ensureLiveConfiguration() {
  if (!hasConfiguredDeployment) {
    throw new Error("Encrypted bidding is not configured yet. A live Sepolia contract and relay must be set before offers can be accepted.");
  }
}

let fhevmInstancePromise: Promise<import("@zama-fhe/relayer-sdk/web").FhevmInstance> | undefined;

async function getFhevmInstance() {
  ensureLiveConfiguration();
  if (!fhevmInstancePromise) {
    fhevmInstancePromise = (async () => {
      const { createInstance, initSDK, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/web");
      await initSDK();
      return createInstance({ ...SepoliaConfig, network: contractConfig.rpcUrl });
    })();
  }
  return fhevmInstancePromise;
}

/** Creates an opaque, persistent-looking bidder identifier with no customer information in it. */
export function createPseudonymousBidderId() {
  return getAddress(hexlify(randomBytes(20)));
}

/**
 * Registers a pseudonymous buyer before the on-chain lot opens.
 * The access code is consumed only by the relay API and is never stored by the browser.
 */
export async function registerBidderForAuction(input: {
  auctionId: number;
  bidderId: string;
  accessCode: string;
}) {
  ensureLiveConfiguration();
  return postJson<RelayRegistration>("/api/auctions/register", input);
}

/** Encrypts the Naira maximum in-browser, then submits only ciphertext and proof to the relay. */
export async function submitEncryptedBid(input: {
  auctionId: number;
  bidderId: string;
  accessToken: string;
  amountKobo: bigint;
}) {
  ensureLiveConfiguration();
  const fhevm = await getFhevmInstance();
  const encrypted = await fhevm
    .createEncryptedInput(contractConfig.auctionAddress, contractConfig.relayAddress)
    .add64(input.amountKobo)
    .encrypt();

  return postJson<RelaySubmission>("/api/bids/submit", {
    auctionId: input.auctionId,
    bidderId: input.bidderId,
    encryptedBid: hexlify(encrypted.handles[0]),
    inputProof: hexlify(encrypted.inputProof),
    accessToken: input.accessToken,
  });
}
