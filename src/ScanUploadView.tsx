import { useRef, useState } from "react";
import confetti from "canvas-confetti";
import AnnotatedImage from "./AnnotatedImage";

interface Detection {
  label: string;
  box_2d: [number, number, number, number];
}

interface Article {
  title: string;
  url: string;
  snippet: string;
}

interface ScanResult {
  id?: number;
  subject: "physics" | "calculus" | "biopharma" | "general";
  concept: string;
  description: string;
  detections: Detection[];
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  pipLine: string;
  articles: Article[];
}

type Status = "idle" | "loading" | "result" | "error";

function fileToBase64(file: File): Promise<{ data: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [, base64] = dataUrl.split(",", 2);
      resolve({ data: base64, mimeType: file.type || "image/jpeg", dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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

export default function ScanUploadView({ onViewGallery }: { onViewGallery: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setStatus("loading");
    try {
      const { data, mimeType, dataUrl } = await fileToBase64(file);
      setImageDataUrl(dataUrl);
      const resp = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: data, mimeType }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${resp.status})`);
      }
      const json = (await resp.json()) as ScanResult;
      setResult(json);
      setSelected(null);
      setStatus("result");
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
      setStatus("error");
    }
  };

  const pickChoice = (index: number) => {
    if (selected !== null || !result) return;
    setSelected(index);
    const isCorrect = index === result.correctIndex;
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
    <section className="case-layout">
      <div className="scan-stage">
        {status === "idle" && (
          <div className="scan-placeholder">
            <span className="pip-avatar-sm" aria-hidden="true">✦</span>
            <p>Hi, I'm PIP! Point your camera at anything you're curious about — a sign, a gadget, a plant, a formula on a whiteboard — and I'll turn it into a quick challenge.</p>
            <button className="btn btn-primary pip-scan-btn" type="button" onClick={() => fileInputRef.current?.click()}>
              Scan something
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="scan-placeholder pip-loading">
            <span className="pip-spinner" aria-hidden="true" />
            <p>Looking closely...</p>
          </div>
        )}

        {status === "error" && (
          <div className="scan-placeholder">
            <p className="pip-error">Hmm, I couldn't quite make that out: {errorMsg}</p>
            <button className="btn btn-outline pip-scan-btn" type="button" onClick={() => fileInputRef.current?.click()}>
              Try another photo
            </button>
          </div>
        )}

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
          <small>PIP / YOUR LEARNING GUIDE</small>
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
