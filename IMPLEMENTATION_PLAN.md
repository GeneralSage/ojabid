# OjaBid Implementation Plan

## Phase 0 — Validate the market rule

Before deploying the first marketplace cohort, confirm each organiser's exact process:

- Is each lot a unique vehicle, a batch of identical items, or another auto asset?
- Is the winner the highest bid, or does the organiser use a reserve/negotiation step?
- Is the winner required to pay immediately, place a deposit, or complete inspection first?
- Can bidders update bids, and when are bids locked?
- What happens if the winner defaults or the vehicle fails inspection?
- Which participant information must the organiser retain for compliance?

The contract must encode the organiser's real rules rather than force a token-auction model onto a car sale.

## Phase 1 — Local FHEVM vertical slice

### Contract scope

Implement a reusable `ConfidentialAutoAuction` contract or factory-managed auction instance with:

- `createAuction` for each lot, with organiser ownership and configurable rules;
- organiser and lot indexing for multiple concurrent auctions;
- `approveBidder` or registry-gated participation;
- `openAuction` and `closeAuction` lifecycle controls;
- encrypted bid submission with input proof;
- encrypted highest-bid comparison;
- deterministic tie-breaking;
- `beginResolution` and public-decryption handle registration;
- proof-verified `settle`;
- pull-based refund claims;
- emergency pause for the demo;
- events that expose lifecycle metadata but never bid plaintext.

### Proposed lifecycle

```text
Draft
  └─ createAuction
Active
  ├─ submitBid / replaceBid
  └─ closeAuction after end time
Closed
  └─ beginResolution
Resolving
  └─ settle(clearValues, proof)
Settled
  ├─ claimRefund
  ├─ acceptInspection
  └─ markCompleted / openDispute
```

### Encrypted values

- `euint64 bidAmount` for the first auction mode.
- `ebool isEligible` or a public registry check for permission decisions.
- An encrypted winner index or winner-selection flag if needed by the chosen comparison design.
- Public lot metadata and timing values remain ordinary Solidity values.

Do not encrypt data that users need to browse before bidding, such as vehicle make, model, year, inspection summary, or location. Confidentiality should be targeted and explainable.

## Phase 2 — Marketplace frontend and relayer flow

Build the smallest usable marketplace journey:

1. Connect wallet.
2. Browse multiple organisers, lots, and auction rules.
3. Show “your bid is encrypted before submission.”
4. Encrypt and submit the bid using the Zama Relayer SDK.
5. Show only the user's own authorized bid state where permitted.
6. Show auction closed/resolving status without revealing live ranking.
7. Show verified winner result after settlement.
8. Show refund claim state.

Do not label an undisclosed value as zero. Distinguish “not authorized,” “not yet decrypted,” and “zero.”

## Phase 3 — Identity privacy

The MVP can use an allowlisted wallet for speed, but the product requirement is stronger: dealers should not be able to identify one another from the auction interface.

Threat-model these options before choosing one:

1. **Auction-specific wallet:** verified dealer receives a fresh wallet per auction. Simple, but the funding path can still link identities.
2. **Relayed submission:** a relayer submits the transaction. Better interface privacy, but introduces relayer availability and trust considerations.
3. **Account abstraction/sponsored transaction:** hides ordinary wallet UX and can separate user identity from auction transaction, but adds infrastructure complexity.

The application should claim “no bidder identity exposed to competing dealers” only after the chosen transaction path has been tested against chain explorers, RPC logs, frontend analytics, and backend logs.

## Phase 4 — Testnet product release

- Deploy to a Zama-supported test environment using the current official template and configuration.
- Use simulated testnet assets only; no real naira or production funds.
- Seed multiple realistic lots across more than one vehicle/auto-asset category with fictional or consented data.
- Run multiple organisers and at least 25 simulated bidders across concurrent auctions.
- Record a product demo showing organiser onboarding, lot creation, multi-lot browsing, encrypted bids, resolution, refunds, and audit history.
- Publish contract address, source, test results, and known limitations.

## Phase 5 — Production promotion, not a rebuild

The testnet release should be designed as the production product with simulated rails. Moving live should be a controlled promotion of the same system:

