# OjaBid Product Hardening Plan

**Status:** In progress

## The release outcome

When a Nigerian dealer arrives, they should understand in seconds: "My Naira offer and my participation are not visible to competing dealers while this lot is open." They should be able to inspect a lot, understand the public opening rule, enter a confidential maximum in Naira, and see that no public bid ladder or competitor identity is exposed.

## Audit findings

| Priority | Finding | Why it fails a real auction use case | Release action |
| --- | --- | --- | --- |
| P0 | The public site implied FHE encryption but was not connected to a deployed FHEVM contract or relayer. | A tester could mistake a local UI state for a real sealed offer. | Label this public site as a product preview; keep the tested contract proof link visible; block production claims until the relayer/backend slice exists. |
| P0 | An invalid first bid could corrupt the encrypted current-highest value, and a no-bid auction could not resolve. | These are auction correctness failures. | Correct selection logic, add a no-offer settlement path, and add adversarial tests. |
| P0 | The organiser alone could open, close, resolve and settle. | A dormant or hostile organiser could hold up a legitimate result. | Make lifecycle progression permissionless after the relevant deadlines; retain organiser-only lot administration. |
| P0 | The frontend spoke in raw numeric units, not Naira/kobo. | A dealer cannot safely reason about a bid amount. | Display Naira everywhere, enforce opening rule/increment in Naira, and model contract values as kobo. |
| P1 | "Why we built this", inspection, nav, bell, saved-lot and activity controls were non-functional. | Dead controls destroy trust in an enterprise demo. | Replace them with working anchors, working filters, inspection content, or remove them. |
| P1 | The opening screen buried the origin story and privacy promise. | The product looked like a generic marketplace, not a solution to intimidation in public auctions. | Make the privacy promise and founder story the primary landing content. |
| P1 | "Testnet workspace" was the strongest visible message. | Dealers do not need blockchain terminology and it distracts from the product promise. | Remove it from the public site. Keep grant/testnet boundaries in technical documentation only. |
| P1 | The current contract stores and emits the reserve price in plaintext. | This is acceptable only if the auction partner chooses a public reserve; it is not a confidential-reserve design. | Make reserve visibility an explicit per-auction policy. If it must be private, redesign it as an encrypted value or commitment before production. |
| P1 | Card images had empty alternative text and source text contained corrupted separators. | Accessibility and perceived quality were below enterprise standard. | Add meaningful image labels and replace corrupted copy. |

## Required acceptance criteria

### Dealer experience

- The first viewport says that dealer identity and bid amount are not visible during an open auction.
- Public cards show only lot facts, a public opening rule, and a count of confidential offers. They never show a highest bid, bid ladder, bidder name, or bidder address.
- Bid input accepts and formats whole Naira. The technical amount is represented as kobo before encryption.
- The preview never claims to have transmitted or encrypted a bid it did not submit.
- Every visible CTA either works, scrolls to meaningful content, opens a real preview interaction, or is removed.

### Auction-engine correctness

- A bid below the minimum can never become the current highest bid or winner.
- A no-offer lot settles cleanly with no winner and no public decryption request.
- A tie has a documented deterministic outcome: first valid sealed offer wins.
- No one can submit before open, after close, without approval, or more than once in this MVP.
- Anyone may progress a finished lot through close, resolution and proof-backed settlement; only the organiser can administer the lot.
- No settlement result is accepted without the FHE/KMS proof for exactly the expected encrypted handles.

## Enterprise promotion gates

This public preview is not an enterprise launch. Production remains blocked until all gates are met:

1. A deployed and verified contract, FHEVM Relayer SDK integration, indexer, and monitored resolver service.
2. Verified dealer onboarding and an embedded/passkey or account-abstraction session model. A public transaction sender must not expose an auction bidder.
3. An audited payment/escrow and double-entry settlement service for Naira; no card, transfer, or bank data belongs in the FHE contract.
4. Auction-partner controls for inspection, title, cancellation, dispute, delivery, audit retention, incident response, and support.
5. Security review of contracts, backend, analytics, logs, access controls, and relayer metadata; FHE protects bid values, not every operational metadata channel.
6. Continuous deployment from the GitHub repository, separate preview/production environments, secret rotation, monitoring, backups, and rollback drills.

## Delivery order

1. Repair the cryptographic auction state machine and tests.
2. Replace the public dashboard with an honest, Naira-first confidential-auction experience.
3. Build and verify the static release, then deploy it.
4. Build the relayer/session/backend vertical slice before allowing anyone to submit a real offer.
