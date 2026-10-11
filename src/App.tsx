import { useState, type FormEvent, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import ScanScreen from "./ScanScreen";

type View = "dashboard" | "case" | "analytics" | "join" | "scan";

const Icon = ({
  name,
  size = 20,
}: {
  name: "coin" | "brain" | "fire" | "arrow" | "pulse" | "check" | "lock" | "radar";
  size?: number;
}) => {
  const paths = {
    coin: (
      <>
        <ellipse cx="12" cy="7" rx="7" ry="3" />
        <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
      </>
    ),
    brain: (
      <path d="M9.5 5.2A3.2 3.2 0 0 0 4 7.5c0 .5.1 1 .3 1.4A3.7 3.7 0 0 0 5.5 16a3.2 3.2 0 0 0 4 2.8m5-13.6A3.2 3.2 0 0 1 20 7.5c0 .5-.1 1-.3 1.4A3.7 3.7 0 0 1 18.5 16a3.2 3.2 0 0 1-4 2.8M9.5 5.2v13.6m5-13.6v13.6M7 9.5c.6.5 1.4.7 2.5.6m7.5-.6c-.6.5-1.4.7-2.5.6M6.5 15c.8-.5 1.8-.6 3-.3m8-.2c-.8-.5-1.8-.6-3-.3" />
    ),
    fire: <path d="M13.2 3s.5 3.3-2.2 5.3c-1.8 1.4-3.1 3-3.1 5.2A4.2 4.2 0 0 0 12.2 18a4.4 4.4 0 0 0 4.5-4.6c0-2.7-1.6-5.1-3.5-6.6.1 2-1.1 3.4-1.1 3.4" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />,
    check: <path d="m5 12 4 4L19 6" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v2" />
      </>
    ),
    radar: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="m14 10 5-5M4 12h3m10 0h3" />
      </>
    ),
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </g>
    </svg>
  );
};

const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline";
  className?: string;
}) => (
  <button className={`btn btn-${variant} ${className}`} onClick={onClick} type="button">
    {children}
  </button>
);

const Stat = ({ icon, value, label }: { icon: "coin" | "brain"; value: string; label: string }) => (
  <div className="header-stat">
    <span className={`stat-icon ${icon}`}><Icon name={icon} /></span>
    <span><strong>{value}</strong><small>{label}</small></span>
  </div>
);

function Header({ view, setView }: { view: View; setView: (view: View) => void }) {
  return (
    <header className="app-header">
      <button className="brand" onClick={() => setView("dashboard")} type="button">
        <span className="brand-mark"><span /></span>
        <span>UNFOLD</span>
      </button>
      <nav className="view-nav" aria-label="Primary navigation">
        <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")} type="button">Mission hub</button>
        <button className={view === "case" ? "active" : ""} onClick={() => setView("case")} type="button">Case file</button>
        <button className={view === "analytics" ? "active" : ""} onClick={() => setView("analytics")} type="button">Analytics</button>
        <button className={view === "join" ? "active" : ""} onClick={() => setView("join")} type="button">Join</button>
        <button className={view === "scan" ? "active" : ""} onClick={() => setView("scan")} type="button">Scan</button>
      </nav>
      <div className="header-actions">
        <Stat icon="coin" value="12,450" label="XP" />
        <Stat icon="brain" value="85" label="INTEL" />
        <div className="profile">
          <div className="avatar">AD<span /></div>
          <span className="profile-copy"><strong>Alex_Dev</strong><small><Icon name="fire" size={14} /> 14 day streak</small></span>
          <span className="status-dot" />
        </div>
      </div>
    </header>
  );
}

