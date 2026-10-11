import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react"
import type { HelpContext } from "./JourneyPlayer"
import type { PipAudio, PipVoice } from "./usePipVoice"
import { PipLoadingAvatar } from "./PipPoster"
const PipAvatar = lazy(() => import("./PipAvatar"))
type Message = {
  who: "you" | "pip"
  text: string
}

export default function PipCompanion({
  context,
  audio,
  celebrating,
}: {
  context: HelpContext | null
  audio: PipAudio
  celebrating: boolean
}) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [busy, setBusy] = useState(false)
  const [hover, setHover] = useState(false)
  const launcher = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const request = useRef<AbortController | null>(null)
  const questionId = context?.question.id
  useEffect(() => {
    request.current?.abort()
    request.current = null
    setMessages([])
    setBusy(false)
    setQuestion("")
  }, [context?.journeyId, questionId])
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [messages, busy])
  const close = () => {
    setOpen(false)
    launcher.current?.focus()
  }
  const add = (items: Message[]) =>
    setMessages((current) => [...current, ...items].slice(-12))
  const hint = (explain = false) => {
    if (!context) return
    add([
      { who: "you", text: explain ? "Explain the idea." : "Give me a hint." },
      {
        who: "pip",
        text: explain
          ? context.question.concept
          : context.solved
            ? context.question.explanation
            : context.question.hint,
      },
    ])
  }
  const ask = async (event: FormEvent) => {
    event.preventDefault()
    const text = question.trim()
    if (!text || busy || !context) return
    add([{ who: "you", text }])
    setQuestion("")
    setBusy(true)
    const controller = new AbortController()
    request.current = controller
    const timeout = window.setTimeout(() => controller.abort("timeout"), 15000)
    try {
      const response = await fetch("/api/pip-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          journeyId: context.journeyId,
          questionId: context.question.id,
          solved: context.solved,
        }),
        signal: controller.signal,
      })
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new Error()
      const body = await response.json()
      if (!response.ok || typeof body.answer !== "string") {
        add([
          {
            who: "pip",
            text:
              response.status === 429
                ? "Let's take a short breather. You can still use the hint and explanation buttons."
                : "Live questions are unavailable right now. You can still ask me for a hint or an explanation below.",
          },
        ])
      } else add([{ who: "pip", text: body.answer }])
    } catch {
      if (!controller.signal.aborted || controller.signal.reason === "timeout")
        add([
          {
            who: "pip",
            text: "I couldn't reach live Q&A. Try the hint or explanation buttons below—we can keep going.",
          },
        ])
    } finally {
      clearTimeout(timeout)
      if (request.current === controller) {
        setBusy(false)
        request.current = null
      }
    }
  }
  return (
    <aside className="pip-companion" aria-label="Pip companion">
      {open && (
        <section
          className="pip-help panel"
          role="dialog"
          aria-labelledby="pip-help-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") close()
          }}
        >
          <div className="pip-help-heading">
            <span>
              <i className="pip-online" />
              <strong id="pip-help-title">Ask Pip</strong>
            </span>
            <button type="button" onClick={close} aria-label="Close Pip help">
              ×
            </button>
          </div>
          <div
            className="pip-help-log"
            ref={log}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            <p className="pip-chat pip">
              {context
                ? "Hey! We can work through this together. Want a hint, an explanation, or to ask a question?"
                : "Ready for another adventure? Start a mission and I'll help with each challenge."}
            </p>
            {messages.map((message, index) => (
              <p className={`pip-chat ${message.who}`} key={index}>
                <small>{message.who === "pip" ? "PIP" : "YOU"}</small>
                {message.text}
              </p>
            ))}
            {busy && <p className="pip-chat pip">Thinking…</p>}
          </div>
          {context && (
            <>
              <div className="pip-help-hints">
                <button type="button" disabled={busy} onClick={() => hint()}>
                  Give me a hint
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => hint(true)}
                >
                  Explain the idea
                </button>
              </div>
              <form onSubmit={ask} className="pip-help-form">
                <label className="sr-only" htmlFor="pip-question">
                  Your question for Pip
                </label>
                <input
                  ref={input}
                  id="pip-question"
                  value={question}
                  maxLength={600}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask about this challenge…"
                  disabled={busy}
                />
                <button
                  type="submit"
                  disabled={busy || !question.trim()}
                  aria-label="Send question to Pip"
                >
                  ↑
                </button>
              </form>
              <p className="pip-help-privacy">
                Live questions go to Gemini. Keep personal details out.
              </p>
            </>
          )}
          <div className="pip-settings">
            <label>
              Voice{" "}
              <select
                aria-label="Pip voice"
                value={audio.voice}
                onChange={(event) =>
                  audio.chooseVoice(event.target.value as PipVoice)
                }
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
            <button
              type="button"
              onClick={audio.toggleMute}
              aria-pressed={audio.muted}
            >
              {audio.muted ? "Sound off" : "Sound on"}
            </button>
            <button type="button" onClick={() => void audio.hear()}>
              Hear Pip
            </button>
          </div>
          {audio.audioError && (
            <p className="pip-audio-note" role="status">
              {audio.audioError}
            </p>
          )}
        </section>
      )}
      <button
        ref={launcher}
        className="pip-launcher"
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close Pip help" : "Ask Pip for help"}
        onClick={() => (open ? close() : setOpen(true))}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        <span className="pip-mini">
          <Suspense fallback={<PipLoadingAvatar />}>
            <PipAvatar wave={open || hover || celebrating} />
          </Suspense>
        </span>
        <span className="pip-launcher-label">
          {celebrating ? "You did it!" : "Ask Pip"}
        </span>
      </button>
    </aside>
  )
}
