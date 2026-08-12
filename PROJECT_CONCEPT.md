# OjaBid — Confidential Auto Auctions for Nigeria

**Working name:** OjaBid
**One-line pitch:** A confidential B2B auction platform where Nigerian auto dealers submit encrypted naira bids and the contract selects the best valid bid without exposing competitors' prices before the auction closes.

## The problem

Vehicle and auto-asset deals in Lagos, Abuja, and other Nigerian trading hubs are often negotiated through public or semi-public bidding channels. When a dealer can see the current offer, the process creates:

- price copying and bid escalation;
- information advantages for larger dealers and well-capitalised insiders;
- pressure to bid emotionally instead of according to a real resale margin;
- disputes about who bid what and whether the final price was manipulated;
- weak auditability when bidding happens in chats, calls, or spreadsheets.

The honest product claim is not that privacy makes every dealer equally wealthy. It is that privacy removes the information advantage created by seeing competing bids and gives each verified dealer a fairer chance to submit their true maximum.

## Why I am building it

This project began with someone close to me, not with a market-size spreadsheet.

My friend had just started in auto sales. For someone new to the business, he was doing reasonably well and was trying to build a legitimate path into the trade. He learned about an auto auction in Abuja, Nigeria, but for almost a year he could not participate because the capital required to register was beyond his reach.

Eventually, he raised the money from family and friends. I contributed **NGN 138,000**, roughly equivalent to USD 100 at the time. He went to the auction with one vehicle in mind: one car that he believed he could buy, resell, and use to grow the business.

Then the process became personal.

Another participant saw who he was and noticed that he was a smaller, newer dealer. Instead of competing only on the value of the vehicle, the person could identify him, follow his bid, and push him out. The other bidder eventually paid more than twice the amount my friend was prepared to offer, far beyond what he believed a 2014 car could reasonably support. My friend did not simply lose an auction. He lost capital that had been assembled through trust, and he came away feeling that the market had decided he was too small to belong in it.

That experience stayed with me because the harm was avoidable. If the bids had been private, the other participant could still have offered more because they genuinely valued the vehicle more. But they could not have used my friend's identity, size, or visible bid as a weapon.

This is why OjaBid treats privacy as market infrastructure, not as a luxury feature. A dealer should lose because the economics were better for another buyer—not because another participant discovered who they were and chose to punish them for being small.

The goal is bigger than protecting one friend. There are likely many dealers who have faced some version of this: public bidding, intimidation, price copying, retaliation, or exclusion from a market because their identity became visible at the wrong moment. OjaBid starts with Nigerian auto auctions because that is the pain I know directly, and because the first people who need to trust it are the auction organisers and dealers I can reach.

## What I learned from Zama's auction and previous projects

The public Zama auction provides a useful lifecycle to learn from: participant registration and wallet approval, shielded funds, sealed bids, a locked bidding period, encrypted resolution, refunds, and final claiming. Its token sale uses a sealed-bid Dutch format where allocation and clearing-price calculations are performed with FHE. OjaBid will borrow that lifecycle while changing the auction rule for the asset being sold.

| Reference | Pattern worth borrowing | OjaBid adaptation |
|---|---|---|
| Zama Public Auction | Approved participants, shielded balance, sealed bids, locked close, encrypted resolution, refunds | Verified Nigerian dealers, confidential bid deposit, fixed close, winner/loser settlement, inspection and delivery workflow |
| SealPad, a previous Zama program project | Separate deposit pool, encrypted bid updates, finalization state, KMS-attested settlement, strong contract tests | Keep deposits separate from bid revisions; add vehicle lots, reserve price, inspection status, seller/dispute rules |
| Graze, an adjacent prior project listed by Zama | Asset-auction presentation and lot-oriented marketplace experience | Replace agricultural assets with cars and auto equipment; make confidentiality the central advantage |
| Confidential Buybacks | Batch or epoch-based encrypted offers and fills to reduce front-running | Use auction epochs so no participant can watch an evolving public price or target a known dealer |

The important lesson is that the winning projects are not just smart contracts. They present a complete flow: eligibility, funding, encrypted participation, resolution, refunds, and a readable demo. OjaBid needs to do the same for a Nigerian vehicle auction.

## The proposed solution

OjaBid lets a wholesaler, importer, or verified supplier list an auto lot and invite approved dealers to participate in a sealed-bid auction.

