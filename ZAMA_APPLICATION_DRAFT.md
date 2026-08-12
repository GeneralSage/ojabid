# OjaBid — Zama Developer Program Application Draft

## Project name

**OjaBid — Confidential Auto Auctions for Nigeria**

## One-line description

OjaBid is a confidential B2B auction platform where verified Nigerian auto dealers submit encrypted bids for vehicles and auto assets, while Zama FHEVM computes the winning result without exposing competing bids or live bidder identities.

## The story behind the project

This project began with someone close to me, not with a market-size spreadsheet.

My friend had just started in auto sales in Nigeria. For someone new to the business, he was doing reasonably well and was trying to build a legitimate path into the trade. He learned about an auto auction in Abuja, but for almost a year he could not participate because the capital required to register was beyond his reach.

Eventually, he raised the money from family and friends. I contributed **NGN 138,000**, roughly equivalent to USD 100 at the time. He went to the auction with one vehicle in mind: one car he believed he could buy, resell, and use to grow his business.

Then the process became personal.

Another participant saw who he was and noticed that he was a smaller, newer dealer. Instead of competing only on the value of the vehicle, the person could identify him, follow his bid, and push him out. The other bidder eventually paid more than twice what my friend was prepared to offer, far beyond what he believed a 2014 car could reasonably support.

My friend did not only lose an auction. He lost capital that had been assembled through trust, and he came away feeling that the market had decided he was too small to belong in it.

That loss could have been prevented. If the bids had been private, the other participant could still have offered more because they genuinely valued the vehicle more. But they could not have used my friend's identity, size, or visible bid to target him.

OjaBid was born from that experience: a confidential Nigerian auto-auction platform where people compete on value, not visibility.

## The problem

Auto auctions and wholesale vehicle deals in Lagos, Abuja, and other Nigerian trading hubs are often conducted through public or semi-public channels. A dealer's identity and current price can become visible to other participants before the auction has ended.

That creates an information asymmetry:

- a competitor can copy or strategically exceed a visible bid;
- a larger dealer can use a smaller dealer's identity and limited capital against them;
- new dealers may bid emotionally because they feel watched or challenged;
- price discovery becomes distorted by retaliation, intimidation, or status;
- chat-based and in-person processes leave weak evidence when a dispute occurs.

The market does not need to make all participants equally wealthy. It needs to stop turning identity and bid visibility into weapons. A dealer should lose because another dealer valued the vehicle higher—not because another dealer discovered who they were and decided to push them out.

## The solution

OjaBid lets a wholesaler, importer, or verified auction organiser create a vehicle lot and invite approved dealers into a sealed-bid auction.

1. The seller publishes the vehicle details, inspection evidence, deadline, reserve rules, and settlement terms.
2. A verified dealer joins using an auction-specific pseudonymous session identity.
3. The dealer submits a maximum bid in naira through the application. The browser encrypts it before submission.
4. The Zama-powered contract validates the encrypted input and compares it with other encrypted bids.
5. Other participants see that a bid was submitted, but not the amount, bidder identity, or live ranking.
6. After the deadline, the contract enters resolution. Only the result permitted by the auction rules is decrypted and verified.
7. Losing participants receive a refund of their demo deposit. The winner enters inspection, payment, and delivery.

The first product focuses on vehicles because that is the real pain point behind the project. The system can later expand to motorcycles, trucks, spare parts, tyres, and heavy equipment.

## Why Zama FHEVM is essential

Ordinary encryption can protect a bid while it is stored, but the auction still needs to compare bids. A conventional database would require a trusted server to decrypt every bid, making that operator a central point of failure and suspicion.

Zama FHEVM lets the contract work with encrypted values:

- encrypted bid inputs are created in the participant's client and submitted with an input proof;
- the contract compares encrypted integers without exposing plaintext bids on-chain;
- access-control rules define who can decrypt which result and when;
- the final winner and winning amount can be revealed only after the auction closes, with a verifiable decryption proof.

