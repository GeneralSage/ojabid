import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Eye,
  FileCheck2,
  Gavel,
  LockKeyhole,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { auctions } from "./data";
import { formatNaira, formatNairaInput, KOBO_PER_NAIRA, nairaToKobo } from "./lib/money";
import { createDealerSession, type DealerSession } from "./lib/platform-session";
import type { Auction, AuctionStatus } from "./types";

const contractEvidenceUrl = "https://github.com/GeneralSage/ojabid/blob/main/contracts/test/ConfidentialAutoAuction.ts";

function Badge({ status }: { status: AuctionStatus }) {
  const className = status === "Open" ? "open" : status === "Closing soon" ? "closing" : "soon";
  return <span className={`status-badge ${className}`}><span />{status}</span>;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All lots" | Auction["category"]>("All lots");
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [session, setSession] = useState<DealerSession | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [joined, setJoined] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [bidValues, setBidValues] = useState<Record<string, string>>({});
  const [sealedOffers, setSealedOffers] = useState<Record<string, bigint>>({});
  const [bidError, setBidError] = useState("");

  const filtered = useMemo(() => auctions.filter((auction) => {
    const searchable = `${auction.title} ${auction.location} ${auction.organiser} ${auction.category}`.toLowerCase();
    return searchable.includes(query.toLowerCase()) && (category === "All lots" || category === auction.category);
  }), [category, query]);

  function openLot(auction: Auction) {
    setBidError("");
    setSelectedAuction(auction);
  }

  function startOffer(auction: Auction) {
    if (auction.status === "Opening soon") return;
    if (!session) {
      setSessionOpen(true);
      return;
    }
    setJoined((current) => current.includes(auction.id) ? current : [...current, auction.id]);
    setBidError("");
  }

  function handleSession(input: { dealerName: string; businessName: string; contact: string }) {
    setSessionError("");
    try {
      setSession(createDealerSession(input));
      setSessionOpen(false);
      const pendingAuction = selectedAuction;
      if (pendingAuction && pendingAuction.status !== "Opening soon") {
        setJoined((current) => current.includes(pendingAuction.id) ? current : [...current, pendingAuction.id]);
      }
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Could not start your dealer session.");
    }
  }

  function sealOffer(auction: Auction) {
    const kobo = nairaToKobo(bidValues[auction.id] ?? "");
    const minimumKobo = BigInt(auction.openingBidNaira) * KOBO_PER_NAIRA;
    if (!kobo) {
      setBidError("Enter the maximum amount you are prepared to offer in Naira.");
      return;
    }
    if (kobo < minimumKobo) {
      setBidError(`Your maximum offer must be at least ${formatNaira(auction.openingBidNaira)}.`);
      return;
    }
    if ((kobo - minimumKobo) % (BigInt(auction.bidIncrementNaira) * KOBO_PER_NAIRA) !== 0n) {
      setBidError(`Use increments of ${formatNaira(auction.bidIncrementNaira)} from the opening offer.`);
      return;
    }
    setSealedOffers((current) => ({ ...current, [auction.id]: kobo }));
    setBidError("");
  }

  function toggleSaved(auctionId: string) {
    setSaved((current) => current.includes(auctionId) ? current.filter((id) => id !== auctionId) : [...current, auctionId]);
  }

  return <div className="site-shell">
    <header className="site-header">
      <a className="brand-lockup" href="#top" aria-label="OjaBid home"><span className="brand-mark"><LockKeyhole size={17} strokeWidth={2.5} /></span><span>ojabid</span></a>
      <nav className="main-nav" aria-label="Primary navigation"><a href="#lots">Lots</a><a href="#privacy">How privacy works</a><a href="#why">Why we built this</a></nav>
      <div className="header-actions"><button className="mobile-menu" aria-label="Browse lots" onClick={() => scrollTo("lots")}><Menu size={20} /></button><button className={session ? "dealer-button active" : "dealer-button"} onClick={() => setSessionOpen(true)}><UserRound size={16} />{session ? session.dealerName : "Dealer sign-in"}</button></div>
    </header>

    <main id="top">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={14} /> Nigerian auto auctions, redesigned</span>
          <h1 id="hero-title">Your bid is <em>your business.</em></h1>
          <p className="hero-lede">OjaBid is being built so verified auto dealers can submit confidential maximum offers in Naira. While a lot is open, no competitor should see your price—or identify you from a public bid ladder.</p>
          <div className="hero-actions"><button className="primary-button" onClick={() => scrollTo("lots")}>Browse confidential lots <ArrowRight size={17} /></button><button className="quiet-button" onClick={() => scrollTo("why")}>Why this matters</button></div>
          <p className="preview-notice"><Eye size={14} /> Product preview: explore the experience safely. This public page accepts no payment and does not submit an auction offer.</p>
        </div>
        <div className="privacy-promise" id="privacy">
          <span className="promise-kicker">During an open auction</span>
          <h2>There is no public bid ladder.</h2>
          <div className="promise-grid"><div><LockKeyhole size={18} /><strong>Your Naira maximum</strong><span>Never shown to competing dealers.</span></div><div><Users size={18} /><strong>Your participation</strong><span>No public list of who is bidding.</span></div><div><Gavel size={18} /><strong>The fair outcome</strong><span>Best valid sealed offer wins when the lot closes.</span></div></div>
          <a href={contractEvidenceUrl} target="_blank" rel="noreferrer" className="evidence-link">Read the tested auction rules <ArrowRight size={14} /></a>
        </div>
      </section>

      <section className="truth-strip" aria-label="Auction privacy summary"><div><CheckCircle2 size={18} /><span><strong>Public:</strong> lot details, opening offer, rules and closing time.</span></div><div><LockKeyhole size={18} /><span><strong>Confidential while open:</strong> dealer identity and every maximum offer.</span></div><div><ShieldCheck size={18} /><span><strong>After close:</strong> the verified outcome is resolved under the auction rules.</span></div></section>
      <p className="production-truth"><ShieldCheck size={15} />Live-release requirement: encrypted values alone do not hide blockchain sender metadata. OjaBid must use a relayed or account-abstraction flow before it can promise anonymous participation.</p>

      <section className="lots-section" id="lots" aria-labelledby="lots-title">
        <div className="section-heading"><div><span className="eyebrow">Private lots</span><h2 id="lots-title">Inspect the vehicle. Decide your number. Keep it private.</h2></div><p>These are the only figures a competing dealer should need to see: the public opening rule and the number of confidential offers received.</p></div>
        <div className="browse-toolbar"><label className="search-box"><Search size={17} /><span className="sr-only">Search lots</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search make, model or location" /></label><div className="category-tabs" aria-label="Lot category">{(["All lots", "Cars", "Motorcycles", "Trucks"] as const).map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
        <div className="auction-grid">{filtered.map((auction) => <AuctionCard key={auction.id} auction={auction} joined={joined.includes(auction.id)} saved={saved.includes(auction.id)} sealed={Boolean(sealedOffers[auction.id])} onOpen={() => openLot(auction)} onSave={() => toggleSaved(auction.id)} />)}</div>
        {filtered.length === 0 && <div className="empty-state"><CircleHelp size={20} /><p>No lots match that search. Try a make, model, city or category.</p></div>}
      </section>

      <section className="story-section" id="why" aria-labelledby="story-title"><div className="story-mark"><span>“</span></div><div className="story-copy"><span className="eyebrow">Why we built this</span><h2 id="story-title">A small dealer should not lose a fair chance just because someone can see them trying.</h2><p>OjaBid began after a new dealer in Abuja finally raised enough to enter an auction for a vehicle he had carefully chosen. In the room, another dealer saw who was bidding and pushed the price far beyond the vehicle’s value—not because the car was worth it, but to show a smaller player he did not belong.</p><p>That moment made the problem clear: public bidding gives people with more money an extra weapon. Privacy is not a luxury here. It is the space a dealer needs to compete on judgment, not intimidation.</p><div className="story-signature"><span className="signature-line" />Built for dealers who deserve a fair shot.</div></div></section>

      <section className="how-section" aria-labelledby="how-title"><div><span className="eyebrow">The auction rule</span><h2 id="how-title">Simple for dealers. Hard to game.</h2></div><ol><li><span>01</span><div><strong>Inspect the lot</strong><p>Review verified documents, condition and the public opening rule.</p></div></li><li><span>02</span><div><strong>Set your maximum in Naira</strong><p>Only you know the highest amount you are willing to pay.</p></div></li><li><span>03</span><div><strong>Seal your offer</strong><p>There is no public price ladder, bidder list or live ranking to hunt.</p></div></li><li><span>04</span><div><strong>Resolve after close</strong><p>The best valid sealed offer is determined by the published rule.</p></div></li></ol></section>
    </main>

    <footer className="site-footer"><span>OjaBid / confidential Naira auto auctions</span><a href={contractEvidenceUrl} target="_blank" rel="noreferrer">Tested FHE auction rules</a><a href="https://github.com/GeneralSage/ojabid" target="_blank" rel="noreferrer">Project source</a></footer>

    {sessionError && <div className="notice-error" role="alert"><CircleHelp size={15} />{sessionError}<button onClick={() => setSessionError("")} aria-label="Dismiss"><X size={14} /></button></div>}
    {selectedAuction && <AuctionDrawer auction={selectedAuction} session={session} joined={joined.includes(selectedAuction.id)} sealedOffer={sealedOffers[selectedAuction.id]} bidValue={bidValues[selectedAuction.id] ?? ""} bidError={bidError} onBidChange={(value) => setBidValues((current) => ({ ...current, [selectedAuction.id]: formatNairaInput(value) }))} onSealOffer={() => sealOffer(selectedAuction)} onClose={() => { setSelectedAuction(null); setBidError(""); }} onStartOffer={() => startOffer(selectedAuction)} />}
    {sessionOpen && <DealerSessionModal onClose={() => setSessionOpen(false)} onSubmit={handleSession} />}
  </div>;
}

