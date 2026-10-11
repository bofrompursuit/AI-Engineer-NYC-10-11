import { useEffect, useRef, useState } from "react";
import PipModel from "./PipModel";

export type PipVoice = "male" | "female";

const voices: { id: PipVoice; label: string; note: string }[] = [
  { id: "male", label: "Male voice", note: "Warm · upbeat · encouraging" },
  { id: "female", label: "Female voice", note: "Bright · kind · encouraging" },
];

export default function PipIntro({ onContinue }: { onContinue: () => void }) {
  const [voice, setVoice] = useState<PipVoice>(() =>
    localStorage.getItem("pip-voice") === "female" ? "female" : "male",
  );
  const [playing, setPlaying] = useState<PipVoice | null>(null);
  const [loading, setLoading] = useState<PipVoice | null>(null);
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const stopAudio = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setLoading(null);
    setPlaying(null);
  };

  useEffect(() => () => {
    requestRef.current?.abort();
    audioRef.current?.pause();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const selectVoice = (next: PipVoice) => {
    stopAudio();
    setVoice(next);
    localStorage.setItem("pip-voice", next);
    setAudioError("");
  };

  const preview = async (selected: PipVoice) => {
    if (playing === selected || loading === selected) {
      stopAudio();
      return;
    }
    stopAudio();
    selectVoice(selected);
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(selected);
    try {
      const response = await fetch("/api/pip-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice: selected }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Voice preview is unavailable right now. You can still continue.");
      const blob = await response.blob();
      if (!blob.type.startsWith("audio/")) throw new Error("Voice preview is unavailable right now. You can still continue.");
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlaying(null); setLoading(null); };
      audio.onerror = () => {
        setAudioError("Voice preview could not play. You can still continue.");
        stopAudio();
      };
      await audio.play();
      setPlaying(selected);
      setLoading(null);
    } catch (error) {
      if (controller.signal.aborted) return;
      setAudioError(error instanceof Error ? error.message : "Voice preview is unavailable right now.");
      setLoading(null);
    }
  };

  const enter = () => {
    stopAudio();
    sessionStorage.setItem("pip-intro-seen", "true");
    localStorage.setItem("pip-voice", voice);
    onContinue();
  };

  return (
    <main className="pip-intro page-enter">
      <div className="pip-intro-top">
        <span className="pip-intro-brand"><span className="pip-intro-mark">✦</span> UNFOLD</span>
        <span className="pip-intro-step">WELCOME / 01</span>
      </div>
      <div className="pip-intro-grid">
        <div className="pip-intro-copy">
          <span className="pip-intro-kicker"><span /> YOUR LEARNING COMPANION</span>
          <h1>Meet Pip<span className="pip-period">.</span></h1>
          <p className="pip-intro-lead">A little help goes a long way. Pip is here to guide you through each mission, one step at a time.</p>
          <div className="pip-quote"><span>“</span>You've got this. Let's figure it out together.</div>
          <fieldset className="pip-voices">
            <legend>CHOOSE PIP'S VOICE</legend>
            {voices.map((option, index) => (
              <div className={`pip-voice ${voice === option.id ? "selected" : ""}`} key={option.id}>
                <label>
                  <input
                    type="radio"
                    name="pip-voice"
                    value={option.id}
                    checked={voice === option.id}
                    onChange={() => selectVoice(option.id)}
                  />
                  <span className="pip-voice-number">0{index + 1}</span>
                  <span className="pip-voice-copy"><strong>{option.label}</strong><small>{option.note}</small></span>
                </label>
                <button type="button" className="pip-voice-preview" onClick={() => preview(option.id)} aria-label={`${playing === option.id ? "Stop" : "Preview"} ${option.label}`}>
                  {loading === option.id ? "…" : playing === option.id ? "■" : "▶"}
                </button>
              </div>
            ))}
          </fieldset>
          {audioError && <p className="pip-audio-error" role="status">{audioError}</p>}
          <button className="pip-enter" type="button" onClick={enter}>ENTER MISSION HUB <span aria-hidden="true">→</span></button>
          <p className="pip-intro-hint">Sound plays only when you press preview.</p>
        </div>
        <div className="pip-stage">
          <div className="pip-stage-ring ring-one" aria-hidden="true" />
          <div className="pip-stage-ring ring-two" aria-hidden="true" />
          <PipModel />
          <span className="pip-stage-tag">PIP / READY TO HELP</span>
          <span className="pip-stage-tip">HOVER TO SAY HELLO ↗</span>
        </div>
      </div>
      <div className="pip-intro-footer"><span>LEARN BY DOING</span><span>YOUR NEXT MISSION IS WAITING</span></div>
    </main>
  );
}
