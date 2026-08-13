# OjaBid Architecture

## Product boundary

OjaBid is a multi-organiser B2B auto-asset marketplace. Bid and reserve amounts use integer kobo in the auction engine (1 NGN = 100 kobo), while dealers always see and enter whole Naira. The application has four separable domains:

1. **Marketplace** — organisers, lots, images, inspection evidence, eligibility, and search.
2. **Confidential auction engine** — encrypted bids, encrypted comparison, resolution, and public result proof.
3. **Settlement adapter** — testnet/mock asset now; a reviewed production payment or escrow integration later.
4. **Operations** — organiser permissions, disputes, inspection, logistics, notifications, and support.

The grant build connects these domains on testnet. It does not collapse the operational marketplace into the smart contract, and it does not pretend that a test asset is Nigerian naira.

## Runtime topology

```text
Dealer / organiser browser
        │
        ├── public marketplace API ── lot metadata, inspection docs, activity
        ├── platform session + Zama relayer ── encrypt inputs, submit FHE transactions, decrypt results
        │                                      │
        │                                      ▼
        │                            ConfidentialAutoAuction
        │                              │ encrypted bid state
        │                              │ encrypted winner state
        │                              ▼
        │                         Zama FHEVM host / coprocessor / KMS
        └── event indexer ── safe lifecycle events and public result status
```

## Contract boundary

`contracts/contracts/ConfidentialAutoAuction.sol` currently supports many lots, organiser ownership per lot, approved bidders, auction windows, encrypted maximum-bid comparison, encrypted winner-address selection, close → resolving → settled lifecycle, public result handle preparation, and the KMS proof verification boundary through `FHE.checkSignatures`.

The settlement asset is intentionally not coupled to the auction engine. The testnet release can use a mock confidential asset and a future production release can use a reviewed adapter without changing auction state or the user workflow.

## Privacy model

FHE protects bid values and the winner state inside the contract. It does not hide the sender of a normal public blockchain transaction. The grant MVP therefore separates verified business identity, held by the organiser/platform operational layer, from auction-facing identity. The dealer sees only a normal platform session; an operational relayer or account-abstraction service submits the chain transaction on the dealer's behalf. Nigerian dealers use Naira and dealership workflows, not wallet management.

Before claiming full bidder anonymity, test chain explorers, RPC provider logs, frontend analytics, error logs, funding paths, and relayer metadata. The current contract tests prove value/selection confidentiality, not complete network-layer anonymity.

## Test modes

Zama documents Hardhat in-memory mock for fast unit tests, a persistent local node for frontend flow testing, and Sepolia with real encrypted values for full-stack validation. This workspace is based on Zama's official Hardhat template and uses the first two modes locally.

## Production promotion

The web app and backend should treat chain, contract addresses, settlement asset, relayer, and identity provider as environment configuration. Promotion to live requires reviewed production contracts, production chain/relayer configuration, a reviewed settlement adapter, production permissions, monitoring, incident controls, and staged rollout. Testnet balances, bids, and settlement state never carry monetary value into production.

## Data rules

- Never write plaintext bids to the backend, analytics, browser storage, events, or error messages.
- Use integer minor units for all money values.
- Keep inspection documents and identity data off-chain with explicit access and retention policy.
- Use append-only financial events and idempotency keys when settlement is introduced.
- Keep auction, settlement, inspection, and delivery state separate.