function AuctionCard({ auction, joined, saved, sealed, onOpen, onSave }: { auction: Auction; joined: boolean; saved: boolean; sealed: boolean; onOpen: () => void; onSave: () => void }) {
  return <article className="auction-card"><div className="card-image-wrap"><img src={auction.image} alt={`${auction.title} available at ${auction.location}`} /><div className="image-top"><Badge status={auction.status} /><button className={saved ? "save-button saved" : "save-button"} onClick={onSave} aria-label={saved ? `Remove ${auction.title} from saved lots` : `Save ${auction.title}`}><Bookmark size={15} fill={saved ? "currentColor" : "none"} /></button></div></div><div className="card-body"><div className="card-meta"><span>{auction.category}</span><span><ShieldCheck size={13} /> Verified lot</span></div><h3>{auction.title}</h3><p className="muted">{auction.subtitle}</p><p className="location">{auction.location}</p><div className="public-rule"><span>Opening offer</span><strong>{formatNaira(auction.openingBidNaira)}</strong><small>+ {formatNaira(auction.bidIncrementNaira)} increments</small></div><div className="confidential-count"><LockKeyhole size={14} /><span>{auction.sealedOfferCount === 0 ? "No confidential offers yet" : `${auction.sealedOfferCount} confidential offers`}</span><span className="card-clock"><Clock3 size={13} />{auction.endsIn}</span></div><button className={sealed ? "card-action sealed" : "card-action"} onClick={onOpen}>{sealed ? <><Check size={15} />Your offer is sealed</> : joined ? <><LockKeyhole size={15} />Set your maximum</> : <>View lot & rules <ArrowRight size={15} /></>}</button></div></article>;
}