const games = [
  {
    id: "case",
    number: "01",
    kind: "case",
    tag: "FORENSIC BIOCHEM",
    title: "CYBER-DETECTIVE",
    subtitle: "CASE: 734",
    description: "Solve the biopharma data leak using logic and biochemistry puzzles.",
    sponsor: "Powered by Gemini API",
    sponsorDetail: "AI scenario generation",
    progress: "New case",
  },
  {
    id: "mars",
    number: "02",
    kind: "mars",
    tag: "SURVIVAL PHYSICS",
    title: "MARS SURVIVAL",
    subtitle: "PHYSICS REACTOR",
    description: "Use calculus and projectile motion physics to restore the power grid.",
    sponsor: "Analytics by Tiger Data",
    sponsorDetail: "Real-time tracking",
    progress: "42% complete",
  },
  {
    id: "cryptic",
    number: "03",
    kind: "cryptic",
    tag: "RECOMMENDED FOR YOU",
    title: "CRYPTIC SHIELD",
    subtitle: "GAUNTLET 09",
    description: "Defend the digital city. Solve advanced math and pattern logic traps.",
    sponsor: "RAG by Snowflake Cortex",
    sponsorDetail: "Adaptive knowledge",
    progress: "Hard · +800 XP",
  },
];

function GameArt({ kind }: { kind: string }) {
  if (kind === "case") {
    return (
      <div className="game-art detective">
        <div className="dna">
          {[0, 1, 2, 3, 4].map((i) => <i key={i} />)}
        </div>
        <div className="lens"><span>734</span></div>
        <span className="code c1">A_CG</span><span className="code c2">01</span>
      </div>
    );
  }
  if (kind === "mars") {
    return (
      <div className="game-art mars">
        <div className="planet" /><div className="dome d1" /><div className="dome d2" />
        <div className="rocket">▲<i /></div><span className="orbit" />
      </div>
    );
  }
  return (
    <div className="game-art cryptic">
      <div className="binary ring-one">01011001</div>
      <div className="binary ring-two">101 · 010</div>
      <div className="lock-body"><Icon name="lock" size={44} /></div>
    </div>
  );
}

function GameCard({ game, onStart }: { game: (typeof games)[number]; onStart: () => void }) {
  return (
    <article className={`game-card ${game.kind}`}>
      <div className="card-topline"><span>{game.tag}</span><span>/{game.number}</span></div>
      <GameArt kind={game.kind} />
      <div className="game-copy">
        <div className="progress-label"><span>{game.progress}</span><span className="difficulty-dots"><i /><i /><i /></span></div>
        <div className="game-title">{game.title}</div>
        <div className="game-subtitle">{game.subtitle}</div>
        <p>{game.description}</p>
      </div>
      <Button onClick={onStart} className="game-start">
        <span>START MISSION</span><Icon name="arrow" />
      </Button>
      <div className="sponsor"><span className="sponsor-glyph">✦</span><span><b>{game.sponsor}</b><small>{game.sponsorDetail}</small></span></div>
    </article>
  );
}

const feed = [
  { time: "02m", category: "FDA APPROVAL", title: "New gene therapy clears final review", action: "GENERATE MODULE", tone: "mint" },
  { time: "18m", category: "CYBERSECURITY BREAK", title: "Big data network reports breach", action: "SOLVE CASE", tone: "orange" },
  { time: "41m", category: "SPACE X", title: "Mars Starship launch window confirmed", action: "PHYSICS CHALLENGE", tone: "blue" },
];

function MiniChart({ large = false }: { large?: boolean }) {
  return (
    <div className={large ? "chart chart-large" : "chart"}>
      <div className="y-labels"><span>900</span><span>600</span><span>300</span><span>0</span></div>
      <svg viewBox="0 0 620 180" preserveAspectRatio="none" aria-label="XP gain trend chart">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3ce8c5" stopOpacity=".28" />
            <stop offset="1" stopColor="#3ce8c5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="grid"><path d="M0 20H620M0 67H620M0 114H620M0 160H620" /></g>
        <path className="area" d="M0 150 C50 147 58 134 105 136 S164 122 207 126 S264 92 310 105 S368 76 408 83 S470 43 505 58 S566 17 620 12 V180H0Z" />
        <path className="line-shadow" d="M0 150 C50 147 58 134 105 136 S164 122 207 126 S264 92 310 105 S368 76 408 83 S470 43 505 58 S566 17 620 12" />
        <path className="line" d="M0 150 C50 147 58 134 105 136 S164 122 207 126 S264 92 310 105 S368 76 408 83 S470 43 505 58 S566 17 620 12" />
        <g className="points"><circle cx="207" cy="126" r="4" /><circle cx="408" cy="83" r="4" /><circle cx="505" cy="58" r="4" /><circle cx="620" cy="12" r="5" /></g>
      </svg>
      <div className="x-labels"><span>8AM</span><span>10AM</span><span>12PM</span><span>2PM</span><span>NOW</span></div>
      {!large && <div className="chart-tooltip"><b>+185 XP</b><span>1:42 PM</span></div>}
    </div>
  );
}

