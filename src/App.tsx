import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Car,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Eye,
  FileCheck2,
  Filter,
  Gauge,
  Gavel,
  Grid2X2,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { activity, auctions } from "./data";
import type { Auction, AuctionStatus } from "./types";
import { createDealerSession, type DealerSession } from "./lib/platform-session";
import { contractConfig } from "./lib/contract-config";

const nav = [
  { label: "Marketplace", icon: Grid2X2 },
  { label: "My activity", icon: LayoutDashboard },
  { label: "Saved lots", icon: Eye },
  { label: "Organiser studio", icon: Gavel },
];

function Badge({ status }: { status: AuctionStatus }) {
  const live = status === "Live now";
  const soon = status === "Closing soon";
  return <span className={`status-badge ${live ? "live" : soon ? "soon" : "upcoming"}`}><span />{status}</span>;
}

function App() {
  const [activeNav, setActiveNav] = useState("Marketplace");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All lots");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [session, setSession] = useState<DealerSession | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [joined, setJoined] = useState<string[]>([]);
  const [bidValues, setBidValues] = useState<Record<string, string>>({});
  const [sealedBids, setSealedBids] = useState<Record<string, string>>({});

  const filtered = useMemo(() => auctions.filter((auction) => {
    const matchesQuery = `${auction.title} ${auction.location} ${auction.organiser}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "All lots" || auction.category === category;
    return matchesQuery && matchesCategory;
  }), [category, query]);

  function joinAuction(auction: Auction) {
    if (!session) {
      setSessionOpen(true);
      return;
    }
    setJoined((current) => current.includes(auction.id) ? current : [...current, auction.id]);
    setSelectedAuction(auction);
  }

  function handleSession(input: { dealerName: string; businessName: string; contact: string }) {
    setSessionError("");
    try {
      setSession(createDealerSession(input));
      setSessionOpen(false);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Could not start dealer session.");
    }
  }

  function sealBid(auctionId: string) {
    const amount = bidValues[auctionId]?.replace(/[^0-9]/g, "") ?? "";
    if (!amount || Number(amount) <= 0) return;
    setSealedBids((current) => ({ ...current, [auctionId]: amount }));
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><div className="brand-mark"><LockKeyhole size={17} strokeWidth={2.5} /></div><span>ojabid</span></div>
        <div className="testnet-pill"><span className="pulse" /> Testnet workspace</div>
        <div className="sidebar-label">Workspace</div>
        <nav>{nav.map(({ label, icon: Icon }) => <button key={label} className={activeNav === label ? "nav-item active" : "nav-item"} onClick={() => setActiveNav(label)}><Icon size={17} />{label}{label === "Saved lots" && <span className="nav-count">4</span>}</button>)}</nav>
        <div className="sidebar-footer">
          <div className="privacy-card"><div className="privacy-icon"><ShieldCheck size={17} /></div><div><strong>Private by default</strong><p>Every bid is encrypted before it leaves your device.</p></div></div>
          <button className="nav-item"><CircleHelp size={17} />How OjaBid works</button>
          <div className="account-row"><div className="avatar">AD</div><div className="account-info"><strong>Ayomide D.</strong><span>Dealer account</span></div><ChevronDown size={15} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="mobile-menu"><Menu size={20} /></button><div className="breadcrumb"><span>Marketplace</span><span>/</span><strong>{activeNav}</strong></div><div className="top-actions"><button className="icon-button"><Bell size={18} /><i /></button><button className={session ? "wallet-button connected" : "wallet-button"} onClick={() => setSessionOpen(true)}><UserRound size={17} />{session ? session.dealerName : "Dealer sign-in"}</button></div></header>
        {sessionError && <div className="wallet-error"><CircleHelp size={15} />{sessionError}<button onClick={() => setSessionError("")}><X size={14} /></button></div>}

        <section className="hero-section"><div><div className="eyebrow"><Sparkles size={14} /> A fairer way to trade</div><h1>Find your next <em>edge.</em></h1><p>Private Naira auctions for dealers who want to compete on value, not visibility.</p></div><button className="story-button">Why we built this <ArrowUpRight size={16} /></button></section>

        <section className="stats-strip"><div className="stat"><span className="stat-icon green"><Gavel size={16} /></span><div><strong>24</strong><span>Live auctions</span></div></div><div className="stat"><span className="stat-icon blue"><Users size={16} /></span><div><strong>186</strong><span>Verified dealers</span></div></div><div className="stat"><span className="stat-icon amber"><LockKeyhole size={16} /></span><div><strong>100%</strong><span>Bids encrypted</span></div></div><div className="market-note"><span className="signal-dot" /> Lagos & Abuja markets <ChevronDown size={14} /></div></section>

        <section className="toolbar"><div className="section-title"><h2>Browse lots</h2><span>{filtered.length} available</span></div><div className="toolbar-actions"><div className="search-box"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search make, model, organiser..." /></div><div className="select-wrap"><Tag size={15} /><select value={category} onChange={(e) => setCategory(e.target.value)}><option>All lots</option><option>Cars</option><option>Motorcycles</option><option>Trucks</option></select></div><button className={`filter-button ${showFilters ? "selected" : ""}`} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={16} /> Filters</button></div></section>
        {showFilters && <div className="filter-panel"><span>Filter by</span><button>Verified inspection <Check size={14} /></button><button>Closing today</button><button>My eligible lots</button><button className="clear" onClick={() => setShowFilters(false)}><X size={14} /> Close</button></div>}

        <section className="auction-grid">{filtered.map((auction) => <AuctionCard key={auction.id} auction={auction} joined={joined.includes(auction.id)} onOpen={() => setSelectedAuction(auction)} />)}</section>

        <section className="lower-grid"><div className="activity-panel"><div className="panel-heading"><div><span className="eyebrow small">Your desk</span><h2>Recent activity</h2></div><button className="text-button">View all <ArrowUpRight size={14} /></button></div>{activity.map((item) => <div className="activity-row" key={item.title}><span className={`activity-dot ${item.tone}`} /><div><strong>{item.title}</strong><span>{item.detail}</span></div><time>{item.time}</time></div>)}</div><div className="principle-panel"><div className="principle-art"><div className="ring ring-one" /><div className="ring ring-two" /><LockKeyhole size={23} /></div><div><span className="eyebrow small">The OjaBid principle</span><h2>Good deals need room to breathe.</h2><p>See the vehicle. Know the rules. Submit what it is worth to you. Nobody else needs to know why.</p><button className="text-button">Read our story <ArrowUpRight size={14} /></button></div></div></section>
      </main>
      {selectedAuction && <AuctionDrawer auction={selectedAuction} joined={joined.includes(selectedAuction.id)} sealedBid={sealedBids[selectedAuction.id]} bidValue={bidValues[selectedAuction.id] ?? ""} onBidChange={(value) => setBidValues((current) => ({ ...current, [selectedAuction.id]: value }))} onSealBid={() => sealBid(selectedAuction.id)} onClose={() => setSelectedAuction(null)} onJoin={() => joinAuction(selectedAuction)} />}
      {sessionOpen && <DealerSessionModal onClose={() => setSessionOpen(false)} onSubmit={handleSession} />}
    </div>
  );
}

function AuctionCard({ auction, joined, onOpen }: { auction: Auction; joined: boolean; onOpen: () => void }) {
  return <article className="auction-card"><div className="card-image-wrap"><img src={auction.image} alt="" /><div className="image-top"><Badge status={auction.status} /><button className="save-button"><Eye size={15} /></button></div><div className="image-bottom"><span><Clock3 size={13} /> {auction.endsIn}</span><span><Users size={13} /> {auction.watchers}</span></div></div><div className="card-body"><div className="card-meta"><span>{auction.category}</span><span className="verified"><ShieldCheck size={13} /> Verified lot</span></div><h3>{auction.title}</h3><p className="muted">{auction.subtitle}</p><p className="location"><span className="location-pin" />{auction.location}</p><div className="card-divider" /><div className="card-footer"><div><span className="organiser-label">Organised by</span><strong>{auction.organiser}</strong></div><button className={joined ? "bid-button joined" : "bid-button"} onClick={onOpen}>{joined ? <><LockKeyhole size={14} /> Sealed bid</> : <>View lot <ArrowUpRight size={14} /></>}</button></div></div></article>;
}

function AuctionDrawer({ auction, joined, sealedBid, bidValue, onBidChange, onSealBid, onClose, onJoin }: { auction: Auction; joined: boolean; sealedBid?: string; bidValue: string; onBidChange: (value: string) => void; onSealBid: () => void; onClose: () => void; onJoin: () => void }) {
  return <div className="drawer-backdrop" onClick={onClose}><aside className="auction-drawer" onClick={(e) => e.stopPropagation()}><button className="drawer-close" onClick={onClose}><X size={18} /></button><img className="drawer-image" src={auction.image} alt="" /><div className="drawer-content"><Badge status={auction.status} /><div className="drawer-kicker">{auction.id} · {auction.category}</div><h2>{auction.title}</h2><p className="muted">{auction.subtitle}</p><div className="drawer-info"><span><Gauge size={16} />{auction.location}</span><span><FileCheck2 size={16} />Inspection report ready</span><span><Users size={16} />{auction.bids} sealed participants</span></div><div className="privacy-callout"><LockKeyhole size={19} /><div><strong>Your bid is sealed</strong><p>Encrypted before submission. You will never see a public bid ladder, and other dealers will not see yours.</p></div></div><div className="drawer-rule"><span>Auction closes</span><strong>{auction.endsIn}</strong></div>{joined ? <div className="bid-entry"><label htmlFor="max-bid">Your maximum bid (₦)</label>{sealedBid ? <div className="sealed-confirmation"><LockKeyhole size={16} /><span>Bid sealed privately</span><strong>₦{Number(sealedBid).toLocaleString("en-NG")}</strong></div> : <><div className="naira-input"><span>₦</span><input id="max-bid" inputMode="numeric" value={bidValue} onChange={(event) => onBidChange(event.target.value)} placeholder="e.g. 18,500,000" /></div><button className="drawer-primary" onClick={onSealBid}><LockKeyhole size={17} />Encrypt & seal bid</button><small>Testnet only · simulated Naira units · no funds move</small></>}</div> : <button className="drawer-primary" onClick={onJoin}><Gavel size={17} />Join private auction</button>}<button className="drawer-secondary"><FileCheck2 size={16} />Review inspection report</button><p className="drawer-footnote">By joining, you agree to this organiser's auction rules. {contractConfig.currencySymbol} testnet workspace · simulated settlement only.</p></div></aside></div>;
}

function DealerSessionModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (input: { dealerName: string; businessName: string; contact: string }) => void }) {
  const [dealerName, setDealerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contact, setContact] = useState("");
  return <div className="session-backdrop" onClick={onClose}><section className="session-modal" onClick={(event) => event.stopPropagation()}><button className="drawer-close" onClick={onClose}><X size={18} /></button><div className="session-icon"><UserRound size={20} /></div><span className="eyebrow small">Dealer workspace</span><h2>Enter OjaBid privately.</h2><p>Sign in with your dealership details. No wallet, tokens, or crypto knowledge required.</p><label>Dealer name<input value={dealerName} onChange={(event) => setDealerName(event.target.value)} placeholder="e.g. Ayomide D." /></label><label>Dealership<input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="e.g. Dami Autos" /></label><label>Phone or email<input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Your contact" /></label><button className="drawer-primary" onClick={() => onSubmit({ dealerName, businessName, contact })}><UserRound size={17} />Continue as dealer</button><small className="session-note">Platform-managed account · bids are encrypted with Zama FHE on testnet.</small></section></div>;
}

export { App };