The Zama Public Auction demonstrates the relevance of this lifecycle: registration, approved wallets, shielded funds, sealed bids, locked bidding, encrypted resolution, refunds, and claiming. OjaBid adapts that structure to a marketplace of physical assets. Each lot has its own auction state, participants, rules, encrypted bids, resolution, and settlement outcome. The first auction mode is a private highest-bid auction for a unique asset, while later lot types can support multi-unit clearing-price allocation.

## What is private and what is public

### Private during bidding

- Bid amount and maximum price
- Live bid ranking
- Dealer-to-bid association shown to other dealers
- Seller reserve price, when the seller chooses a confidential reserve
- Internal dealer budget information

### Public by design

- Auction identifier and non-sensitive vehicle metadata
- Auction start and end time
- Rules such as minimum bid, deposit requirement, inspection window, and settlement deadline
- Encrypted transaction handles and event timestamps needed for auditability
- Final result after the defined reveal stage

### A necessary technical clarification

FHE hides encrypted values; it does not automatically make a public blockchain transaction sender anonymous. For the requirement that dealers cannot see who is bidding, OjaBid will separate verified business identity from auction-facing identity. The MVP can use an allowlisted auction session wallet. A production deployment should evaluate relayed transactions or account abstraction with a security and compliance review.

## Grant-funded product scope

### Included

- An organiser creates and manages multiple vehicle and auto-asset lots.
- Admin or organiser approves demo dealer wallets and assigns eligibility by auction.
- Dealers browse multiple active auctions and submit encrypted maximum bids to several lots.
- Each auction enforces its own start/end, reserve, minimum bid, and one active bid per dealer.
- Contracts compute the highest valid encrypted bid independently for every lot.
- Close and resolution use Zama's public-decryption proof flow.
- Losing bidders can claim refunds from a pull-based refund ledger.
- Public audit page shows the lot rules, event timeline, encrypted bid activity, and verified outcome.
- Mock confidential settlement tokens are used on testnet only, behind the same settlement interface intended for future production rails.
- Tests cover lifecycle, access control, late bids, invalid bids, refunds, and resolution replay protection.

### Not included in the first version

- Custody of real naira during the grant phase
- Live bank or payment-processor settlement during the grant phase
- Automatic vehicle-title transfer
- Anonymous permissionless participation
- Credit underwriting or financing
- Production KYC/AML claims
- A guarantee about vehicle condition or seller performance

## Technical architecture

### Smart contracts

- `ConfidentialAutoAuction.sol` — auction lifecycle, encrypted bids, comparison, resolution, and settlement state.
- `DealerRegistry.sol` — demo allowlist and role permissions.
- `MockConfidentialNGN.sol` — test-only confidential asset; never described as real naira.

### Frontend

- React/Next.js interface
- Wallet connection and transaction status
- Zama Relayer SDK for encrypting input and requesting authorized/public decryption
- Strong visual distinction between encrypted, authorized, and public values

### Backend and indexing

- Store lot metadata, images, inspection evidence, and operational identity off-chain.
- Index contract events for the audit timeline.
- Never persist plaintext bids in application logs, analytics, error traces, or the database.
- Use idempotency keys for settlement and refund operations.

## Contract state machine

```text
Draft → Active → Closed → Resolving → Settled
                    └──────────────→ Cancelled
Settled → Inspection → Completed
Settled → Disputed → Resolved
```

The contract should not silently mix auction resolution with physical delivery. On-chain settlement can record the financial outcome and an inspection status, while the operational delivery process remains governed by the organiser's terms and applicable Nigerian law.

## Security and fairness principles

- Follow checks-effects-interactions for all token and refund operations.
- Use pull-based refunds instead of pushing funds to every bidder.
- Protect resolution and public-decryption callbacks against replay.
- Apply explicit role-based access to seller, operator, resolver, and registry functions.
- Use integer minor units for bid amounts; never use floating-point money calculations.
- Define tie-breaking before launch, for example earliest valid bid commitment or a deterministic encrypted tie-break value.
- Do not emit plaintext bids in events.
- Include a pause/emergency process for the demo and a multisignature control plan before production.
- Treat vehicle inspection and title verification as separate trust problems; FHE cannot solve them.

