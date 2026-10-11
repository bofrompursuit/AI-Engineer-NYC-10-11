import { useCallback, useEffect, useRef, useState } from "react"

export type PipVoice = "male" | "female"
export const greeting =
  "Hey, I'm Pip! Ready to learn something new? Pick an adventure. I'll be right here if you need a hand. Let's go!"

function saved(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* Preferences are optional. */
  }
}

export default function usePipVoice() {
  const [voice, setVoice] = useState<PipVoice>(() =>
    saved("pip-voice") === "female" ? "female" : "male",
  )
  const [muted, setMuted] = useState(() => saved("pip-muted") === "true")
  const [playing, setPlaying] = useState(false)
  const [audioError, setAudioError] = useState("")
  const audio = useRef<HTMLAudioElement | null>(null)

  const stop = useCallback(() => {
    if (audio.current) {
      audio.current.onended = null
      audio.current.onerror = null
      audio.current.pause()
      audio.current = null
    }
    setPlaying(false)
  }, [])
  const play = (selected = voice, force = false) => {
    stop()
    setAudioError("")
    if (muted && !force) return
    const clip = new Audio(`/audio/pip-welcome-${selected}.mp3`)
    audio.current = clip
    clip.onended = () => {
      if (audio.current === clip) setPlaying(false)
    }
    clip.onerror = () => {
      if (audio.current === clip) {
        setPlaying(false)
        setAudioError(
          "Pip's audio couldn't play. You can still choose an adventure.",
        )
      }
    }
    // Called directly by the join/enter button so browsers can permit sound.
    void clip
      .play()
      .then(() => {
        if (audio.current === clip) setPlaying(true)
      })
      .catch(() => {
        if (audio.current === clip) {
          setPlaying(false)
          setAudioError("Tap Hear Pip to play the greeting.")
        }
      })
  }
  const chooseVoice = (next: PipVoice) => {
    stop()
    setVoice(next)
    save("pip-voice", next)
  }
  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    save("pip-muted", String(next))
    if (next) stop()
  }
  const hear = () => {
    setMuted(false)
    save("pip-muted", "false")
    play(voice, true)
  }
  useEffect(
    () => () => {
      audio.current?.pause()
      audio.current = null
    },
    [],
  )
  return {
    voice,
    muted,
    playing,
    audioError,
    play,
    hear,
    stop,
    chooseVoice,
    toggleMute,
  }
}
export type PipAudio = ReturnType<typeof usePipVoice>
