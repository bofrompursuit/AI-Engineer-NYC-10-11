import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import { journeys, type JourneyId } from "./journeys"
import { greeting, type PipAudio, type PipVoice } from "./usePipVoice"
import { PipLoadingAvatar } from "./PipPoster"
const PipAvatar = lazy(() => import("./PipAvatar"))

export default function PipWelcome({
  audio,
  onChoose,
}: {
  audio: PipAudio
  onChoose: (id: JourneyId) => void
}) {
  const [phase, setPhase] = useState<"loading" | "greeting" | "choices" | "leaving">(
    "loading",
  )
  const [selected, setSelected] = useState<JourneyId | null>(null)
  const [avatarReady, setAvatarReady] = useState(false)
  const [entranceDone, setEntranceDone] = useState(false)
  const [queued, setQueued] = useState(false)
  const pendingHear = useRef(false)
  const speechRequest = useRef(0)
  const choiceTimer = useRef(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const flight = useRef<HTMLDivElement>(null)
  const avatarSettled = useCallback(() => setAvatarReady(true), [])
  useEffect(() => {
    heading.current?.focus()
  }, [])
  useEffect(() => {
    const duration = flight.current ? parseFloat(getComputedStyle(flight.current).animationDuration) * 1000 : 0
    const timer = window.setTimeout(() => setEntranceDone(true), duration || 0)
    return () => clearTimeout(timer)
  }, [])
  useEffect(() => {
    if (avatarReady) return
    // A slow/failed model must not prevent the learner from entering a journey.
    const timer = window.setTimeout(avatarSettled, 10000)
    return () => clearTimeout(timer)
  }, [avatarReady, avatarSettled])
  const speak = useCallback(async (voice: PipVoice, force = false) => {
    clearTimeout(choiceTimer.current)
    const current = ++speechRequest.current
    setQueued(false)
    setPhase((current) => current === "choices" ? "choices" : "greeting")
    const duration = await (force ? audio.hear(voice) : audio.play(voice))
    if (current !== speechRequest.current) return
    choiceTimer.current = window.setTimeout(() => setPhase("choices"), duration ? duration * 1000 + 600 : 7800)
  }, [audio.hear, audio.play])
  useEffect(() => {
    if ((phase === "loading" || (phase === "choices" && queued)) && avatarReady && entranceDone) {
      void speak(audio.voice, pendingHear.current)
      pendingHear.current = false
    }
  }, [phase, queued, avatarReady, entranceDone, audio.voice, speak])
  useEffect(() => () => {
    speechRequest.current++
    clearTimeout(choiceTimer.current)
  }, [])
  useEffect(() => {
    if (phase !== "leaving" || !selected) return
    const timer = window.setTimeout(() => onChoose(selected), 800)
    return () => clearTimeout(timer)
  }, [phase, selected, onChoose])
  const skip = () => {
    speechRequest.current++
    clearTimeout(choiceTimer.current)
    pendingHear.current = false
    setQueued(false)
    audio.stop()
    setPhase("choices")
    heading.current?.focus()
  }
  const choose = (id: JourneyId) => {
    speechRequest.current++
    clearTimeout(choiceTimer.current)
    audio.stop()
    setSelected(id)
    setPhase("leaving")
  }
  const hear = () => {
    audio.prepare()
    if (!avatarReady || !entranceDone) {
      pendingHear.current = true
      setQueued(true)
    } else void speak(audio.voice, true)
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
              {phase === "loading" ? "Here comes Pip…" : phase === "greeting"
                ? "Hey, you're in!"
                : phase === "leaving"
                  ? "Let's go!"
                  : "Pick your adventure"}
            </h1>
            <small>YOUR LEARNING COMPANION</small>
            <span className="hh-pips" aria-hidden="true">
              <i className="on" />
              <i className="on" />
              <i className={phase === "choices" || phase === "leaving" ? "on" : ""} />
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
            <div className="pip-flight" ref={flight}>
              <Suspense
                fallback={
                  <PipLoadingAvatar />
                }
              >
                <PipAvatar wave={phase === "greeting"} mood={audio.playing ? "speaking" : "idle"} getLevel={audio.getLevel} onReady={avatarSettled} />
              </Suspense>
            </div>
            <span className="pip-stage-ground" aria-hidden="true" />
          </div>
        </div>
        <div className="pip-dialogue" aria-live="polite">
          <span className="pip-speaker">PIP</span>
          <p>
            {phase === "loading" ? "I'm floating in! Get ready to pick your adventure." : phase === "greeting"
              ? greeting
              : phase === "leaving"
                ? "Good choice! I'll be in the corner if you need a hand."
                : "Where shall we go? I'll be with you every step of the way."}
          </p>
        </div>
        {(phase === "choices" || phase === "leaving") && (
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
            onClick={() => { pendingHear.current = false; setQueued(false); audio.toggleMute() }}
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
                if (phase === "greeting") void speak(voice)
              }}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <button type="button" className="pip-hear" disabled={phase === "leaving"} onClick={hear}>Hear Pip</button>
          {phase === "greeting" || phase === "loading" ? (
            <button type="button" onClick={skip}>
              Skip greeting →
            </button>
          ) : null}
        </div>
        {audio.audioError && (
          <p className="pip-audio-note" role="status">
            {audio.audioError}
          </p>
        )}
        {queued && <p className="pip-audio-note" role="status">I'll speak as soon as my entrance is ready.</p>}
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