function QrCode() {
  const cells = [0,1,2,3,4,6,8,9,10,11,12,14,16,18,20,21,22,23,24,26,28,30,32,34,35,36,37,38,39,41,43,44,46,48,49,50,52,54,55,56,58,60,62,64,66,67,68,70,72,74,76,78,80];
  return <div className="qr" aria-label="QR code placeholder">{cells.map((cell) => <i key={cell} style={{ gridArea: `${Math.floor(cell / 9) + 1} / ${(cell % 9) + 1}` }} />)}</div>;
}

function Dashboard({ openCase, openAnalytics, openJoin }: { openCase: () => void; openAnalytics: () => void; openJoin: () => void }) {
  return (
    <main className="dashboard page-enter">
      <section className="hero-row">
        <div>
          <span className="eyebrow"><i /> LEARNING OPS / ACTIVE</span>
          <div className="hero-title">Choose your next <em>mission.</em></div>
          <p>Real-world knowledge. High-stakes simulations. Built around you.</p>
        </div>
        <div className="daily-target">
          <span className="target-ring"><b>72%</b></span>
          <span><small>DAILY TARGET</small><strong>1,840 / 2,500 XP</strong><i><b /></i></span>
        </div>
      </section>
      <section className="games-grid">
        {games.map((game) => <GameCard key={game.id} game={game} onStart={game.id === "case" ? openCase : openAnalytics} />)}
      </section>
      <section className="lower-grid">
        <article className="panel feed-panel">
          <div className="panel-heading">
            <span><small>POWERED BY NIMBLEWAY SEARCH CRAWLS</small><strong>Live Learning Intel</strong></span>
            <span className="live-badge"><i /> LIVE</span>
          </div>
          <div className="feed-list">
            {feed.map((item) => (
              <div className="feed-item" key={item.category}>
                <span className="feed-time">{item.time}</span>
                <span className={`feed-marker ${item.tone}`} />
                <span className="feed-copy"><small>{item.category}</small><strong>{item.title}</strong></span>
                <Button variant="ghost">{item.action}<Icon name="arrow" size={16} /></Button>
              </div>
            ))}
          </div>
        </article>
        <article className="panel analytics-panel">
          <div className="panel-heading">
            <span><small>POSTGRESQL TIME-SERIES DATA</small><strong>Performance Dashboard</strong></span>
            <Button variant="ghost" onClick={openAnalytics}>FULL REPORT <Icon name="arrow" size={16} /></Button>
          </div>
          <div className="chart-meta"><span><small>XP GAIN / HOUR</small><b>+28.4%</b></span><strong>1,840 <small>XP TODAY</small></strong></div>
          <MiniChart />
          <div className="tiger-tag"><Icon name="pulse" size={15} /> STREAMING VIA TIGER DATA <span>12ms</span></div>
        </article>
        <article className="panel demo-panel">
          <div className="demo-label">WIN THE HACKATHON DEMO</div>
          <div className="qr-row" onClick={openJoin} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && openJoin()}><QrCode /><span><small>SCAN TO UNLOCK</small><strong>AI ENGINEER NYC</strong><p>Sponsor demo · Email required</p></span></div>
          <div className="monitor-head"><span><Icon name="radar" size={16} /> AGENT MONITOR</span><small>SENTRY SDK TRACE</small></div>
          <div className="monitor-list">
            <span><i className="ok" /><b>Gemini Call Trace</b><em>1.2s</em></span>
            <span><i className="ok" /><b>Nimble Crawl</b><em>Successful</em></span>
            <span><i className="error" /><b>Agent Error</b><em>Recovered ↗</em></span>
          </div>
        </article>
      </section>
    </main>
  );
}

