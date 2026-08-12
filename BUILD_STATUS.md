# Build status

OjaBid is an executable grant-stage product foundation, not a slide-only concept.

## Working now

- React/Vite marketplace UI with Nigerian auto lots and Lagos/Abuja context.
- Dealer-first session flow: no wallet prompt, no token language, and Naira-denominated maximum bids.
- Local sealed-bid interaction: the UI shows the dealer's bid only inside their session and labels the current flow as testnet simulation.
- Zama FHEVM `ConfidentialAutoAuction` contract with multiple lots, organiser permissions, approved dealers, encrypted bid comparison, encrypted winner selection, and explicit close/resolving/settled states.
- Five contract tests covering encrypted storage, eligibility, multiple dealers, unpublished ranking, and encrypted winner identity.

## Deliberately not claimed yet

- No real Naira is accepted or held in the grant build.
- No production KYC, inspection/title verification, payment rail, logistics workflow, or dispute process is represented as complete.
- The frontend still uses seeded data. The next integration is the Zama Relayer SDK plus a backend/indexer for organiser and dealer operations.
- Sender privacy needs a relayer or account-abstraction design and threat-model review; FHE alone does not erase public transaction metadata.

## Promotion path

The testnet build is designed to promote in place: wire the same UI to live lot APIs, connect the Relayer SDK to the deployed contract, add a reviewed settlement adapter, and enable production permissions and monitoring only after security and operational review.