1. The seller publishes the lot details, inspection evidence, auction deadline, minimum increment, and settlement terms.
2. Each dealer submits a bid in naira through the web app. The bid amount is encrypted before it reaches the blockchain.
3. The smart contract compares encrypted bids and records the best valid bid without revealing the amounts to other participants.
4. When the auction closes, the contract reveals only the result required for settlement: the winning bid, the winning participant, and the auction proof.
5. The seller and winner complete delivery, inspection, and naira settlement through an approved payment/escrow workflow.

The same workflow can support cars, trucks, buses, motorcycles, spare parts, tyres, heavy equipment, and other auto assets. The grant release should include multiple concurrent lots and organisers from the beginning, while launching the first auction mode with a simple private highest-bid rule that is easy to test and explain.

## Recommended auction structure

### One vehicle or unique asset: private highest-bid auction

This should be the first OjaBid mode. Every eligible dealer submits one encrypted maximum bid. When bidding closes, the contract determines the highest valid bid and checks it against the seller's reserve. The winning dealer pays their accepted bid, subject to the inspection and settlement rules.

This is simpler and more natural for a single used vehicle than copying the token auction's multi-unit Dutch allocation model.

### Multiple identical assets: private clearing-price auction

For tyres, spare parts, motorcycles, or a batch of similar vehicles, OjaBid can later support the Zama-style structure: bidders submit encrypted quantities and public or encrypted prices, the contract determines a clearing price, and any oversubscribed quantity is allocated pro rata.

### Who can see what

- **Other dealers:** no bid amount, no business identity, and no live ranking.
- **Seller:** lot details and auction status; winner identity and winning bid only when the settlement policy permits it.
- **Auction operator:** verified dealer identity for compliance and dispute handling, but not other dealers' bid amounts.
- **Public chain:** lot rules, timestamps, encrypted handles, and proof-bearing settlement events.

FHE hides the values being computed. It does not automatically hide a public blockchain transaction sender. To satisfy the “you cannot see who is bidding” requirement, the production design should use an auction-specific pseudonymous session wallet or relayed/account-abstraction submission. The platform can retain verified identity for compliance while other dealers see only an anonymous eligible participant.

## Why Zama is essential

This is a direct use case for Zama FHEVM rather than a generic marketplace with a privacy label:

- **Encrypted bid inputs:** the browser encrypts the bid and submits it with an input proof.
- **Encrypted computation:** the contract compares bids while the amounts remain encrypted.
- **Programmable access:** the contract controls which values can be decrypted by a bidder, seller, settlement agent, or the public.
- **Verifiable reveal:** the winning result can be made publicly decryptable at the correct stage and verified on-chain with a decryption proof.

Zama's developer hub specifically positions FHEVM for confidential smart contracts, encrypted `euint` values, and programmable rules for who may decrypt data. Zama also provides a sealed-bid auction example, so OjaBid's differentiation should be the Nigerian auto-market workflow, not merely recreating a generic auction.

## Privacy design

### Private during bidding

- Bid amount
- Bidder's maximum price
- Seller's reserve price, if the seller chooses a confidential reserve
- Eligibility or budget-related values used in the auction rules
- Internal dealer notes and financing limits, kept off-chain

### Public by design

- Lot identifier and non-sensitive vehicle metadata
- Auction start and end time
- Public rules: bid increment, deposit policy, inspection window, and dispute process
- Encrypted transaction handles and contract events needed to audit that bids were submitted
- Final result after close, according to the settlement policy

### Not hidden by FHE alone

The blockchain sender address may still be visible. In the first version, OjaBid should describe wallet identity as pseudonymous on-chain and keep verified business identity in a permissioned application layer. A later version can explore relayers or account abstraction if hiding the bidder-to-wallet link becomes necessary.

## MVP for the developer program

The first build should be a complete, testable vertical slice rather than a full Nigerian marketplace.

### MVP features

- Seller creates one auction lot with images, vehicle details, deadline, and rules.
- Admin/verification mock approves dealer wallets for the demo.
- Dealers connect a wallet and submit or update one encrypted bid.
- Contract enforces auction timing, minimum increment, and one active bid per dealer.
- Encrypted bid comparison selects the current best bid without publishing its amount.
- Auction close triggers a controlled reveal of the winner and winning amount.
- Demo settlement uses a mock confidential token denominated in NGN units; it must be clearly labelled as test money.
- Public audit panel shows lot rules, timestamps, encrypted bid events, final result, and verification status.
- Automated tests cover unauthorized bids, late bids, invalid bid increments, duplicate submissions, reserve-price failure, and winner settlement.

### Explicitly out of scope for the grant testnet release