1. Replace the testnet chain configuration with the selected production network configuration.
2. Deploy the reviewed, version-pinned auction contracts and registry to production addresses.
3. Replace the mock confidential settlement asset with an approved production asset/payment adapter.
4. Replace demo dealer approval with the production identity and organiser-permission service.
5. Enable production relayer, monitoring, rate limits, support, and incident controls.
6. Migrate only the public organiser/lot metadata that should exist in production; testnet balances and bids never carry value into production.
7. Run a staged launch: internal auction, invited organiser cohort, then broader availability.

The application, APIs, database schema, event indexer, auction lifecycle, encrypted bid UX, resolution flow, refund model, and organiser dashboard should remain the same. The production gate changes the environment and trusted integrations; it should not require rebuilding the business from scratch.

## Backlog

| ID | Work item | Priority | Acceptance criteria |
|---|---|---:|---|
| C-01 | Auction state machine | P0 | Invalid phase transitions revert; timestamps are enforced |
| C-02 | Encrypted bid input | P0 | Valid encrypted input and proof accepted; malformed proof rejected |
| C-03 | Encrypted comparison | P0 | Correct winner selected across at least five bids |
| C-04 | Tie-breaking | P0 | Equal bids resolve deterministically and are documented |
| C-05 | Resolution proof | P0 | Replay or mismatched decryption proof cannot settle |
| C-06 | Pull refunds | P0 | Each losing bidder can claim once; repeated claim fails |
| C-07 | Access control | P0 | Only organiser/registry/resolver roles can perform privileged actions |
| C-08 | No plaintext leakage | P0 | Events, storage, logs, and UI never expose bid values |
| C-09 | Bid replacement | P1 | Replacing a bid does not duplicate deposits or leave an ambiguous active bid |
| C-10 | Default/fallback winner | P1 | Organiser can follow documented default process without arbitrary fund movement |
| C-11 | Inspection status | P1 | Settlement and physical inspection remain separate states |
| C-12 | Pseudonymous bidding | P1 | Competing dealers cannot identify bidder identity through app or event view |
| C-13 | Seller lot metadata | P1 | Vehicle information is versioned and changes are auditable |
| C-14 | Demo analytics | P2 | Measures completion, failed transactions, and privacy comprehension without bid values |

## Prototype security gates

- Unit and integration tests for every state transition.
- Fuzz tests for bid bounds, timestamps, and repeated settlement.
- Static analysis with Slither or an equivalent tool.
- Manual review of FHE ACL permissions and decryption handles.
- Review of all external token calls for reentrancy and return-value handling.
- Replay-protection test for decryption callbacks.
- Document the additional independent contract and compliance review that would be required before any future production deployment.

## Data and money rules

- Store money as integer minor units, not floating-point values.
- Keep auction state, payment state, and delivery state separate.
- Use append-only financial events and a double-entry ledger when real settlement is introduced.
- Never store real dealer bid amounts in plaintext on the application backend.
- Treat images, VIN documents, identity records, and inspection reports as sensitive off-chain data with explicit retention rules.

## Decision ledger

| ID | Decision | Reason | Revisit when |
|---|---|---|---|
| D1 | Start with private highest bid per unique-asset lot, while supporting many concurrent lots | Matches the real story and keeps the first auction rule understandable without limiting the product to one vehicle | Organisers confirm batch or multi-unit auctions are the first live category |
| D2 | Use a test-only confidential settlement asset behind a replaceable settlement adapter | Demonstrates confidential accounting while allowing a controlled move to reviewed production rails | Production payment/escrow partner and compliance path are confirmed |
| D3 | Keep public lot metadata and encrypted financial inputs | Users need discoverability; only sensitive competitive data requires FHE | Inspection or seller privacy requirements expand |
| D4 | Use a verified registry for MVP bidders | Prevents spam and reflects organiser-controlled participation | Permissionless dealer onboarding becomes a validated requirement |
| D5 | Treat identity privacy as a separate transaction-layer problem | FHE protects values, not necessarily sender metadata | Threat model validates relayer/account-abstraction design |

## Definition of done for the first product release

- A clean repository can be installed from documented commands.
- Contracts compile with the current selected FHEVM toolchain.
- Tests cover the encrypted-bid lifecycle and security gates.
- Frontend demonstrates multiple organisers, concurrent lots, and multiple bidders without exposing bid values.
- Resolution reveals only the defined final result.
- Refunds work through pull claims.
- README clearly says that testnet funds are not real naira.
- Application narrative and technical claims match the implementation.
- Testnet and production environments share the same interfaces and workflows; differences are isolated to chain, asset, relayer, identity, and settlement configuration.
