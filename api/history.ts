import { fetchHistory } from "../src/server/db";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const rows = await fetchHistory(30);
    res.status(200).json(rows);
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
}
