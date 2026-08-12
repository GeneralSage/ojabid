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

## Run locally

### Marketplace web app

```bash
npm install
npm run dev
```

The current UI uses a dealer sign-in and platform-managed test session, so an auto dealer never needs a wallet or crypto UX. It runs with seeded marketplace data and a Naira bid-entry flow; contract reads/writes and the relayer are the next integration slice. The visible environment is labelled as testnet and simulated settlement.

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