function AuctionDrawer({ auction, session, joined, sealedOffer, bidValue, bidError, onBidChange, onSealOffer, onClose, onStartOffer }: { auction: Auction; session: DealerSession | null; joined: boolean; sealedOffer?: bigint; bidValue: string; bidError: string; onBidChange: (value: string) => void; onSealOffer: () => void; onClose: () => void; onStartOffer: () => void }) {
  const isOpeningSoon = auction.status === "Opening soon";
  return <div className="drawer-backdrop" onClick={onClose}><aside className="auction-drawer" aria-label={`${auction.title} details`} onClick={(event) => event.stopPropagation()}><button className="drawer-close" onClick={onClose} aria-label="Close lot details"><X size={18} /></button><img className="drawer-image" src={auction.image} alt={`${auction.title} available at ${auction.location}`} /><div className="drawer-content"><Badge status={auction.status} /><p className="drawer-kicker">{auction.id} / {auction.category}</p><h2>{auction.title}</h2><p className="muted">{auction.subtitle}</p><div className="drawer-facts"><span><Clock3 size={16} /><strong>Closes</strong>{auction.endsIn}</span><span><FileCheck2 size={16} /><strong>Inspection</strong>Report ready</span><span><LockKeyhole size={16} /><strong>Offers received</strong>{auction.sealedOfferCount === 0 ? "Not yet disclosed" : `${auction.sealedOfferCount} confidential`}</span></div><div className="inspection-summary"><FileCheck2 size={18} /><p>{auction.inspectionSummary}</p></div><div className="auction-rule"><div><span>Public opening offer</span><strong>{formatNaira(auction.openingBidNaira)}</strong></div><div><span>Offer increment</span><strong>{formatNaira(auction.bidIncrementNaira)}</strong></div></div><div className="privacy-callout"><LockKeyhole size={19} /><div><strong>No one sees what you are offering.</strong><p>Competing dealers cannot see your maximum, your ranking or a public list of bidders while this lot is open.</p></div></div>{isOpeningSoon ? <button className="drawer-primary disabled" disabled><Clock3 size={17} />Registration opens later</button> : !joined ? <button className="drawer-primary" onClick={onStartOffer}><Gavel size={17} />{session ? "Enter private offer" : "Sign in to enter a private offer"}</button> : <div className="bid-entry"><label htmlFor="max-offer">Your confidential maximum offer</label>{sealedOffer ? <div className="sealed-confirmation"><CheckCircle2 size={18} /><div><strong>Your maximum is sealed in this preview.</strong><span>{formatNaira(sealedOffer / KOBO_PER_NAIRA)} is visible only to you here.</span></div></div> : <><div className="naira-input"><span>₦</span><input id="max-offer" inputMode="numeric" value={bidValue} onChange={(event) => onBidChange(event.target.value)} placeholder={formatNaira(auction.openingBidNaira).replace("₦", "")} aria-describedby="offer-help" /></div><p id="offer-help" className="offer-help">Minimum: {formatNaira(auction.openingBidNaira)} / increments: {formatNaira(auction.bidIncrementNaira)}. We handle values as Naira in the experience and kobo in the auction engine.</p>{bidError && <p className="bid-error" role="alert"><CircleHelp size={14} />{bidError}</p>}<button className="drawer-primary" onClick={onSealOffer}><LockKeyhole size={17} />Prepare confidential offer</button><p className="preview-note">Preview only: this does not send a payment or enter a live auction.</p></>}</div>}<a className="drawer-secondary" href={contractEvidenceUrl} target="_blank" rel="noreferrer"><ShieldCheck size={16} />See tested auction rules</a></div></aside></div>;
}

function DealerSessionModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (input: { dealerName: string; businessName: string; contact: string }) => void }) {
  const [dealerName, setDealerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contact, setContact] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ dealerName, businessName, contact });
  }
  return <div className="session-backdrop" onClick={onClose}><form className="session-modal" onSubmit={submit} onClick={(event) => event.stopPropagation()}><button type="button" className="drawer-close" onClick={onClose} aria-label="Close dealer sign-in"><X size={18} /></button><div className="session-icon"><UserRound size={20} /></div><span className="eyebrow">Dealer access</span><h2>Enter the auction without a wallet.</h2><p>OjaBid is built around dealership details and Naira offers—not crypto language. This preview keeps the information in your current browser only.</p><label>Dealer name<input required value={dealerName} onChange={(event) => setDealerName(event.target.value)} placeholder="e.g. Ayomide D." /></label><label>Dealership<input required value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="e.g. Dami Autos" /></label><label>Phone or email<input required value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Your contact" /></label><button className="drawer-primary" type="submit"><UserRound size={17} />Continue as dealer</button><small className="session-note">No payment, offer or personal detail leaves this preview.</small></form></div>;
}

export { App };