function CaseScreen({ goBack, openAnalytics }: { goBack: () => void; openAnalytics: () => void }) {
  return (
    <main className="subpage page-enter">
      <div className="subpage-top">
        <Button variant="outline" onClick={goBack}>← MISSION HUB</Button>
        <span className="case-live"><i /> CASE ENVIRONMENT LIVE</span>
        <span className="case-id">CASE ID / PF-734-GEM</span>
      </div>
      <section className="case-layout">
        <div className="case-main">
          <span className="eyebrow"><i /> FORENSIC BIOCHEM / LEVEL 04</span>
          <div className="case-title">The Helix <em>Breach</em></div>
          <p className="case-deck">At 02:14 UTC, Helixora Labs detected an unauthorized export of trial data. Follow the molecular signature, interrogate the evidence, and identify the source before the file reaches the dark web.</p>
          <div className="evidence-board">
            <div className="board-grid" />
            <div className="evidence molecule"><span>DNA MATCH</span><b>94.7%</b><i /></div>
            <div className="evidence packet"><span>PACKET / 07</span><b>ACG-TT-091</b></div>
            <div className="evidence fingerprint"><span>ENCRYPTED STRAND</span><div className="strand">{[1,2,3,4,5,6].map(n => <i key={n} />)}</div></div>
            <div className="connection c-one" /><div className="connection c-two" />
            <span className="scan-line" />
          </div>
        </div>
        <aside className="mission-panel">
          <div className="mission-status"><small>CURRENT OBJECTIVE</small><strong>Isolate the altered sequence</strong><span>02 / 05</span></div>
          <div className="objective">
            <span className="objective-number">02</span>
            <div><small>SEQUENCE ANALYSIS</small><strong>Which base-pair mutation proves the dataset was altered?</strong></div>
          </div>
          <div className="sequence-options">
            {["A–T → G–C at locus 118", "C–G → T–A at locus 734", "A–T → C–G at locus 091"].map((option, index) => (
              <button key={option} className={index === 1 ? "selected" : ""} type="button"><span>{String.fromCharCode(65 + index)}</span>{option}{index === 1 && <Icon name="check" size={18} />}</button>
            ))}
          </div>
          <div className="ai-brief">
            <span className="ai-icon">✦</span>
            <div><small>GEMINI FIELD NOTE</small><p>The anomaly appears at the same locus as the exfiltration packet ID. Correlation is likely significant.</p></div>
          </div>
          <Button onClick={openAnalytics} className="submit-answer">SUBMIT EVIDENCE <Icon name="arrow" /></Button>
          <div className="case-reward"><span>REWARD <b>+650 XP</b></span><span>INTEL <b>+12</b></span><span>TIME <b>08:42</b></span></div>
        </aside>
      </section>
    </main>
  );
}

function AnalyticsScreen({ goBack }: { goBack: () => void }) {
  return (
    <main className="subpage analytics-page page-enter">
      <div className="subpage-top">
        <Button variant="outline" onClick={goBack}>← MISSION HUB</Button>
        <span className="case-live"><i /> DATA STREAM CONNECTED</span>
        <span className="case-id">TIGER DATA / 12ms latency</span>
      </div>
      <section className="report-heading">
        <div><span className="eyebrow"><i /> PERSONAL LEARNING TELEMETRY</span><div className="case-title">Performance <em>signal.</em></div><p>Live skill velocity, focus patterns, and knowledge retention across every mission.</p></div>
        <div className="range-control"><button type="button">24H</button><button className="active" type="button">7D</button><button type="button">30D</button></div>
      </section>
      <section className="kpi-grid">
        <div><small>TOTAL XP</small><strong>12,450</strong><span>↗ 28.4%</span></div>
        <div><small>SKILL VELOCITY</small><strong>+185 <em>xp/h</em></strong><span>Personal best</span></div>
        <div><small>FOCUS TIME</small><strong>18.6 <em>hrs</em></strong><span>↗ 3.2h</span></div>
        <div><small>GLOBAL RANK</small><strong>#184</strong><span>Top 4%</span></div>
      </section>
      <section className="report-grid">
        <article className="panel report-chart">
          <div className="panel-heading"><span><small>REAL-TIME LEARNING OUTPUT</small><strong>XP Gain per Hour</strong></span><span className="legend"><i /> XP velocity</span></div>
          <MiniChart large />
        </article>
        <article className="panel skill-panel">
          <div className="panel-heading"><span><small>MASTERY INDEX</small><strong>Skill Matrix</strong></span><b>78%</b></div>
          {[
            ["Biochemistry", 86], ["Applied physics", 72], ["Cryptography", 64], ["Pattern logic", 91],
          ].map(([skill, score]) => <div className="skill-row" key={skill}><span><b>{skill}</b><em>{score}%</em></span><i><b style={{ width: `${score}%` }} /></i></div>)}
          <div className="next-signal"><Icon name="pulse" /><span><small>NEXT BEST ACTION</small><b>Continue Cryptic Shield</b></span><Icon name="arrow" /></div>
        </article>
      </section>
    </main>
  );
}


