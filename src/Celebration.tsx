import { useEffect, type CSSProperties } from "react"
export default function Celebration({
  kind,
  onDone,
}: {
  kind: "answer" | "complete"
  onDone: () => void
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, kind === "complete" ? 2800 : 1400)
    return () => clearTimeout(timer)
  }, [kind, onDone])
  return (
    <div className={`celebration celebration-${kind}`} aria-hidden="true">
      {Array.from({ length: kind === "complete" ? 42 : 16 }, (_, index) => (
        <i
          className="confetti"
          key={index}
          style={
            {
              "--x": `${(index * 37) % 100}%`,
              "--delay": `${(index % 7) * 0.045}s`,
              "--turn": `${index * 83}deg`,
              "--drift": `${((index * 17) % 200) - 100}px`,
              "--color": [
                "var(--mint)",
                "var(--blue)",
                "var(--orange)",
                "var(--ink)",
              ][index % 4],
            } as CSSProperties
          }
        />
      ))}
      {kind === "complete" &&
        [0, 1, 2].map((index) => (
          <div className={`launch-rocket rocket-${index}`} key={index}>
            <svg viewBox="0 0 40 90">
              <path d="M12 50 4 72h11m13-22 8 22H25" fill="#3b6cff" />
              <path
                d="M20 2C8 18 10 39 12 63h16c2-24 4-45-8-61"
                fill="#e8ebf1"
              />
              <circle cx="20" cy="30" r="6" fill="#3b6cff" />
              <path d="m13 66 7 23 7-23" fill="#f5a524" />
              <path d="m17 66 3 14 3-14" fill="#ffe0a3" />
            </svg>
          </div>
        ))}
    </div>
  )
}
