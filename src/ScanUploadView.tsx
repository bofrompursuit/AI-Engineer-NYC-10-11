import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import AnnotatedImage from "./AnnotatedImage";
import { prepareScanImage, requestScan, type ScanResult } from "./scanUpload";
import { PeachesLoadingAvatar } from "./PeachesPoster";
import type { PeachesMood } from "./peachesBehavior";
import { scanGreeting, type PeachesAudio } from "./usePeachesVoice";

const PeachesAvatar = lazy(() => import("./PeachesAvatar"));
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

export default function ScanUploadView({ onViewGallery, audio: speech, onPeachesContext }: { onViewGallery: () => void; audio: PeachesAudio; onPeachesContext: (text: string) => void }) {
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
    if (speech.liveSession) greetingHandled.current = true;
  }, [speech.liveSession]);

  useEffect(() => {
    if (!result) {
      onPeachesContext("Choose a photo to make a learning challenge. No photo is shared with Peaches' conversation.");
      return;
    }
    const answer = selected === null ? "The learner has not answered yet. Guide with hints, without revealing the answer."
      : selected === result.correctIndex ? `The learner answered correctly. Explanation: ${result.explanation}`
      : `The learner answered incorrectly. The page showed this explanation: ${result.explanation}`;
    onPeachesContext(`Scan result: ${result.subject}, ${result.concept}. ${result.description}. Question: ${result.question}. ${answer}`.slice(0, 1000));
  }, [result, selected, onPeachesContext]);

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

  const mood: PeachesMood = mascotState === "happy" ? "correct" : mascotState === "encouraging" ? "retry"
    : speech.playing ? "speaking" : status === "loading" ? "thinking" : "idle";

  const dialogue = status === "loading" ? loadingText : status === "error"
    ? "Let's try another photo. I'm here to help."
    : selected !== null && result
      ? selected === result.correctIndex ? result.peachesLine : "Not quite — let's figure this out together. Here's the answer."
      : result ? "What do you think? Pick an answer, and we'll explore it together." : scanGreeting;

  const hearPeaches = () => {
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
      setLoadingText("Peaches is looking closely… This can take a little while.");
      timeout = window.setTimeout(() => controller.abort("timeout"), 90_000);
      const json = await requestScan(data, mimeType, controller.signal);
      if (controller.signal.aborted) return;
      setResult(json);
      setStatus("result");
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout") return;
      setErrorMsg(controller.signal.reason === "timeout"
        ? "This scan took too long. Please try again with a clear, closer photo."
        : error instanceof TypeError ? "The connection to Peaches was interrupted. Check your internet connection and try again."
        : error instanceof Error ? error.message : "Peaches couldn't scan this photo. Please try again.");
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
        <div className="scan-placeholder scan-peaches-guide">
          <div className="scan-peaches-portrait">
            <Suspense fallback={<PeachesLoadingAvatar />}>
              <PeachesAvatar wave={status === "idle" && speech.playing} mood={mood} reactionSerial={reactionSerial} getLevel={speech.getLevel} onReady={avatarSettled} />
            </Suspense>
          </div>
          <div className="scan-peaches-copy">
            <div className="scan-peaches-heading">
              <small>Peaches / YOUR LEARNING GUIDE</small>
              <strong>{mascotState === "happy" ? "You got it!" : mascotState === "encouraging" ? "Let's work it out." : "Hi, I'm Peaches!"}</strong>
            </div>
            <p aria-live="polite">{dialogue}</p>
            {status === "idle" && (
              <div>
                <button className="btn btn-primary peaches-scan-btn" type="button" onClick={() => fileInputRef.current?.click()}>Scan something</button>
              </div>
            )}
            {status === "loading" && <span className="peaches-spinner" aria-label="Analyzing your photo" role="status" />}
            {status === "error" && (
              <>
                <p className="peaches-error" role="alert">{errorMsg}</p>
                <div>
                  <button className="btn btn-outline peaches-scan-btn" type="button" onClick={() => fileInputRef.current?.click()}>Try another photo</button>
                </div>
              </>
            )}
            <div className="scan-peaches-controls">
              {status === "idle" && <button type="button" className="btn btn-outline" disabled={speech.liveSession} onClick={() => speech.playing || speech.pending ? speech.stop() : hearPeaches()}>{speech.playing ? "Stop speaking" : speech.pending ? "Cancel speech" : "Hear Peaches"}</button>}
              <button type="button" className="btn btn-outline" aria-pressed={!speech.muted} onClick={() => { if (speech.muted && status === "idle") hearPeaches(); else speech.toggleMute(); }}>Sound {speech.muted ? "off" : "on"}</button>
            </div>
            {speech.audioError && status === "idle" && <p className="scan-peaches-audio-note" role="status">{speech.audioError}</p>}
          </div>
        </div>

        {status === "result" && result && imageDataUrl && (
          <>
            <AnnotatedImage src={imageDataUrl} detections={result.detections} />
            <span className="peaches-subject-tag">{result.subject}</span>
            <p className="peaches-concept">{result.concept}</p>
            <p className="peaches-description">{result.description}</p>
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
                      showState && isCorrect ? "selected" : showState && isSelected && !isCorrect ? "peaches-wrong" : ""
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
                <div className={`peaches-feedback ${selected === result.correctIndex ? "peaches-feedback-correct" : "peaches-feedback-wrong"}`}>
                  {selected === result.correctIndex ? result.peachesLine : "Not quite — here's the answer:"}
                </div>
                <div className="peaches-explanation">
                  <small>CORRECT ANSWER: {String.fromCharCode(65 + result.correctIndex)}. {result.choices[result.correctIndex]}</small>
                  <p>{result.explanation}</p>
                </div>

                {result.articles.length > 0 && (
                  <div className="peaches-articles">
                    <small>READ MORE</small>
                    {result.articles.map((article) => (
                      <a key={article.url || article.title} href={article.url} target="_blank" rel="noreferrer" className="peaches-article">
                        <strong>{article.title}</strong>
                        {article.snippet && <span>{article.snippet}</span>}
                      </a>
                    ))}
                  </div>
                )}

                <div className="scan-done-actions">
                  <button className="btn btn-outline peaches-scan-btn" type="button" onClick={() => fileInputRef.current?.click()}>
                    Scan something else
                  </button>
                  <button className="btn btn-primary peaches-scan-btn" type="button" onClick={onViewGallery}>
                    View in gallery →
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {!result && <p className="peaches-description">Your question, answer choices, and the correct explanation will appear here once you scan something.</p>}
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
