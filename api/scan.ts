// Vercel serverless function (Node runtime) — production equivalent of the
// local-dev middleware registered in vite.config.ts. Same shared handler.
import { runScan } from "../src/server/scanHandler.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const { image, mimeType } = req.body ?? {};
    if (!image || !mimeType) {
      res.status(400).json({ error: "Missing image or mimeType" });
      return;
    }
    const result = await runScan(image, mimeType);
    res.status(200).json(result);
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
}
