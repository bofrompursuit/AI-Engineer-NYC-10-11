import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import { getJourney, type JourneyId } from "./journeys"
import { greeting, type PeachesAudio, type PeachesVoice } from "./usePeachesVoice"
import { PeachesLoadingAvatar } from "./PeachesPoster"
const PeachesAvatar = lazy(() => import("./PeachesAvatar"))

type Choice = JourneyId | "scan" | "bingo"
const choices: { id: Choice; letter: string; name: string; description: string; accent: string }[] = [
  getJourney("physics"),
  {
    id: "scan",
    letter: "B",
    name: "Scan & Learn",
    description: "Point your camera at anything real-world and I'll turn it into a quick challenge.",
    accent: "purple",
  },
  {
    id: "bingo",
    letter: "C",
    name: "TINY Math Bingo",
    description: "Solve 16 algebra, exponent and geometry problems. Stamp four in a row to win.",
    accent: "green",
  },
]

export default function PeachesWelcome({
  audio,
  onChoose,
  onScan,
  onBingo,
}: {
  audio: PeachesAudio
  onChoose: (id: JourneyId) => void
  onScan: () => void
  onBingo: () => void
}) {
  const [phase, setPhase] = useState<"loading" | "greeting" | "choices" | "leaving">(
    "loading",
  )
  const [selected, setSelected] = useState<Choice | null>(null)
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
  const speak = useCallback(async (voice: PeachesVoice, force = false) => {
    if (audio.liveSession) return
    clearTimeout(choiceTimer.current)
    const current = ++speechRequest.current
    setQueued(false)
    setPhase((current) => current === "choices" ? "choices" : "greeting")
    const duration = await (force ? audio.hear(voice) : audio.play(voice))
    if (current !== speechRequest.current) return
    choiceTimer.current = window.setTimeout(() => setPhase("choices"), duration ? duration * 1000 + 600 : 7800)
  }, [audio.hear, audio.play, audio.liveSession])
  useEffect(() => {
    if (!audio.liveSession) return
    speechRequest.current++
    clearTimeout(choiceTimer.current)
    pendingHear.current = false
    setQueued(false)
    setPhase("choices")
  }, [audio.liveSession])
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
    const timer = window.setTimeout(() => (selected === "scan" ? onScan() : selected === "bingo" ? onBingo() : onChoose(selected)), 800)
    return () => clearTimeout(timer)
  }, [phase, selected, onChoose, onScan, onBingo])
  const skip = () => {
    speechRequest.current++
    clearTimeout(choiceTimer.current)
    pendingHear.current = false
    setQueued(false)
    audio.stop()
    setPhase("choices")
    heading.current?.focus()
  }
  const choose = (id: Choice) => {
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
    <main className="join peaches-welcome">
      <section
        className={`handheld peaches-handheld phase-${phase}`}
        aria-labelledby="peaches-welcome-title"
      >
        <div className="hh-bezel">
          <div className="hh-progress">
            <span className="hh-title">
              <i className="peaches-online" /> Peaches ONLINE
            </span>
            <h1 id="peaches-welcome-title" ref={heading} tabIndex={-1}>
              {phase === "loading" ? "Here comes Peaches…" : phase === "greeting"
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
          <div className="hh-screen peaches-stage">
            <div className="peaches-pixels" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <span className="peaches-stage-label" aria-hidden="true">
              COMPANION / 01
            </span>
            <div className="peaches-flight" ref={flight}>
              <Suspense
                fallback={
                  <PeachesLoadingAvatar />
                }
              >
                <PeachesAvatar wave={phase === "greeting"} mood={audio.playing ? "speaking" : "idle"} getLevel={audio.getLevel} onReady={avatarSettled} />
              </Suspense>
            </div>
            <span className="peaches-stage-ground" aria-hidden="true" />
          </div>
        </div>
        <div className="peaches-dialogue" aria-live="polite">
          <span className="peaches-speaker">Peaches</span>
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
            {choices.map((journey) => (
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
        <div className="peaches-welcome-controls">
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
              aria-label="Peaches voice"
              value={audio.voice}
              onChange={(event) => {
                const voice = event.target.value as PeachesVoice
                audio.chooseVoice(voice)
                if (phase === "greeting") void speak(voice)
              }}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <button type="button" className="peaches-hear" disabled={phase === "leaving" || audio.liveSession} onClick={hear}>Hear Peaches</button>
          {phase === "greeting" || phase === "loading" ? (
            <button type="button" onClick={skip}>
              Skip greeting →
            </button>
          ) : null}
        </div>
        {audio.audioError && (
          <p className="peaches-audio-note" role="status">
            {audio.audioError}
          </p>
        )}
        {queued && <p className="peaches-audio-note" role="status">I'll speak as soon as my entrance is ready.</p>}
        <span className="sr-only" role="status">
          {audio.playing ? "Peaches is speaking" : ""}
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
