import { useEffect, useRef, useState, type ReactElement } from "react"

// Hands-before-words: let an 8-year-old play with the idea before the formula
// shows up in the quiz. Each visual uses different numbers than its quiz
// question so it teaches the general idea without giving away the answer.

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(query.matches)
    const onChange = () => setReduced(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])
  return reduced
}

function ForceVisual() {
  const reduced = usePrefersReducedMotion()
  const [level, setLevel] = useState<0 | 1 | 2 | 3>(0)
  const distances = [0, 70, 150, 250]
  const labels = ["Light push", "Medium push", "Strong push"]
  return (
    <div className="concept-visual" aria-label="Push the rover to feel how force changes speed">
      <div className="cv-track">
        <span
          className="cv-rover"
          style={{ transform: `translateX(${reduced ? Math.min(distances[level], 90) : distances[level]}px)` }}
        >
          🤖
        </span>
      </div>
      <div className="cv-buttons">
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`cv-btn ${level === i + 1 ? "active" : ""}`}
            onClick={() => {
              setLevel(0)
              requestAnimationFrame(() => requestAnimationFrame(() => setLevel((i + 1) as 1 | 2 | 3)))
            }}
          >
            {"→".repeat(i + 1)} {label}
          </button>
        ))}
      </div>
      <p className="cv-caption" aria-live="polite">
        {level === 0
          ? "Tap a push to see what happens."
          : "A bigger push (more force) sends it farther and faster — same rover, same time."}
      </p>
    </div>
  )
}

function SpeedVisual() {
  const reduced = usePrefersReducedMotion()
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState<null | "slow" | "fast">(null)
  const timer = useRef(0)
  const go = () => {
    setDone(null)
    setRunning(false)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setRunning(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setDone("fast"), reduced ? 50 : 1300)
      }),
    )
  }
  return (
    <div className="concept-visual" aria-label="Race two rovers over the same distance to compare speed">
      <div className="cv-lanes">
        <div className="cv-track cv-track-small">
          <span className="cv-finish">🏁</span>
          <span className={`cv-rover cv-slow ${running ? "go" : ""}`}>🐢</span>
        </div>
        <div className="cv-track cv-track-small">
          <span className="cv-finish">🏁</span>
          <span className={`cv-rover cv-fast ${running ? "go" : ""}`}>🚗</span>
        </div>
      </div>
      <div className="cv-buttons">
        <button type="button" className="cv-btn" onClick={go}>
          ▶ Start the race
        </button>
      </div>
      <p className="cv-caption" aria-live="polite">
        {done
          ? "Both went the same distance, but the car took less time — that's what makes it faster. Speed = distance ÷ time."
          : "Same finish line for both. Watch who gets there in less time."}
      </p>
    </div>
  )
}

function EnergyVisual() {
  const reduced = usePrefersReducedMotion()
  const [charging, setCharging] = useState(false)
  const [done, setDone] = useState(false)
  const timer = useRef(0)
  const charge = () => {
    setDone(false)
    setCharging(false)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setCharging(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setDone(true), reduced ? 50 : 1600)
      }),
    )
  }
  return (
    <div className="concept-visual" aria-label="Charge a dim and a bright beacon for the same time to compare energy">
      <div className="cv-beacons">
        <div className="cv-beacon">
          <span className={`cv-bulb cv-dim ${done ? "lit" : ""}`}>💡</span>
          <div className="cv-bar"><i className={charging ? "fill-dim" : ""} /></div>
          <small>Small beacon</small>
        </div>
        <div className="cv-beacon">
          <span className={`cv-bulb cv-bright ${done ? "lit" : ""}`}>💡</span>
          <div className="cv-bar"><i className={charging ? "fill-bright" : ""} /></div>
          <small>Big beacon</small>
        </div>
      </div>
      <div className="cv-buttons">
        <button type="button" className="cv-btn" onClick={charge}>
          ⚡ Charge both for 1 second
        </button>
      </div>
      <p className="cv-caption" aria-live="polite">
        {done
          ? "Same charging time for both, but the bigger beacon stores more energy. Energy = power × time."
          : "Watch how much each one fills up in the same amount of time."}
      </p>
    </div>
  )
}

