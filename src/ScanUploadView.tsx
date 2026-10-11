import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import AnnotatedImage from "./AnnotatedImage";
import { prepareScanImage, requestScan, type ScanResult } from "./scanUpload";
import { PipLoadingAvatar } from "./PipPoster";
import type { PipMood } from "./pipBehavior";
import { scanGreeting, type PipAudio } from "./usePipVoice";

const PipAvatar = lazy(() => import("./PipAvatar"));
type ScanMascotState = "welcome" | "happy" | "encouraging";

type Status = "idle" | "loading" | "result" | "error";

function celebrate() {
  const rocket = confetti.shapeFromText({ text: "🚀", scalar: 2 });
  confetti({
    particleCount: 70,
    spread: 80,
    origin: { y: 0.7 },
    colors: ["#39e7bd", "#ff7a3d", "#5b8dff", "#bafbe8"],
  });
  confetti({
    particleCount: 10,
    spread: 60,
    startVelocity: 55,
    origin: { y: 0.75 },
    shapes: [rocket],
    scalar: 2,
  });
}

export default function ScanUploadView({ onViewGallery, audio: speech }: { onViewGallery: () => void; audio: PipAudio }) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingText, setLoadingText] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const [mascotState, setMascotState] = useState<ScanMascotState>("welcome");
  const [reactionSerial, setReactionSerial] = useState(0);
  const [avatarReady, setAvatarReady] = useState(false);
  const avatarSettled = useCallback(() => setAvatarReady(true), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const greetingHandled = useRef(false);

  useEffect(() => {
    if (!avatarReady) return;
    const timer = window.setTimeout(() => {
      if (greetingHandled.current) return;
      greetingHandled.current = true;
      void speech.play(speech.voice, false, "scan");
    }, 300);
    return () => clearTimeout(timer);
  }, [avatarReady, speech.play, speech.voice]);

  useEffect(() => speech.stop, [speech.stop]);

  const mood: PipMood = mascotState === "happy" ? "correct" : mascotState === "encouraging" ? "retry"
    : speech.playing ? "speaking" : status === "loading" ? "thinking" : "idle";

  const dialogue = status === "loading" ? loadingText : status === "error"
    ? "Let's try another photo. I'm here to help."
    : selected !== null && result
      ? selected === result.correctIndex ? result.pipLine : "Not quite — let's figure this out together. Here's the answer."
      : result ? "What do you think? Pick an answer, and we'll explore it together." : scanGreeting;

  const hearPip = () => {
    greetingHandled.current = true;
    speech.prepare("scan");
    void speech.hear(speech.voice, "scan");
  };

  const handleFile = async (file: File) => {
    greetingHandled.current = true;
    speech.stop();
    setMascotState("welcome");
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    let timeout = 0;
    setResult(null);
    setSelected(null);
    setImageDataUrl(null);
    setErrorMsg("");
    setLoadingText("Preparing your photo…");
    setStatus("loading");
    try {
      const { data, mimeType, dataUrl } = await prepareScanImage(file);
      if (controller.signal.aborted) return;
      setImageDataUrl(dataUrl);
      setLoadingText("Pip is looking closely… This can take a little while.");
      timeout = window.setTimeout(() => controller.abort("timeout"), 90_000);
      const json = await requestScan(data, mimeType, controller.signal);
      if (controller.signal.aborted) return;
      setResult(json);
      setStatus("result");
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout") return;
      setErrorMsg(controller.signal.reason === "timeout"
        ? "This scan took too long. Please try again with a clear, closer photo."
        : error instanceof TypeError ? "The connection to Pip was interrupted. Check your internet connection and try again."
        : error instanceof Error ? error.message : "Pip couldn't scan this photo. Please try again.");
      setStatus("error");
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) request.current = null;
    }
  };

  const pickChoice = (index: number) => {
    if (selected !== null || !result) return;
    setSelected(index);
    const isCorrect = index === result.correctIndex;
    setMascotState(isCorrect ? "happy" : "encouraging");
    setReactionSerial((serial) => serial + 1);
    speech.stop();
    if (isCorrect) celebrate();
    if (result.id != null) {
      fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: result.id, selectedIndex: index, isCorrect }),
      }).catch(() => {});
    }
  };

  return (
    <section className="case-layout scan-upload">
      <div className="scan-stage">
        <div className="scan-placeholder scan-pip-guide">
          <div className="scan-pip-portrait">
            <Suspense fallback={<PipLoadingAvatar />}>
              <PipAvatar wave={status === "idle" && speech.playing} mood={mood} reactionSerial={reactionSerial} getLevel={speech.getLevel} onReady={avatarSettled} />
            </Suspense>
          </div>
          <div className="scan-pip-copy">
            <div className="scan-pip-heading">
              <small>PIP / YOUR LEARNING GUIDE</small>
              <strong>{mascotState === "happy" ? "You got it!" : mascotState === "encouraging" ? "Let's work it out." : "Hi, I'm PIP!"}</strong>
            </div>
            <p aria-live="polite">{dialogue}</p>
            {status === "idle" && (
              <div>
                <button className="btn btn-primary pip-scan-btn" type="button" onClick={() => fileInputRef.current?.click()}>Scan something</button>
              </div>
            )}
            {status === "loading" && <span className="pip-spinner" aria-label="Analyzing your photo" role="status" />}
            {status === "error" && (
              <>
                <p className="pip-error" role="alert">{errorMsg}</p>
                <div>
                  <button className="btn btn-outline pip-scan-btn" type="button" onClick={() => fileInputRef.current?.click()}>Try another photo</button>
                </div>
              </>
            )}
            <div className="scan-pip-controls">
              {status === "idle" && <button type="button" className="btn btn-outline" onClick={() => speech.playing || speech.pending ? speech.stop() : hearPip()}>{speech.playing ? "Stop speaking" : speech.pending ? "Cancel speech" : "Hear PIP"}</button>}
              <button type="button" className="btn btn-outline" aria-pressed={!speech.muted} onClick={() => { if (speech.muted && status === "idle") hearPip(); else speech.toggleMute(); }}>Sound {speech.muted ? "off" : "on"}</button>
            </div>
            {speech.audioError && status === "idle" && <p className="scan-pip-audio-note" role="status">{speech.audioError}</p>}
          </div>
        </div>

        {status === "result" && result && imageDataUrl && (
          <>
            <AnnotatedImage src={imageDataUrl} detections={result.detections} />
            <span className="pip-subject-tag">{result.subject}</span>
            <p className="pip-concept">{result.concept}</p>
            <p className="pip-description">{result.description}</p>
          </>
        )}
      </div>

      <aside className="mission-panel">
        <div className="mission-status">
          <small>YOUR CHALLENGE</small>
          <strong>{result ? result.question : "Scan to generate a question"}</strong>
        </div>

        {result && (
          <>
            <div className="sequence-options">
              {result.choices.map((choice, i) => {
                const isSelected = selected === i;
                const isCorrect = i === result.correctIndex;
                const showState = selected !== null;
                return (
                  <button
                    key={choice}
                    type="button"
                    className={
                      showState && isCorrect ? "selected" : showState && isSelected && !isCorrect ? "pip-wrong" : ""
                    }
                    onClick={() => pickChoice(i)}
                  >
                    <span>{String.fromCharCode(65 + i)}</span>
                    {choice}
                  </button>
                );
              })}
            </div>

            {selected !== null && (
              <>
                <div className={`pip-feedback ${selected === result.correctIndex ? "pip-feedback-correct" : "pip-feedback-wrong"}`}>
                  {selected === result.correctIndex ? result.pipLine : "Not quite — here's the answer:"}
                </div>
                <div className="pip-explanation">
                  <small>CORRECT ANSWER: {String.fromCharCode(65 + result.correctIndex)}. {result.choices[result.correctIndex]}</small>
                  <p>{result.explanation}</p>
                </div>

                {result.articles.length > 0 && (
                  <div className="pip-articles">
                    <small>READ MORE</small>
                    {result.articles.map((article) => (
                      <a key={article.url || article.title} href={article.url} target="_blank" rel="noreferrer" className="pip-article">
                        <strong>{article.title}</strong>
                        {article.snippet && <span>{article.snippet}</span>}
                      </a>
                    ))}
                  </div>
                )}

                <div className="scan-done-actions">
                  <button className="btn btn-outline pip-scan-btn" type="button" onClick={() => fileInputRef.current?.click()}>
                    Scan something else
                  </button>
                  <button className="btn btn-primary pip-scan-btn" type="button" onClick={onViewGallery}>
                    View in gallery →
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {!result && <p className="pip-description">Your question, answer choices, and the correct explanation will appear here once you scan something.</p>}
      </aside>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </section>
  );
}