## Success criteria

The Builder Track product milestone is successful if:

1. Multiple organisers can create and manage multiple concurrent lots.
2. At least 25 simulated dealers can browse auctions and submit bids across multiple lots without seeing competitors' amounts or auction-facing identities.
3. The contract selects the correct winner independently for every auction.
4. Winner results can be independently checked using decryption proofs.
5. Losers can claim refunds without an administrator manually sending funds.
6. Logs, events, and backend records contain no plaintext bid amounts.
7. At least one auction organiser and a group of Nigerian dealers review the product and confirm that it maps to a real auction process.

## Product validation plan

The project already has a path to conversations with auction-organiser executives. The first validation cohort should be focused, but the software should already support the marketplace model:

- two to three organisers;
- multiple vehicle and auto-asset categories;
- twenty-five to fifty verified testnet dealers;
- multiple concurrent auction lots;
- testnet funds only;
- a written rule for inspection, default, refund, and dispute handling;
- a post-auction interview focused on trust, usability, and willingness to use sealed bidding.

The validation is not intended to prove that privacy alone creates a fair market. It is intended to prove that private bids reduce information-based targeting, make the auction process more credible for smaller dealers, and create a marketplace that organisers can operate at scale.

## Risks and open questions

| Risk | Mitigation or next question |
|---|---|
| Identity remains visible through transaction senders | Use auction-specific session wallets, relayers, or account abstraction after threat modelling |
| Winner refuses to complete settlement | Use a deposit, deadline, fallback bidder, and explicit default policy |
| Seller manipulates lot details or reserve | Require inspection evidence, versioned terms, and auditable seller actions |
| Vehicle condition causes disputes | Partner with independent inspection agents and define acceptance criteria |
| Real-naira settlement creates regulatory obligations | Integrate only through a properly reviewed, licensed payment/escrow partner |
| FHE resolution is asynchronous | Model resolution as an explicit state machine and test retries/replay protection |
| A bidder's bid is valid but underfunded | Use confidential deposits or a verified funding check before accepting the bid |

## Product and scale thesis

OjaBid is a real marketplace opportunity built around a focused, real-world use case for programmable confidentiality. It brings FHE to a market where privacy is not abstract: it can determine whether a small dealer is allowed to compete without exposing their financial limit and identity to a stronger rival.

The technology is ambitious, but the first product release is concrete: multiple organisers, many active lots, verified dealers, encrypted bids, verifiable outcomes, refunds, and a fairer chance to participate. Testnet lets us prove the complete product and confidential auction engine before enabling live settlement.

The grant is not funding a one-off showcase. It is funding the first deployable version of a marketplace that can move from simulated rails to production through controlled configuration and integration changes rather than a product rewrite.

## Grant purpose and requested support

This application is for a grant-funded first release of a real product. The immediate objective is to build and test the complete multi-lot marketplace on testnet—not to handle real money before the appropriate production reviews and integrations are complete.

Support from the Zama Developer Program would be used to:

- build and test the FHEVM auction contracts;
- implement the encrypted bid and decryption UX;
- conduct contract security review and adversarial testing;
- run a multi-organiser Nigerian dealer/auction evaluation on testnet;
- document the reusable confidential-auction pattern for physical-asset marketplaces.

## References

- Zama Developer Hub: https://www.zama.org/developer-hub
- Zama Public Auction: https://docs.zama.org/auction/how-it-works
- Zama FHEVM encrypted inputs: https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs
- Zama FHEVM access control: https://docs.zama.org/protocol/solidity-guides/smart-contract/acl
- Zama FHEVM public decryption: https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle
- SealPad reference project: https://github.com/YanYuanFE/sealpad
- Graze reference project: https://github.com/nicolas-takimo/graze
