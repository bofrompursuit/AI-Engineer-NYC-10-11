import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { journeys, type JourneyId } from "./journeys"
import { greeting, type PipAudio, type PipVoice } from "./usePipVoice"
const PipAvatar = lazy(() => import("./PipAvatar"))

export default function PipWelcome({
  audio,
  onChoose,
}: {
  audio: PipAudio
  onChoose: (id: JourneyId) => void
}) {
  const [phase, setPhase] = useState<"greeting" | "choices" | "leaving">(
    "greeting",
  )
  const [selected, setSelected] = useState<JourneyId | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])
  useEffect(() => {
    if (phase !== "greeting") return
    const timer = window.setTimeout(() => setPhase("choices"), 7800)
    return () => clearTimeout(timer)
  }, [phase])
  useEffect(() => {
    if (phase !== "leaving" || !selected) return
    const timer = window.setTimeout(() => onChoose(selected), 800)
    return () => clearTimeout(timer)
  }, [phase, selected, onChoose])
  const skip = () => {
    audio.stop()
    setPhase("choices")
    heading.current?.focus()
  }
  const choose = (id: JourneyId) => {
    audio.stop()
    setSelected(id)
    setPhase("leaving")
  }

  return (
    <main className="join pip-welcome">
      <section
        className={`handheld pip-handheld phase-${phase}`}
        aria-labelledby="pip-welcome-title"
      >
        <div className="hh-bezel">
          <div className="hh-progress">
            <span className="hh-title">
              <i className="pip-online" /> PIP ONLINE
            </span>
            <h1 id="pip-welcome-title" ref={heading} tabIndex={-1}>
              {phase === "greeting"
                ? "Hey, you're in!"
                : phase === "leaving"
                  ? "Let's go!"
                  : "Pick your adventure"}
            </h1>
            <small>YOUR LEARNING COMPANION</small>
            <span className="hh-pips" aria-hidden="true">
              <i className="on" />
              <i className="on" />
              <i className={phase !== "greeting" ? "on" : ""} />
              <i />
            </span>
          </div>
          <div className="hh-screen pip-stage">
            <div className="pip-pixels" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <span className="pip-stage-label" aria-hidden="true">
              COMPANION / 01
            </span>
            <div className="pip-flight">
              <Suspense
                fallback={
                  <span className="pip-loading">Pip is flying in…</span>
                }
              >
                <PipAvatar wave />
              </Suspense>
            </div>
            <span className="pip-stage-ground" aria-hidden="true" />
          </div>
        </div>
        <div className="pip-dialogue" aria-live="polite">
          <span className="pip-speaker">PIP</span>
          <p>
            {phase === "greeting"
              ? greeting
              : phase === "leaving"
                ? "Good choice! I'll be in the corner if you need a hand."
                : "Where shall we go? I'll be with you every step of the way."}
          </p>
        </div>
        {phase !== "greeting" && (
          <div className="journey-choices" aria-label="Choose a journey">
            {journeys.map((journey) => (
              <button
                key={journey.id}
                type="button"
                className={`journey-choice accent-${journey.accent}`}
                onClick={() => choose(journey.id)}
                disabled={phase === "leaving"}
              >
                <span className="choice-key">{journey.letter}</span>
                <span>
                  <strong>{journey.name}</strong>
                  <small>{journey.description}</small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        )}
        <div className="pip-welcome-controls">
          <button
            type="button"
            onClick={audio.toggleMute}
            aria-pressed={audio.muted}
          >
            {audio.muted ? "Sound off" : "Sound on"}
          </button>
          <label>
            Voice{" "}
            <select
              aria-label="Pip voice"
              value={audio.voice}
              onChange={(event) => {
                const voice = event.target.value as PipVoice
                audio.chooseVoice(voice)
                if (phase === "greeting") audio.play(voice)
              }}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          {phase === "greeting" ? (
            <button type="button" onClick={skip}>
              Skip greeting →
            </button>
          ) : (
            <button
              type="button"
              disabled={phase === "leaving"}
              onClick={audio.hear}
            >
              Hear Pip
            </button>
          )}
        </div>
        {audio.audioError && (
          <p className="pip-audio-note" role="status">
            {audio.audioError}{" "}
            <button type="button" onClick={audio.hear}>
              Hear Pip
            </button>
          </p>
        )}
        <span className="sr-only" role="status">
          {audio.playing ? "Pip is speaking" : ""}
        </span>
        <div className="hh-bottom" aria-hidden="true">
          <span>SELECT</span>
          <span>START</span>
        </div>
        <div className="hh-grill" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </section>
    </main>
  )
}
