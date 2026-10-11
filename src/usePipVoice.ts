import { useCallback, useEffect, useRef, useState } from "react"

export type PipVoice = "male" | "female"
export const greeting = "Hey, I'm Pip! Ready to learn something new? Pick an adventure. I'll be right here if you need a hand. Let's go!"
function saved(key: string) { try { return localStorage.getItem(key) } catch { return null } }
function save(key: string, value: string) { try { localStorage.setItem(key, value) } catch { /* Preferences are optional. */ } }

// Two decoded clips and one audio context are shared for the page's lifetime.
let speechContext: AudioContext | undefined
const clips = new Map<PipVoice, Promise<AudioBuffer>>()
function context() {
  if (!speechContext || speechContext.state === "closed") {
    speechContext = new AudioContext()
    clips.clear()
  }
  return speechContext
}
function loadClip(voice: PipVoice) {
  let loaded = clips.get(voice)
  if (!loaded) {
    const engine = context()
    loaded = fetch(`/audio/pip-welcome-${voice}.mp3`, { signal: AbortSignal.timeout(12000) })
      .then((response) => { if (!response.ok) throw new Error("Audio unavailable"); return response.arrayBuffer() })
      .then((bytes) => engine.decodeAudioData(bytes))
      .catch((error) => { clips.delete(voice); throw error })
    clips.set(voice, loaded)
  }
  return loaded
}

export default function usePipVoice() {
  const [voice, setVoice] = useState<PipVoice>(() => saved("pip-voice") === "female" ? "female" : "male")
  const [muted, setMuted] = useState(() => saved("pip-muted") === "true")
  const [playing, setPlaying] = useState(false)
  const [audioError, setAudioError] = useState("")
  const source = useRef<AudioBufferSourceNode | null>(null)
  const meter = useRef<{ node: AnalyserNode; samples: Float32Array<ArrayBuffer> } | null>(null)
  const request = useRef(0)
  const disconnectMeter = useCallback(() => {
    meter.current?.node.disconnect()
    meter.current = null
  }, [])
  const getLevel = useCallback(() => {
    if (!meter.current) return 0
    const { node, samples } = meter.current
    node.getFloatTimeDomainData(samples)
    let energy = 0
    for (const sample of samples) energy += sample * sample
    const rms = Math.sqrt(energy / samples.length)
    return Math.min(1, Math.max(0, (rms - 0.008) * 5))
  }, [])
  const stop = useCallback(() => {
    request.current++
    if (source.current) {
      source.current.onended = null
      source.current.stop()
      source.current.disconnect()
      source.current = null
    }
    disconnectMeter()
    setPlaying(false)
  }, [disconnectMeter])
  const preload = useCallback(() => {
    try { void Promise.allSettled([loadClip("male"), loadClip("female")]) }
    catch { /* Hear Pip can retry when audio is unavailable. */ }
  }, [])
  const prepare = useCallback(() => {
    // Resume directly from Enter/Hear Pip, then play later when the visual is ready.
    try { void context().resume().catch(() => {}); preload() }
    catch { /* Playback will show a useful error. */ }
  }, [preload])
  const play = useCallback(async (selected = voice, force = false): Promise<number> => {
    stop()
    setAudioError("")
    if (muted && !force) return 0
    const current = request.current
    let timeout = 0
    try {
      const engine = context()
      // This also supports direct Hear Pip/voice-selection gestures.
      const ready = Promise.all([loadClip(selected), engine.resume()])
      const [buffer] = await Promise.race([
        ready,
        new Promise<never>((_, reject) => {
          timeout = window.setTimeout(() => reject(new Error("Audio timed out")), 12000)
        }),
      ])
      if (current !== request.current) return 0
      if (engine.state !== "running") throw new Error("Audio is blocked")
      const clip = engine.createBufferSource()
      clip.buffer = buffer
      const analyser = engine.createAnalyser()
      analyser.fftSize = 256
      clip.connect(analyser)
      analyser.connect(engine.destination)
      meter.current = { node: analyser, samples: new Float32Array(analyser.fftSize) }
      source.current = clip
      clip.onended = () => {
        if (source.current === clip) {
          clip.disconnect()
          source.current = null
          disconnectMeter()
          setPlaying(false)
        }
      }
      clip.start()
      setPlaying(true)
      return buffer.duration
    } catch {
      if (current === request.current) {
        source.current?.disconnect()
        source.current = null
        disconnectMeter()
        setPlaying(false)
        setAudioError("Pip's greeting couldn't play. Tap Hear Pip to try again.")
      }
      return 0
    } finally {
      clearTimeout(timeout)
    }
  }, [voice, muted, stop, disconnectMeter])
  const chooseVoice = (next: PipVoice) => { stop(); setVoice(next); save("pip-voice", next) }
  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    save("pip-muted", String(next))
    if (next) stop()
  }
  const hear = (selected = voice) => {
    setMuted(false)
    save("pip-muted", "false")
    return play(selected, true)
  }
  useEffect(() => () => {
    request.current++
    if (source.current) {
      source.current.onended = null
      source.current.stop()
      source.current.disconnect()
      source.current = null
    }
    disconnectMeter()
  }, [disconnectMeter])
  return { voice, muted, playing, audioError, getLevel, preload, prepare, play, hear, stop, chooseVoice, toggleMute }
}
export type PipAudio = ReturnType<typeof usePipVoice>
