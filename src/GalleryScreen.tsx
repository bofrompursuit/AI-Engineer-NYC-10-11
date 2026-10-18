import { useEffect, useState } from "react";

interface HistoryRow {
  id: number;
  scannedAt: string;
  subject: string;
  concept: string;
  imageBase64: string;
  mimeType: string;
  question: string;
  selectedIndex: number | null;
  isCorrect: boolean | null;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function GalleryScreen({ refreshKey }: { refreshKey?: number }) {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then(setRows)
      .catch((e) => setError(String(e)));
  }, [refreshKey]);

  const answered = rows?.filter((r) => r.selectedIndex !== null) ?? [];
  const correctCount = answered.filter((r) => r.isCorrect).length;

  return (
    <>
      {rows && rows.length > 0 && (
        <section className="kpi-grid">
          <div><small>TOTAL SCANS</small><strong>{rows.length}</strong></div>
          <div><small>ANSWERED</small><strong>{answered.length}</strong></div>
          <div><small>CORRECT</small><strong>{correctCount}</strong></div>
          <div><small>ACCURACY</small><strong>{answered.length ? Math.round((correctCount / answered.length) * 100) : 0}<em>%</em></strong></div>
        </section>
      )}

      {error && <p className="peaches-error">Couldn't load history: {error}</p>}
      {rows && rows.length === 0 && <p style={{ color: "var(--muted)" }}>No scans yet — switch to Upload and scan something first.</p>}

      {rows && rows.length > 0 && (
        <section className="gallery-grid">
          {rows.map((row) => (
            <article className="gallery-card" key={row.id}>
              <img src={`data:${row.mimeType};base64,${row.imageBase64}`} alt={row.concept} />
              <div className="gallery-card-body">
                <span className="peaches-subject-tag">{row.subject}</span>
                <strong>{row.concept}</strong>
                <p>{row.question}</p>
                <div className="gallery-card-foot">
                  <span>{timeAgo(row.scannedAt)}</span>
                  {row.selectedIndex === null ? (
                    <span className="gallery-badge gallery-badge-pending">Unanswered</span>
                  ) : row.isCorrect ? (
                    <span className="gallery-badge gallery-badge-correct">Correct</span>
                  ) : (
                    <span className="gallery-badge gallery-badge-wrong">Missed</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
