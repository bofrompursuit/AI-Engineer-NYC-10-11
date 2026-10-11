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

/** Reads the EXIF orientation and the stored (unrotated) pixel size from a JPEG header. */
export function readJpegOrientation(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = view.byteLength;
  if (size < 4 || view.getUint16(0) !== 0xffd8) return null;
  let orientation = 1;
  for (let offset = 2; offset + 4 <= size && view.getUint8(offset) === 0xff;) {
    const marker = view.getUint8(offset + 1);
    const start = offset + 4;
    if (marker === 0xda) break;
    if (marker === 0xe1 && start + 14 <= size && view.getUint32(start) === 0x45786966 && view.getUint16(start + 4) === 0) {
      const tiff = start + 6;
      const little = view.getUint16(tiff) === 0x4949;
      const directory = tiff + view.getUint32(tiff + 4, little);
      const count = directory + 2 <= size ? view.getUint16(directory, little) : 0;
      for (let entry = directory + 2; entry + 12 <= size && entry < directory + 2 + count * 12; entry += 12) {
        if (view.getUint16(entry, little) === 0x0112) orientation = view.getUint16(entry + 8, little);
      }
    } else if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker) && start + 5 <= size) {
      return { orientation, width: view.getUint16(start + 3), height: view.getUint16(start + 1) };
    }
    offset += 2 + view.getUint16(offset + 2);
  }
  return null;
}

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
    // Phone cameras store portrait photos sideways and mark them with an EXIF orientation.
    // Most browsers turn them upright when drawing. Where the decoded size still matches the
    // stored size, the browser has not, so turn the photo here.
    const stored = await file.slice(0, 512_000).arrayBuffer()
      .then((buffer) => readJpegOrientation(new Uint8Array(buffer))).catch(() => null);
    const sideways = !!stored && stored.orientation >= 5 && stored.orientation <= 8 && stored.width !== stored.height
      && image.naturalWidth === stored.width && image.naturalHeight === stored.height;
    const width = sideways ? image.naturalHeight : image.naturalWidth;
    const height = sideways ? image.naturalWidth : image.naturalHeight;
    let scale = Math.min(1, maxDimension / Math.max(width, height));
    for (let attempt = 0; attempt < 4; attempt++) {
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (sideways && stored) {
        // The photo is drawn canvas.height wide and canvas.width tall, then turned.
        const [a, b, c, d, e, f] = ({
          5: [0, 1, 1, 0, 0, 0],
          6: [0, 1, -1, 0, canvas.width, 0],
          7: [0, -1, -1, 0, canvas.width, canvas.height],
          8: [0, -1, 1, 0, 0, canvas.height],
        } as Record<number, number[]>)[stored.orientation];
        context.setTransform(a, b, c, d, e, f);
        context.drawImage(image, 0, 0, canvas.height, canvas.width);
        context.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      }
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
