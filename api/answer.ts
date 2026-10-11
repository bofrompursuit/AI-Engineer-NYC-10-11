import { recordAnswer } from "../src/server/db.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const { id, selectedIndex, isCorrect } = req.body ?? {};
    if (typeof id !== "number" || typeof selectedIndex !== "number") {
      res.status(400).json({ error: "Missing id or selectedIndex" });
      return;
    }
    await recordAnswer(id, selectedIndex, Boolean(isCorrect));
    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
}
