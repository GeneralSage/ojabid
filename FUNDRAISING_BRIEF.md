# OjaBid Fundraising Brief

## Investment thesis

OjaBid is building the privacy layer for Nigeria's growing auto-trade auction market. Today, dealers can be exposed to competitors at the exact moment their financial limit and identity matter most. OjaBid lets organisers run a professional multi-lot marketplace where bids are encrypted, outcomes are verifiable, and smaller dealers can compete without exposing themselves to targeted bidding.

The Zama Developer Program grant funds the first deployable version on testnet. This is not a one-off hackathon demo. It is the live product architecture running with simulated assets so the team can validate the market, onboard organisers, and harden the confidential auction engine before switching to reviewed production rails.

## Why now

- Nigerian auto dealers already participate in organised and semi-organised wholesale auctions.
- Public or semi-public bidding creates price copying, intimidation, retaliation, and information advantages.
- Zama's own production token auction demonstrates that FHE can support registration, sealed bids, encrypted resolution, refunds, and claims.
- OjaBid applies that mechanism to physical auto assets and a local market where the founder has direct access to the pain and potential pilot relationships.

## Product

OjaBid is a multi-organiser marketplace:

- organisers create and manage many concurrent auction lots;
- dealers are approved once and can participate across eligible lots;
- each bid is encrypted client-side;
- no competing dealer sees live bid amounts or auction-facing identities;
- each lot resolves independently according to its rules;
- losing deposits/refunds are claimable;
- organisers receive an audit trail without receiving competitors' private bid strategy before close;
- vehicle inspection, settlement, and delivery are connected operational workflows, not hidden inside the FHE calculation.

## Testnet-to-live strategy

Testnet is an environment strategy, not a product limitation. The grant build will include:

- production-shaped contracts and interfaces;
- multi-lot data model and organiser tenancy;
- real event indexing and audit history;
- replaceable settlement adapter;
- role and permission model;
- encrypted bid and resolution UX;
- monitoring, testing, and deployment configuration;
- clear separation between public lot metadata and confidential financial data.

When the product is ready for live use, the team will deploy reviewed production contract instances, enable an approved live settlement partner, configure production identity/relayer services, and stage access. The user and organiser experience should not be rebuilt.

## Customer wedge

The initial customers are:

1. Auction organisers and wholesalers who want more credible price discovery and fewer disputes.
2. Small and mid-sized Nigerian auto dealers who need access to inventory without exposing their maximum bid to stronger competitors.
3. Inspection, logistics, and settlement partners who can attach trusted services to each lot.

The first geographic wedge is Nigeria, beginning with Lagos and Abuja networks. The asset scope begins with vehicles and expands to motorcycles, trucks, tyres, spare parts, and heavy equipment after the auction workflow is validated.

## Business model hypothesis

The initial model is organiser-led:

- a listing or auction success fee paid by the organiser;
- optional dealer membership or premium access for high-volume buyers;
- paid inspection, logistics, and settlement integrations;
- enterprise/private-auction tooling for wholesalers and fleet operators.

The grant phase should validate willingness to pay and transaction economics rather than prematurely lock pricing.

## Grant milestones

### Milestone 1 — Foundation

- Multi-organiser product model
- Lot creation and management
- Dealer registry and auction eligibility
- Local FHEVM contract test harness

### Milestone 2 — Confidential auctions

- Encrypted bids across many concurrent lots
- Bid replacement and locked close
- Encrypted winner computation
- Decryption proof and replay-safe resolution
- Pull-based refunds

### Milestone 3 — Marketplace experience

- Dealer browsing and activity dashboard
- Organiser dashboard
- Event indexing and public audit view
- Pseudonymous auction participation threat model
- Inspection and settlement workflow states

### Milestone 4 — Testnet cohort

- Multiple organisers
- 25–50 simulated/testnet dealers
- Multiple asset categories
- Concurrent auction operations
- Feedback and usability evidence from Nigerian market participants

### Milestone 5 — Production readiness plan

- Contract security review plan
- Production deployment checklist
- Settlement and identity integration plan
- Monitoring and incident-response runbook
- Go/no-go criteria for live promotion

## What success looks like

By the end of the grant, OjaBid should show that:

- organisers can operate many auction lots from one platform;
- dealers can participate across multiple auctions without seeing competitors' bids;
- the encrypted contract logic resolves winners correctly;
- refunds and resolution are verifiable and repeat-safe;
- no plaintext bid is leaked through the app, indexer, logs, or events;
- Nigerian organisers and dealers recognise the workflow as a real solution to a real market problem;
- the product can be promoted to production through controlled environment and integration changes.

## The emotional core

OjaBid began because a smaller dealer's chance to grow was damaged when public bidding allowed another participant to turn visibility into power. The business opportunity is not only to make auctions private. It is to make participation safer and more credible for the people who cannot afford to lose access to the market.

The product promise is simple:

> A dealer should lose because another dealer valued the asset more—not because the market exposed who they were and gave someone a reason to push them out.

## Use of grant support

Grant support will fund engineering, FHEVM development, testing, security hardening, product design, testnet infrastructure, and structured validation with Nigerian auction organisers and dealers. It will not be used to custody or settle real naira during the grant phase.
