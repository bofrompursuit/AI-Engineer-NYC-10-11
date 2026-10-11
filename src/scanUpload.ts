export interface ScanResult {
  id?: number | string;
  subject: "physics" | "calculus" | "biopharma" | "general";
  concept: string;
  description: string;
  detections: { label: string; box_2d: [number, number, number, number] }[];
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  pipLine: string;
  articles: { title: string; url: string; snippet: string }[];
}

const maxImageBytes = 1_500_000;
const maxFileBytes = 25_000_000;
const maxDimension = 1600;

export async function prepareScanImage(file: File) {
  if (file.size > maxFileBytes) throw new Error("Choose a photo smaller than 25 MB.");
  if (file.type && !file.type.startsWith("image/")) throw new Error("Choose an image file, such as JPG, PNG, or WebP.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    try { await image.decode(); }
    catch { throw new Error("This image couldn't open. Try a JPG, PNG, or WebP photo."); }
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser couldn't prepare this photo. Try another browser.");
    let scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    for (let attempt = 0; attempt < 4; attempt++) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      const data = dataUrl.split(",", 2)[1];
      // Base64 adds about one third to the size. Leave ample room under the API limit.
      if (data && data.length <= Math.ceil(maxImageBytes / 3) * 4) {
        return { data, mimeType: "image/jpeg", dataUrl };
      }
      scale *= 0.75;
    }
    throw new Error("This photo is still too large. Try a closer crop or a smaller image.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function isScanResult(value: unknown): value is ScanResult {
  if (!value || typeof value !== "object") return false;
  const result = value as ScanResult;
  return ["physics", "calculus", "biopharma", "general"].includes(result.subject)
    && [result.concept, result.description, result.question, result.explanation, result.pipLine].every((text) => typeof text === "string")
    && Array.isArray(result.choices) && result.choices.length === 4 && result.choices.every((choice) => typeof choice === "string")
    && Number.isInteger(result.correctIndex) && result.correctIndex >= 0 && result.correctIndex < 4
    && Array.isArray(result.detections) && result.detections.every((d) => d && typeof d.label === "string"
      && Array.isArray(d.box_2d) && d.box_2d.length === 4 && d.box_2d.every(Number.isFinite))
    && Array.isArray(result.articles) && result.articles.every((a) => a
      && [a.title, a.url, a.snippet].every((text) => typeof text === "string"));
}

export async function requestScan(image: string, mimeType: string, signal: AbortSignal): Promise<ScanResult> {
  const response = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, mimeType }),
    signal,
  });
  if (response.status === 413) throw new Error("This photo is too large to scan. Try a smaller image or a closer crop.");
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body && typeof body.error === "string" ? body.error : `Pip couldn't finish this scan (error ${response.status}). Please try again.`);
  }
  const result: unknown = await response.json().catch(() => null);
  if (!isScanResult(result)) throw new Error("Pip couldn't read the scan result. Please try again with a clear photo.");
  return result;
}