function DerivativeVisual() {
  const [point, setPoint] = useState<null | "early" | "late">(null)
  return (
    <div className="concept-visual" aria-label="Check how fast a growing curve is changing at two different points">
      <div className="cv-curve">
        <svg viewBox="0 0 220 110" aria-hidden="true">
          <path d="M10,100 C 80,95 150,70 210,10" />
          <circle cx="55" cy="97" r={point === "early" ? 7 : 5} className={point === "early" ? "hot" : ""} />
          <circle cx="175" cy="30" r={point === "late" ? 7 : 5} className={point === "late" ? "hot" : ""} />
          {point === "early" && <line x1="30" y1="99" x2="80" y2="93" className="tangent" />}
          {point === "late" && <line x1="150" y1="52" x2="200" y2="10" className="tangent" />}
        </svg>
      </div>
      <div className="cv-buttons">
        <button type="button" className={`cv-btn ${point === "early" ? "active" : ""}`} onClick={() => setPoint("early")}>
          Check it early
        </button>
        <button type="button" className={`cv-btn ${point === "late" ? "active" : ""}`} onClick={() => setPoint("late")}>
          Check it later
        </button>
      </div>
      <p className="cv-caption" aria-live="polite">
        {point === "early"
          ? "Early on, the curve is almost flat here — it's changing slowly."
          : point === "late"
            ? "Later on, the curve is steep here — it's changing fast!"
            : "Same curve, two spots. Tap each to see how fast it's changing right there."}
      </p>
    </div>
  )
}

function IntegralVisual() {
  const [drops, setDrops] = useState<number[]>([])
  const add = () => setDrops((d) => (d.length >= 6 ? d : [...d, (d.length + 1) * 6]))
  const reset = () => setDrops([])
  const total = drops.reduce((sum, h) => sum + h, 0)
  return (
    <div className="concept-visual" aria-label="Pour drops that get bigger each second and watch the total add up">
      <div className="cv-jar">
        <div className="cv-jar-fill" style={{ height: `${Math.min(100, total)}%` }} />
        <span className="cv-jar-total">{total}</span>
      </div>
      <div className="cv-buttons">
        <button type="button" className="cv-btn" onClick={add} disabled={drops.length >= 6}>
          💧 Pour one more second
        </button>
        <button type="button" className="cv-btn" onClick={reset}>
          ↺ Reset
        </button>
      </div>
      <p className="cv-caption" aria-live="polite">
        {drops.length === 0
          ? "Each second pours a bigger drop than the last. Keep pouring and watch the total."
          : "Adding up every little drop over time gives you the total amount — that's what integrating does."}
      </p>
    </div>
  )
}

function ConstantVisual() {
  const [checked, setChecked] = useState<null | "steady" | "changing">(null)
  return (
    <div className="concept-visual" aria-label="Compare a steady signal to a changing one">
      <div className="cv-signals">
        <div className="cv-signal">
          <span className="cv-signal-icon">😴</span>
          <svg viewBox="0 0 100 40" aria-hidden="true"><path d="M5,20 H95" className="flat" /></svg>
          <small>Steady</small>
        </div>
        <div className="cv-signal">
          <span className="cv-signal-icon">⚡</span>
          <svg viewBox="0 0 100 40" aria-hidden="true"><path d="M5,35 Q 35,5 65,25 T 95,5" className="wavy" /></svg>
          <small>Changing</small>
        </div>
      </div>
      <div className="cv-buttons">
        <button type="button" className="cv-btn" onClick={() => setChecked("steady")}>
          Check the steady one
        </button>
        <button type="button" className="cv-btn" onClick={() => setChecked("changing")}>
          Check the changing one
        </button>
      </div>
      <p className="cv-caption" aria-live="polite">
        {checked === "steady"
          ? "Rate of change: 0. A flat line never goes up or down."
          : checked === "changing"
            ? "Rate of change: not zero! This one keeps going up and down."
            : "Tap one to see its rate of change."}
      </p>
    </div>
  )
}