- Custody of real naira
- Direct bank integration
- Automated vehicle title transfer
- Open anonymous participation
- Credit underwriting
- Production claims about KYC, escrow, or legal enforceability

Real-naira settlement should be a later production configuration with a properly licensed payment/escrow partner. The testnet release should use the same settlement interface and operational states, so enabling live rails is a controlled promotion rather than a new product build.

## Suggested architecture

### On-chain

- `ConfidentialAutoAuction.sol`: lot state, auction lifecycle, encrypted bids, bid comparison, winner reveal, and settlement hooks.
- `DealerRegistry.sol`: demo allowlist and role permissions; production identity should be handled through a compliant off-chain/KYC system.
- `MockConfidentialNGN.sol`: test-only confidential token or a wrapped/mock ERC-7984 asset.

### Frontend

- Next.js/React interface
- Wallet connection and transaction status
- Zama Relayer SDK for client-side encryption and user/public decryption flows
- Clear privacy indicators such as “encrypted bid” and “revealed after close”

### Backend/indexing

- PostgreSQL for lot metadata, images, dealer profiles, inspection documents, and operational state
- Event indexer for auction events and audit views
- No plaintext bid storage
- Append-only operational audit log with idempotency keys for every settlement action

### Money rules

- Represent bid values as integer minor units, never floating-point numbers.
- Define the unit explicitly for the demo, for example `1` token unit = `₦1` in the displayed simulation.
- Keep payment state separate from auction state.
- Use a double-entry ledger once real settlement is introduced.

## Example contract flow

```text
Dealer browser
  │ encrypt bid + input proof
  ▼
Auction contract
  │ validate proof, compare encrypted values, update encrypted winner
  ▼
Auction closes
  │ request controlled public decryption of result
  ▼
Relayer/KMS + decryption proof
  │ verify proof on-chain
  ▼
Winner announced → inspection → settlement → delivery
```

## Success metrics for the pilot

- At least 10 verified dealers can complete a full auction without seeing another dealer's bid.
- 100% of accepted bids have a verifiable on-chain submission event.
- No plaintext bid amount is persisted in the frontend logs, backend database, or contract storage.
- Auction close produces a result that can be independently verified from the contract events and decryption proof.
- Pilot dealers report that sealed bidding makes them more willing to bid according to their actual resale economics.

## Main risks

**Privacy is mistaken for fairness.**  Explain that OjaBid addresses information asymmetry, while capital differences remain. Add transparent eligibility rules, equal access windows, and optional per-lot participation limits.

**The winner cannot or will not settle.**  Add a refundable participation deposit, a settlement deadline, a fallback to the next eligible bidder, and a dispute/inspection policy. These rules belong in the product design before production funds are handled.

**Users do not want wallets or crypto UX.** Keep chain operations behind a familiar dealer session and use a relayer or account-abstraction service for sponsored transactions. The product is denominated in Naira; production still needs a reviewed fiat/escrow rail and compliance model.

**Vehicle quality creates more disputes than bidding.**  Treat inspection reports, VIN/chassis evidence, condition grades, and seller reputation as first-class marketplace data. Privacy cannot compensate for poor asset verification.

## Best initial program positioning

Apply under the **Builder Track** as a real-world confidential auction for Nigeria's auto-trade market. The strongest demo story is:

> “A dealer should lose because another dealer valued the vehicle higher—not because the first dealer exposed their maximum bid in a public chat.”

The project should be presented as a privacy-preserving market mechanism for a real local workflow, with Zama FHEVM responsible for the part that ordinary databases and public blockchains cannot provide: computing the auction outcome over encrypted bids.

## What I need from your personal story

To make this application yours rather than a generic startup pitch, add the specific incident that made the problem real:

- What happened in the auction or dealer conversation?
- Who benefited from the public visibility of the bids?
- What did you or someone you know lose: money, access, trust, or time?
- What would a fair outcome have looked like?
- Do you already know dealers, wholesalers, importers, inspection agents, or payment partners who could pilot it?

That story should become the opening of the application and the first user journey in the demo.

## Initial references

- Zama Developer Hub: https://www.zama.org/developer-hub
- Zama encrypted inputs: https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs
- Zama access control: https://docs.zama.org/protocol/solidity-guides/smart-contract/acl
- Zama public decryption: https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle
- Zama confidential contracts and ERC-7984 examples: https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/openzeppelin
- Zama Public Auction lifecycle: https://docs.zama.org/auction/how-it-works
- SealPad reference implementation: https://github.com/YanYuanFE/sealpad
- Zama previous winning-project directory: https://www.zama.org/developer-hub
