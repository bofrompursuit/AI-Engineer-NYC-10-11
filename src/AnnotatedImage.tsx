import { useEffect, useRef } from "react";

interface Detection {
  label: string;
  box_2d: [number, number, number, number];
}

export default function AnnotatedImage({ src, detections }: { src: string; detections: Detection[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      const lineWidth = Math.max(2, Math.round(img.naturalWidth / 220));
      const fontSize = Math.max(14, Math.round(img.naturalWidth / 40));
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = "#39e7bd";
      ctx.font = `700 ${fontSize}px "DM Mono", monospace`;
      ctx.textBaseline = "bottom";

      detections.forEach((d, i) => {
        const [ymin, xmin, ymax, xmax] = d.box_2d;
        const x = (xmin / 1000) * img.naturalWidth;
        const y = (ymin / 1000) * img.naturalHeight;
        const w = ((xmax - xmin) / 1000) * img.naturalWidth;
        const h = ((ymax - ymin) / 1000) * img.naturalHeight;

        ctx.strokeRect(x, y, w, h);

        const label = `${i + 1}. ${d.label}`;
        const padding = 4;
        const textWidth = ctx.measureText(label).width;
        const labelY = Math.max(y, fontSize + padding * 2);

        ctx.fillStyle = "#39e7bd";
        ctx.fillRect(x, labelY - fontSize - padding * 2, textWidth + padding * 2, fontSize + padding * 2);
        ctx.fillStyle = "#04120f";
        ctx.fillText(label, x + padding, labelY - padding);
      });
    };
    img.src = src;
  }, [src, detections]);

  return <canvas ref={canvasRef} className="peaches-annotated-canvas" />;
}