const joinUrl = () => `${window.location.origin}${window.location.pathname}?view=join`;

function JoinScreen({ onJoined }: { onJoined: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [player, setPlayer] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("ENTER A VALID EMAIL TO SPAWN");
      return;
    }
    setError("");
    setPlayer(value);
  };

  return (
    <main className="join page-enter">
      <div className="hud-frame" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="hud-top">
        <span><i className="live-dot" /> LOBBY // AI ENGINEER NYC</span>
        <span>SECTOR 10-11 · SIGNAL 98%</span>
      </div>

      <section className="join-grid">
        <div className="join-scan">
          <span className="join-kicker">STEP 01 / SCAN</span>
          <h1>Scan to <em>drop in.</em></h1>
          <p>Point your phone camera at the code to join the hackathon demo on your device.</p>
          <div className="scan-target">
            <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
            <span className="scan-line" />
            <QRCodeSVG value={joinUrl()} size={232} bgColor="#f7fff9" fgColor="#071018" level="M" marginSize={2} />
          </div>
          <code className="join-url">{joinUrl()}</code>
        </div>

        <div className="join-divider"><span>OR</span></div>

        <form className="join-panel" onSubmit={submit} noValidate>
          <span className="join-kicker">STEP 02 / IDENTIFY</span>
          <h2>Sign in with email</h2>
          <p>We'll save your XP, streak and case files to this address.</p>
          {player ? (
            <div className="join-success" role="status">
              <span className="crosshair" aria-hidden="true" />
              <small>PLAYER SPAWNED</small>
              <strong>{player}</strong>
              <button className="btn btn-primary" type="button" onClick={onJoined}>ENTER MISSION HUB <Icon name="arrow" size={16} /></button>
            </div>
          ) : (
            <>
              <label htmlFor="join-email">EMAIL ADDRESS</label>
              <input
                id="join-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "join-error" : undefined}
              />
              {error && <span id="join-error" className="join-error">{error}</span>}
              <button className="btn btn-primary join-submit" type="submit">PRESS START <Icon name="arrow" size={16} /></button>
              <span className="join-fine"><Icon name="lock" size={14} /> No password. Email only.</span>
            </>
          )}
          <div className="hud-bars" aria-hidden="true">
            <span><small>HP</small><i><b style={{ width: "100%" }} /></i></span>
            <span><small>XP</small><i><b style={{ width: player ? "35%" : "0%" }} /></i></span>
          </div>
        </form>
      </section>

      <div className="hud-bottom" aria-hidden="true">
        <span>[ SCAN ] JOIN</span><span>[ ENTER ] START</span><span>V1.0 · LIVE</span>
      </div>
    </main>
  );
}

export default function App() {
  const [view, setViewState] = useState<View>(() =>
    new URLSearchParams(window.location.search).get("view") === "join" ? "join" : "dashboard",
  );
  const setView = (next: View) => {
    setViewState(next);
    const url = new URL(window.location.href);
    if (next === "join") url.searchParams.set("view", "join");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  };
  return (
    <div className="app-shell">
      <Header view={view} setView={setView} />
      {view === "dashboard" && <Dashboard openCase={() => setView("case")} openAnalytics={() => setView("analytics")} openJoin={() => setView("join")} />}
      {view === "case" && <CaseScreen goBack={() => setView("dashboard")} openAnalytics={() => setView("analytics")} />}
      {view === "analytics" && <AnalyticsScreen goBack={() => setView("dashboard")} />}
      {view === "join" && <JoinScreen onJoined={() => setView("dashboard")} />}
      {view === "scan" && <ScanScreen goBack={() => setView("dashboard")} />}
    </div>
  );
}
