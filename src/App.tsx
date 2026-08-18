import { type FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  ExternalLink,
  FileCheck2,
  Gavel,
  ImageIcon,
  LockKeyhole,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { auctions } from "./data";
import { formatNaira, formatNairaInput, KOBO_PER_NAIRA, NAIRA_SYMBOL, nairaToKobo } from "./lib/money";
import { createBidderSession, type BidderSession } from "./lib/platform-session";
import type { Auction, AuctionAudience, AuctionStatus } from "./types";

const contractEvidenceUrl = "https://github.com/GeneralSage/ojabid/blob/main/contracts/test/ConfidentialAutoAuction.ts";
type DetailTab = "Overview" | "Inspection" | "Documents" | "Terms";
type LocalOffer = { amount: bigint; bidderId: string };

function Badge({ status }: { status: AuctionStatus }) {
  const className = status === "Open" ? "open" : status === "Closing soon" ? "closing" : "soon";
  return <span className={`status-badge ${className}`}><span />{status}</span>;
}

function MarketBadge({ audience }: { audience: AuctionAudience }) {
  return <span className={`market-badge ${audience.toLowerCase()}`}>{audience === "Dealer" ? <Store size={12} /> : <UsersRound size={12} />}{audience === "Dealer" ? "Dealer trade" : "Consumer"}</span>;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All lots" | Auction["category"]>("All lots");
  const [audience, setAudience] = useState<AuctionAudience>("Dealer");
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [session, setSession] = useState<BidderSession | null>(null);
  const [sessionIntent, setSessionIntent] = useState<AuctionAudience>("Dealer");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [bidValues, setBidValues] = useState<Record<string, string>>({});
  const [sealedOffers, setSealedOffers] = useState<Record<string, LocalOffer>>({});
  const [bidError, setBidError] = useState("");

  const filtered = useMemo(() => auctions.filter((auction) => {
    const searchable = `${auction.title} ${auction.location} ${auction.organiser} ${auction.category}`.toLowerCase();
    return auction.audience === audience && searchable.includes(query.toLowerCase()) && (category === "All lots" || category === auction.category);
  }), [audience, category, query]);

  const savedAuctions = auctions.filter((auction) => saved.includes(auction.id));
  const offeredAuctions = session ? auctions.filter((auction) => sealedOffers[auction.id]?.bidderId === session.sessionId) : [];
  const featuredAuction = filtered[0] ?? auctions[0];
  const marketCopy = audience === "Dealer"
    ? { eyebrow: "Dealer trade auctions / Lagos and Abuja", title: "Dealer trade auctions.", emphasis: "Protect your buying margin.", lede: "Source stock, inspect the lot and set one confidential trade maximum in Naira. No competing dealer can see your amount, rank or identity while the auction is open.", label: "Trade starting offer", detail: "Dealer prices are acquisition prices for stock buyers, not retail prices." }
    : { eyebrow: "Consumer vehicle auctions / Lagos and Abuja", title: "Consumer auto auctions.", emphasis: "Buy without price pressure.", lede: "Inspect the vehicle, review the buyer documents and set one confidential maximum in Naira. Other buyers cannot see your amount, rank or identity while the auction is open.", label: "Starting offer", detail: "Consumer lots are retail-ready vehicles for personal ownership." };

  function openLot(auction: Auction) {
    setBidError("");
    setSelectedAuction(auction);
  }

  function openSession(intent: AuctionAudience) {
    setSessionIntent(intent);
    setSessionOpen(true);
  }

  function startOffer(auction: Auction) {
    if (auction.status === "Opening soon") return;
    if (!session || session.audience !== auction.audience) {
      openSession(auction.audience);
      return;
    }
    setBidError("");
  }

  function handleSession(input: { name: string; organisation?: string; contact: string }) {
    setSessionError("");
    try {
      setSession(createBidderSession({ ...input, audience: sessionIntent }));
      setSessionOpen(false);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Could not start your auction account.");
    }
  }

  function sealOffer(auction: Auction) {
    if (!session || session.audience !== auction.audience) {
      openSession(auction.audience);
      return;
    }

    const kobo = nairaToKobo(bidValues[auction.id] ?? "");
    const minimumKobo = BigInt(auction.openingBidNaira) * KOBO_PER_NAIRA;
    const incrementKobo = BigInt(auction.bidIncrementNaira) * KOBO_PER_NAIRA;

    if (!kobo) {
      setBidError("Enter the maximum amount you are prepared to offer in Naira.");
      return;
    }
    if (kobo < minimumKobo) {
      setBidError(`Your maximum offer must be at least ${formatNaira(auction.openingBidNaira)}.`);
      return;
    }
    if ((kobo - minimumKobo) % incrementKobo !== 0n) {
      setBidError(`Use increments of ${formatNaira(auction.bidIncrementNaira)} from the starting offer.`);
      return;
    }

    setSealedOffers((current) => ({ ...current, [auction.id]: { amount: kobo, bidderId: session.sessionId } }));
    setBidError("");
  }

  function toggleSaved(auctionId: string) {
    setSaved((current) => current.includes(auctionId) ? current.filter((id) => id !== auctionId) : [...current, auctionId]);
  }

  return <div className="site-shell">
    <header className="site-header">
      <a className="brand-lockup" href="#top" aria-label="OjaBid home"><span className="brand-mark"><LockKeyhole size={17} strokeWidth={2.5} /></span><span>ojabid</span></a>
      <nav className="main-nav" aria-label="Primary navigation"><a href="#auctions">Live auctions</a><a href="#my-auctions">My offers</a><a href="#why">Why private</a></nav>
      <button className={session ? "dealer-button active" : "dealer-button"} onClick={() => openSession(session?.audience ?? audience)}><UserRound size={16} />{session ? session.name : "Sign in"}</button>
    </header>

    <main id="top">
      <section className="auction-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={14} /> {marketCopy.eyebrow}</span>
          <h1 id="hero-title">{marketCopy.title}<br /><em>{marketCopy.emphasis}</em></h1>
          <p className="hero-lede">{marketCopy.lede}</p>
          <div className="hero-actions"><button className="primary-button" onClick={() => scrollTo("auctions")}>Browse {audience.toLowerCase()} lots <ArrowRight size={17} /></button><button className="quiet-button" onClick={() => scrollTo("my-auctions")}>See my offers</button></div>
        </div>
        <article className="hero-lot" aria-label={`Featured lot ${featuredAuction.title}`}>
          <div className="hero-lot-image"><img src={featuredAuction.images[0].url} alt={featuredAuction.images[0].alt} /><Badge status={featuredAuction.status} /></div>
          <div className="hero-lot-body"><span className="lot-kicker">Featured {audience.toLowerCase()} lot / {featuredAuction.id}</span><h2>{featuredAuction.title}</h2><p>{featuredAuction.subtitle}</p><div className="hero-lot-meta"><span><MapPin size={14} />{featuredAuction.location}</span><span><Clock3 size={14} />{featuredAuction.endsIn}</span></div><div className="hero-price"><span>{marketCopy.label}</span><strong>{formatNaira(featuredAuction.openingBidNaira)}</strong><small>{featuredAuction.sealedOfferCount} confidential offers / no price ladder</small></div><button className="card-action" onClick={() => openLot(featuredAuction)}>Inspect lot and offer <ArrowRight size={15} /></button></div>
        </article>
      </section>

      <section className="privacy-rule" aria-label="How confidential bidding works"><div><LockKeyhole size={20} /><span><strong>Private maximum</strong>Your offer is not displayed as a current bid.</span></div><div><UserRound size={20} /><span><strong>Private participation</strong>There is no public bidder list or live ranking.</span></div><div><Gavel size={20} /><span><strong>Timed close</strong>The highest valid confidential offer resolves after close.</span></div></section>

      <section className="dealer-dashboard" id="my-auctions" aria-labelledby="dashboard-title">
        <div className="dashboard-heading"><div><span className="eyebrow">My auction account</span><h2 id="dashboard-title">My confidential offers</h2></div><p>{session ? `Only ${session.name} can review this account's maximum offers.` : "Sign in as a dealer or consumer to review your confidential maximum offers."}</p></div>
        <div className="dashboard-grid">
          <section className="dashboard-panel" aria-labelledby="offers-title"><div className="panel-title"><LockKeyhole size={18} /><div><h3 id="offers-title">My active offers</h3><p>One confidential maximum per account, per open lot.</p></div></div>{!session ? <EmptyPanel text="Choose a dealer or consumer auction to sign in and prepare an offer." action="Browse auctions" onClick={() => scrollTo("auctions")} /> : offeredAuctions.length === 0 ? <EmptyPanel text="You have no confidential offers yet. Inspect a live lot to set your maximum." action="Browse live lots" onClick={() => scrollTo("auctions")} /> : <div className="offer-list">{offeredAuctions.map((auction) => { const offer = sealedOffers[auction.id]; if (!offer) return null; return <button className="offer-row" key={auction.id} onClick={() => openLot(auction)}><span className="offer-status"><CheckCircle2 size={17} />Offer prepared</span><strong>{auction.title}</strong><span>{auction.endsIn}</span><em>{formatNaira(offer.amount / KOBO_PER_NAIRA)} <small>only visible to you</small></em></button>; })}</div>}</section>
          <section className="dashboard-panel" aria-labelledby="watchlist-title"><div className="panel-title"><Bookmark size={18} /><div><h3 id="watchlist-title">Watchlist</h3><p>Save a lot and return to its inspection or terms.</p></div></div>{savedAuctions.length === 0 ? <EmptyPanel text="No saved lots. Use the bookmark on any auction card to keep it here." action="Browse live lots" onClick={() => scrollTo("auctions")} /> : <div className="watch-list">{savedAuctions.map((auction) => <button key={auction.id} className="watch-row" onClick={() => openLot(auction)}><img src={auction.images[0].url} alt="" /><span><strong>{auction.title}</strong><small>{auction.location} / {auction.endsIn}</small></span><ArrowRight size={16} /></button>)}</div>}</section>
        </div>
      </section>

      <section className="lots-section" id="auctions" aria-labelledby="lots-title">
        <div className="section-heading"><div><span className="eyebrow">Live inventory</span><h2 id="lots-title">Different buyers. Different price logic. Same private auction.</h2></div><p>{marketCopy.detail}</p></div>
        <div className="market-tabs" role="tablist" aria-label="Auction audience"><button role="tab" aria-selected={audience === "Dealer"} className={audience === "Dealer" ? "selected" : ""} onClick={() => { setAudience("Dealer"); setCategory("All lots"); }}><Store size={16} /><span><strong>Dealer auctions</strong><small>Trade acquisition prices</small></span></button><button role="tab" aria-selected={audience === "Consumer"} className={audience === "Consumer" ? "selected" : ""} onClick={() => { setAudience("Consumer"); setCategory("All lots"); }}><UsersRound size={16} /><span><strong>Consumer auctions</strong><small>Retail-ready vehicle prices</small></span></button></div>
        <div className="browse-toolbar"><label className="search-box"><Search size={17} /><span className="sr-only">Search lots</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search make, model or location" /></label><div className="category-tabs" aria-label="Lot category">{(["All lots", "Cars", "Motorcycles", "Trucks"] as const).map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
        <div className="auction-grid">{filtered.map((auction) => <AuctionCard key={auction.id} auction={auction} saved={saved.includes(auction.id)} sealed={session ? sealedOffers[auction.id]?.bidderId === session.sessionId : false} onOpen={() => openLot(auction)} onSave={() => toggleSaved(auction.id)} />)}</div>
        {filtered.length === 0 && <div className="empty-state"><CircleHelp size={20} /><p>No lots match that search. Try a make, model, city or category.</p></div>}
      </section>

      <section className="why-section" id="why" aria-labelledby="why-title"><div className="why-number">01</div><div><span className="eyebrow">Why OjaBid exists</span><h2 id="why-title">A smaller dealer should not lose a fair chance because another dealer can see them trying.</h2><p>OjaBid was born after a new Abuja dealer finally raised enough to enter an auto auction. Someone in the room recognised him, bid the vehicle far above its value and used the public ladder to signal that he did not belong. It was not fair price discovery.</p><p>For dealers and consumers, privacy lets a buyer compete on inspection, judgment and a real Naira maximum, rather than intimidation.</p></div></section>

      <section className="workflow-section" aria-labelledby="workflow-title"><div><span className="eyebrow">Auction flow</span><h2 id="workflow-title">Everything a buyer expects. One thing removed.</h2></div><ol><li><span>01</span><div><strong>Verify and inspect</strong><p>Account access, vehicle details, condition notes and documents sit with every lot.</p></div></li><li><span>02</span><div><strong>Set a Naira maximum</strong><p>Enter a maximum that respects the published starting offer and increment.</p></div></li><li><span>03</span><div><strong>Submit confidentially</strong><p>Your amount is sealed; other buyers do not get a current price, your identity or a ranking.</p></div></li><li><span>04</span><div><strong>Close, pay and collect</strong><p>After close, the verified result starts the normal payment and collection workflow.</p></div></li></ol></section>
      <p className="technology-note"><ShieldCheck size={15} />Built with Zama fhEVM encrypted-bid technology.</p>
    </main>

    <footer className="site-footer"><span>OjaBid / confidential Naira auto auctions</span><a href="https://www.zama.org/" target="_blank" rel="noreferrer">Built with Zama fhEVM</a><a href={contractEvidenceUrl} target="_blank" rel="noreferrer">Auction rule tests</a><a href="https://github.com/GeneralSage/ojabid" target="_blank" rel="noreferrer">Project source</a></footer>
    {sessionError && <div className="notice-error" role="alert"><CircleHelp size={15} />{sessionError}<button onClick={() => setSessionError("")} aria-label="Dismiss"><X size={14} /></button></div>}
    {selectedAuction && <AuctionDrawer key={selectedAuction.id} auction={selectedAuction} session={session} sealedOffer={session && sealedOffers[selectedAuction.id]?.bidderId === session.sessionId ? sealedOffers[selectedAuction.id].amount : undefined} bidValue={bidValues[selectedAuction.id] ?? ""} bidError={bidError} onBidChange={(value) => setBidValues((current) => ({ ...current, [selectedAuction.id]: formatNairaInput(value) }))} onSealOffer={() => sealOffer(selectedAuction)} onClose={() => { setSelectedAuction(null); setBidError(""); }} onStartOffer={() => startOffer(selectedAuction)} />}
    {sessionOpen && <AuctionSessionModal audience={sessionIntent} onClose={() => setSessionOpen(false)} onSubmit={handleSession} />}
  </div>;
}

function EmptyPanel({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return <div className="empty-panel"><p>{text}</p><button onClick={onClick}>{action} <ArrowRight size={14} /></button></div>;
}

function AuctionCard({ auction, saved, sealed, onOpen, onSave }: { auction: Auction; saved: boolean; sealed: boolean; onOpen: () => void; onSave: () => void }) {
  const image = auction.images[0];
  const priceLabel = auction.audience === "Dealer" ? "Trade starting offer" : "Starting offer";
  return <article className="auction-card"><div className="card-image-wrap"><img src={image.url} alt={image.alt} /><div className="image-top"><Badge status={auction.status} /><button className={saved ? "save-button saved" : "save-button"} onClick={onSave} aria-label={saved ? `Remove ${auction.title} from saved lots` : `Save ${auction.title}`}><Bookmark size={15} fill={saved ? "currentColor" : "none"} /></button></div><span className="image-reference"><ImageIcon size={12} />Reference photos</span></div><div className="card-body"><div className="card-meta"><span>{auction.id} / {auction.category}</span><MarketBadge audience={auction.audience} /></div><h3>{auction.title}</h3><p className="muted">{auction.subtitle}</p><p className="location"><MapPin size={13} />{auction.location}</p><div className="public-rule"><span>{priceLabel}</span><strong>{formatNaira(auction.openingBidNaira)}</strong><small>+ {formatNaira(auction.bidIncrementNaira)} increments</small></div><div className="confidential-count"><LockKeyhole size={14} /><span>{auction.sealedOfferCount === 0 ? "No confidential offers yet" : `${auction.sealedOfferCount} confidential offers`}</span><span className="card-clock"><Clock3 size={13} />{auction.endsIn}</span></div><button className={sealed ? "card-action sealed" : "card-action"} onClick={onOpen}>{sealed ? <><Check size={15} />Your offer is prepared</> : <>Inspect lot and offer <ArrowRight size={15} /></>}</button></div></article>;
}

function AuctionDrawer({ auction, session, sealedOffer, bidValue, bidError, onBidChange, onSealOffer, onClose, onStartOffer }: { auction: Auction; session: BidderSession | null; sealedOffer?: bigint; bidValue: string; bidError: string; onBidChange: (value: string) => void; onSealOffer: () => void; onClose: () => void; onStartOffer: () => void }) {
  const [activeTab, setActiveTab] = useState<DetailTab>("Overview");
  const [activeImage, setActiveImage] = useState(0);
  const image = auction.images[activeImage] ?? auction.images[0];
  const isOpeningSoon = auction.status === "Opening soon";
  const priceLabel = auction.audience === "Dealer" ? "Trade starting offer" : "Starting offer";

  function moveImage(direction: -1 | 1) {
    setActiveImage((current) => (current + direction + auction.images.length) % auction.images.length);
  }

  return <div className="drawer-backdrop" onClick={onClose}><aside className="auction-drawer" aria-label={`${auction.title} auction details`} onClick={(event) => event.stopPropagation()}><button className="drawer-close" onClick={onClose} aria-label="Close auction details"><X size={18} /></button><div className="drawer-gallery"><img src={image.url} alt={image.alt} />{auction.images.length > 1 && <><button className="gallery-control previous" onClick={() => moveImage(-1)} aria-label="Show previous vehicle image"><ChevronLeft size={20} /></button><button className="gallery-control next" onClick={() => moveImage(1)} aria-label="Show next vehicle image"><ChevronRight size={20} /></button></>}<a className="source-link" href={image.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={12} />{image.sourceLabel}</a></div><div className="gallery-thumbnails" aria-label={`${auction.title} photo gallery`}>{auction.images.map((entry, index) => <button key={entry.url} className={index === activeImage ? "active" : ""} aria-label={`Show vehicle image ${index + 1}`} onClick={() => setActiveImage(index)}><img src={entry.url} alt="" /></button>)}</div><div className="drawer-content"><div className="drawer-heading"><div><Badge status={auction.status} /><p className="drawer-kicker">{auction.id} / {auction.category} / {auction.organiser}</p><h2>{auction.title}</h2><p className="muted">{auction.subtitle}</p></div><div className="drawer-side"><MarketBadge audience={auction.audience} /><span className="drawer-location"><MapPin size={14} />{auction.location}</span></div></div><div className="auction-facts"><span><Clock3 size={17} /><strong>Closes</strong>{auction.endsIn}</span><span><FileCheck2 size={17} /><strong>Inspection</strong>Report ready</span><span><LockKeyhole size={17} /><strong>Offer activity</strong>{auction.sealedOfferCount === 0 ? "No offers yet" : `${auction.sealedOfferCount} confidential`}</span></div><div className="auction-rule"><div><span>{priceLabel}</span><strong>{formatNaira(auction.openingBidNaira)}</strong></div><div><span>Minimum increment</span><strong>{formatNaira(auction.bidIncrementNaira)}</strong></div></div><div className="privacy-callout"><LockKeyhole size={19} /><div><strong>There is no public current bid.</strong><p>Buyers cannot see your maximum, rank or a running bidder list while this lot is open.</p></div></div><div className="detail-tabs" role="tablist" aria-label="Lot information">{(["Overview", "Inspection", "Documents", "Terms"] as DetailTab[]).map((tab) => <button role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "selected" : ""} key={tab} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>{activeTab === "Overview" && <div className="details-content"><p className="inspection-summary">{auction.inspectionSummary}</p><div className="vehicle-details">{auction.vehicleDetails.map((detail) => <div key={detail.label}><span>{detail.label}</span><strong>{detail.value}</strong></div>)}</div></div>}{activeTab === "Inspection" && <div className="details-content"><p className="inspection-summary">The inspection status is published before bidding so your offer is based on the vehicle, not another buyer's visible price.</p><ul className="check-list">{auction.conditionHighlights.map((highlight) => <li key={highlight}><CheckCircle2 size={16} />{highlight}</li>)}</ul></div>}{activeTab === "Documents" && <div className="details-content"><p className="inspection-summary">Document access requires account verification. These entries show what accompanies this lot.</p><ul className="document-list">{auction.documents.map((document) => <li key={document.name}><FileCheck2 size={17} /><span><strong>{document.name}</strong><small>{document.access}</small></span></li>)}</ul></div>}{activeTab === "Terms" && <div className="details-content"><ul className="terms-list"><li>{auction.audience === "Dealer" ? "Dealer trade access is required. This is an acquisition price, not a retail list price." : "Consumer buyer access is required. This lot is presented for personal ownership."}</li><li>One confidential maximum per account, per lot.</li><li>Offers must meet the published starting offer and increment.</li><li>After a verified result, payment instructions and collection release are issued to the winning buyer.</li><li>{auction.collectionWindow}</li></ul></div>}<BidPanel auction={auction} session={session} sealedOffer={sealedOffer} bidValue={bidValue} bidError={bidError} isOpeningSoon={isOpeningSoon} onBidChange={onBidChange} onSealOffer={onSealOffer} onStartOffer={onStartOffer} /><p className="photo-disclaimer">The thumbnails show several source-linked views of this model. A live lot uses organiser or inspection-partner evidence for the exact vehicle.</p><a className="drawer-secondary" href={contractEvidenceUrl} target="_blank" rel="noreferrer"><ShieldCheck size={16} />See auction rule tests</a></div></aside></div>;
}

function BidPanel({ auction, session, sealedOffer, bidValue, bidError, isOpeningSoon, onBidChange, onSealOffer, onStartOffer }: { auction: Auction; session: BidderSession | null; sealedOffer?: bigint; bidValue: string; bidError: string; isOpeningSoon: boolean; onBidChange: (value: string) => void; onSealOffer: () => void; onStartOffer: () => void }) {
  const accountLabel = auction.audience === "Dealer" ? "dealer" : "consumer";
  if (isOpeningSoon) return <section className="bid-panel"><div><span className="eyebrow">Auction status</span><h3>Registration opens later</h3><p>This lot is not accepting offers yet. Review the details and save it to your watchlist.</p></div><button className="drawer-primary disabled" disabled><Clock3 size={17} />{auction.endsIn}</button></section>;
  if (!session || session.audience !== auction.audience) return <section className="bid-panel"><div><span className="eyebrow">{auction.audience} account</span><h3>Sign in before you offer</h3><p>{auction.audience === "Dealer" ? "Use your dealership details to place a confidential trade offer." : "Use your buyer details to place a confidential personal-purchase offer."} No crypto wallet is required.</p></div><button className="drawer-primary" onClick={onStartOffer}><UserRound size={17} />Sign in as a {accountLabel}</button></section>;
  if (sealedOffer !== undefined) return <section className="bid-panel sealed"><CheckCircle2 size={20} /><div><span className="eyebrow">Your offer status</span><h3>Private maximum prepared</h3><strong>{formatNaira(sealedOffer / KOBO_PER_NAIRA)}</strong><p>Only {session.name} can see this amount. Other buyers see only the confidential-offer count.</p></div></section>;
  return <section className="bid-panel"><div><span className="eyebrow">Submit your maximum</span><h3>Set the most you are prepared to pay.</h3><p>This is a sealed maximum offer, not a public current bid.</p></div><label className="bid-label" htmlFor="max-offer">Your confidential Naira maximum<div className="naira-input"><span>{NAIRA_SYMBOL}</span><input id="max-offer" inputMode="numeric" value={bidValue} onChange={(event) => onBidChange(event.target.value)} placeholder={formatNaira(auction.openingBidNaira).slice(1)} aria-describedby="offer-help" /></div></label><p id="offer-help" className="offer-help">Minimum: {formatNaira(auction.openingBidNaira)} / Increments: {formatNaira(auction.bidIncrementNaira)}.</p>{bidError && <p className="bid-error" role="alert"><CircleHelp size={14} />{bidError}</p>}<button className="drawer-primary" onClick={onSealOffer}><LockKeyhole size={17} />Prepare confidential maximum</button></section>;
}

function AuctionSessionModal({ audience, onClose, onSubmit }: { audience: AuctionAudience; onClose: () => void; onSubmit: (input: { name: string; organisation?: string; contact: string }) => void }) {
  const [name, setName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [contact, setContact] = useState("");
  const isDealer = audience === "Dealer";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ name, organisation: isDealer ? organisation : undefined, contact });
  }

  return <div className="session-backdrop" onClick={onClose}><form className="session-modal" onSubmit={submit} onClick={(event) => event.stopPropagation()}><button type="button" className="drawer-close" onClick={onClose} aria-label="Close sign-in"><X size={18} /></button><div className="session-icon">{isDealer ? <Store size={20} /> : <UserRound size={20} />}</div><span className="eyebrow">{audience} auction access</span><h2>{isDealer ? "Enter the trade auction." : "Enter the consumer auction."}</h2><p>{isDealer ? "Use normal dealership details. Your identity is not shown to competing dealers during an open lot." : "Use your buyer details. Your identity is not shown to other buyers during an open lot."}</p><label>{isDealer ? "Dealer name" : "Full name"}<input required value={name} onChange={(event) => setName(event.target.value)} placeholder={isDealer ? "e.g. Ayomide D." : "e.g. Chiamaka N."} /></label>{isDealer && <label>Dealership<input required value={organisation} onChange={(event) => setOrganisation(event.target.value)} placeholder="e.g. Dami Autos" /></label>}<label>Phone or email<input required value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Your contact" /></label><button className="drawer-primary" type="submit"><UserRound size={17} />Continue as {isDealer ? "dealer" : "buyer"}</button><small className="session-note">Account verification is required before a confidential offer is accepted.</small></form></div>;
}

export { App };
