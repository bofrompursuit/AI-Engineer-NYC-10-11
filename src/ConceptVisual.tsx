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

const VISUALS: Record<string, () => ReactElement> = { force: ForceVisual, speed: SpeedVisual, energy: EnergyVisual }

export default function ConceptVisual({ questionId }: { questionId: string }) {
  const Visual = VISUALS[questionId]
  if (!Visual) return null
  return <Visual />
}
