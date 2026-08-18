# OjaBid

Confidential auto auctions for Nigeria, powered by Zama FHEVM.

OjaBid is a proposed B2B marketplace for verified Nigerian auto dealers. It keeps bids confidential during an auction so dealers compete on the value of an asset rather than exposing their identity and maximum price to competitors.

## Project status

This repository is the foundation for a real Nigerian auto-auction product. The Zama grant phase uses testnet assets and simulated settlement, but the product is being built as a multi-lot, multi-organiser marketplace from the beginning. Testnet is the first environment—not a throwaway demo. The production transition should use the same product, contracts, schemas, APIs, and user workflows, with reviewed production contracts, live asset/payment configuration, and controlled operational permissions enabled.

## The first product release on testnet

1. An approved auction organiser creates multiple vehicle and auto-asset lots.
2. Approved dealers browse and join eligible auctions.
3. Each dealer submits encrypted maximum bids across several active lots.
4. Contracts compare bids while they remain encrypted and isolate each auction's state.
5. After each deadline, the winning result is revealed with a verifiable decryption proof.
6. Losing deposits are refundable; winners proceed through the simulated inspection and settlement workflow.
7. Organisers manage lots, participants, resolution, refunds, and audit history from one marketplace dashboard.

## Documents

- [Project concept](PROJECT_CONCEPT.md) — product thesis, story, privacy model, and risks.
- [Zama application draft](ZAMA_APPLICATION_DRAFT.md) — submission-ready narrative and technical summary.
- [Implementation plan](IMPLEMENTATION_PLAN.md) — contract state machine, backlog, and security gates.
- [Fundraising brief](FUNDRAISING_BRIEF.md) — scalable product thesis, grant milestones, and production-promotion strategy.
- [Architecture](ARCHITECTURE.md) — marketplace domains, FHE boundary, privacy model, and promotion path.
- [Product hardening plan](PRODUCT_HARDENING_PLAN.md) — audited defects, repaired auction rules, and enterprise promotion gates.

## Run locally

### Marketplace web app

```bash
npm install
npm run dev
```

The UI refuses to mark an offer as submitted until a real Sepolia deployment is configured. With the public `VITE_OJABID_*` settings and the Vercel server-only settings below, it reads public auction rules and encrypted-offer counts from Sepolia, encrypts a Naira maximum in the browser with Zama's Relayer SDK, and sends only ciphertext plus a Zama input proof to the platform relay. The relay pays testnet gas; dealers do not need wallets.

### Deploy the Sepolia review environment

The contract uses a platform relay account for testnet gas. Keep its mnemonic and private key in a secure secret manager: neither belongs in a `VITE_` variable or in git.

```bash
cd contracts
npx hardhat vars set MNEMONIC
npx hardhat vars set SEPOLIA_RPC_URL
npx hardhat vars set OJABID_RELAY_ADDRESS
npm run deploy:sepolia
npx hardhat vars set OJABID_AUCTION_ADDRESS
npm run seed:sepolia
```

`seed:sepolia` creates the twelve public vehicle lots used by the interface. They share a 30-minute registration period and a seven-day bidding window. It refuses to run against a contract that already contains auction lots.

Set these as Vercel environment variables before publishing the configured interface:

- Public build values: `VITE_OJABID_AUCTION_ADDRESS`, `VITE_OJABID_RELAY_ADDRESS`, `VITE_OJABID_SEPOLIA_RPC_URL`, and optionally `VITE_OJABID_API_BASE_URL`.
- Server-only relay values: `OJABID_AUCTION_ADDRESS`, `OJABID_RELAY_ADDRESS`, `OJABID_SEPOLIA_RPC_URL`, `OJABID_PLATFORM_PRIVATE_KEY`, `OJABID_TEST_ACCESS_CODE`, `OJABID_SESSION_SECRET`, and `OJABID_ALLOWED_ORIGINS`.

The test access code is only a grant-review control. A production release needs real identity verification, revocable sessions, rate limits, a protected relay key, and a compliant Naira settlement/escrow flow.

### FHEVM contracts

```bash
cd contracts
npm install
npm run compile
npm test
```

The local suite uses Zama's Hardhat FHEVM mock for fast testing. Sepolia validation will use real encrypted values after the proof-backed resolution flow is complete.

## Zama references

- [Zama Developer Hub](https://www.zama.org/developer-hub)
- [Zama Public Auction lifecycle](https://docs.zama.org/auction/how-it-works)
- [FHEVM encrypted inputs](https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs)
- [FHEVM access control](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl)
- [FHEVM public decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle)
- [SealPad reference project](https://github.com/YanYuanFE/sealpad)

## Important boundary

FHE protects encrypted bid values and enables computation over them. It does not, by itself, hide a public blockchain transaction sender, verify a vehicle's condition, provide KYC, or make a testnet token equivalent to Nigerian naira. Those are separate product and operational responsibilities.