function BasePairVisual() {
  const [tries, setTries] = useState<Record<string, "right" | "wrong">>({})
  const attempt = (partner: "G" | "A" | "T") => {
    setTries((t) => ({ ...t, [partner]: partner === "G" ? "right" : "wrong" }))
  }
  return (
    <div className="concept-visual" aria-label="Test which letter is the true partner for C">
      <div className="cv-buttons">
        <span className="cv-base">C</span>
        <span className="cv-base-arrow">+</span>
        {(["G", "A", "T"] as const).map((b) => (
          <button
            key={b}
            type="button"
            className={`cv-btn cv-base-try ${tries[b] === "right" ? "active" : ""} ${tries[b] === "wrong" ? "wrong" : ""}`}
            onClick={() => attempt(b)}
          >
            {b} {tries[b] === "right" ? "✓" : tries[b] === "wrong" ? "✗" : ""}
          </button>
        ))}
      </div>
      <p className="cv-caption" aria-live="polite">
        {tries.G === "right"
          ? "C only has ONE true partner: G. Every base in DNA has exactly one match — figure out A's."
          : "Try pairing C with each letter. Only one is its true DNA partner."}
      </p>
    </div>
  )
}

function RecordCompareVisual() {
  const [mode, setMode] = useState<null | "label" | "drawer">(null)
  return (
    <div className="concept-visual" aria-label="Compare two toy boxes by label or by the same drawer">
      <div className="cv-boxes">
        {["Box A", "Box B"].map((label) => (
          <div key={label} className={`cv-box ${mode === "drawer" ? "show-drawers" : ""}`}>
            <small>{label}</small>
            <div className="cv-drawers">
              <i>1</i>
              <i className={mode === "drawer" ? "highlight" : ""}>2</i>
              <i>3</i>
            </div>
          </div>
        ))}
      </div>
      <div className="cv-buttons">
        <button type="button" className={`cv-btn ${mode === "label" ? "active" : ""}`} onClick={() => setMode("label")}>
          Just check the label
        </button>
        <button type="button" className={`cv-btn ${mode === "drawer" ? "active" : ""}`} onClick={() => setMode("drawer")}>
          Compare drawer 2 in both
        </button>
      </div>
      <p className="cv-caption" aria-live="polite">
        {mode === "label"
          ? "The label alone doesn't tell you what's different inside."
          : mode === "drawer"
            ? "Comparing the exact same spot in both records is what actually proves something changed."
            : "Pick how you'd check for a real difference between the two records."}
      </p>
    </div>
  )
}

function IntegrityVisual() {
  const [changed, setChanged] = useState(false)
  const grid = changed ? [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1] : [1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1]
  return (
    <div className="concept-visual" aria-label="Change one pixel and watch the fingerprint code change completely">
      <div className="cv-pixels">
        {grid.map((v, i) => (
          <i key={i} className={v ? "on" : ""} data-changed={changed && i === 9 ? "true" : undefined} />
        ))}
      </div>
      <code className="cv-hash">{changed ? "4F9A...E21C" : "A02B...88D4"}</code>
      <div className="cv-buttons">
        <button type="button" className="cv-btn" onClick={() => setChanged((c) => !c)}>
          {changed ? "↺ Reset the pixel" : "✏️ Change one pixel"}
        </button>
      </div>
      <p className="cv-caption" aria-live="polite">
        {changed
          ? "One tiny pixel changed, and the whole fingerprint code is totally different — that's how a hash catches changes."
          : "This is the file's fingerprint (a hash). Change one tiny piece and see what happens to it."}
      </p>
    </div>
  )
}

const VISUALS: Record<string, () => ReactElement> = {
  force: ForceVisual,
  speed: SpeedVisual,
  energy: EnergyVisual,
  derivative: DerivativeVisual,
  integral: IntegralVisual,
  slope: ConstantVisual,
  "base-pairs": BasePairVisual,
  "altered-record": RecordCompareVisual,
  integrity: IntegrityVisual,
}

export function hasConceptVisual(questionId: string) {
  return questionId in VISUALS
}

export default function ConceptVisual({ questionId }: { questionId: string }) {
  const Visual = VISUALS[questionId]
  if (!Visual) return null
  return <Visual />
}
