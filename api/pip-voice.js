const VOICE_IDS = {
  male: "s6pb93K3LygWF3wDe6zf",
  female: "AdWNY9CsbvFfDZr1rOOe",
};

const PREVIEW_TEXT = "Hey, I'm Pip! Let's figure this out together. Take a look at the choices and pick the one that feels right. Yes, that's it—you’re getting the hang of it! If it doesn't work the first time, no worries. We can try another way. I'm right here with you.";
const cache = new Map();
const requests = new Map();

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid request" }); }
  }
  const voice = body?.voice;
  if (voice !== "male" && voice !== "female") {
    return res.status(400).json({ error: "Choose a Pip voice" });
  }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(503).json({ error: "Voice preview is not configured" });

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const recent = (requests.get(ip) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 8) return res.status(429).json({ error: "Please wait before trying again" });
  recent.push(now);
  requests.set(ip, recent);
  if (requests.size > 500) {
    for (const [address, times] of requests) {
      if (times.every((time) => now - time >= 60_000)) requests.delete(address);
    }
  }

  try {
    let audio = cache.get(voice);
    if (!audio) {
      const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_IDS[voice]}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text: PREVIEW_TEXT, model_id: "eleven_multilingual_v2" }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!upstream.ok) throw new Error(`ElevenLabs returned ${upstream.status}`);
      audio = Buffer.from(await upstream.arrayBuffer());
      if (audio.length > 2_000_000) throw new Error("Voice preview was too large");
      cache.set(voice, audio);
    }
    res.setHeader("Content-Type", "audio/mpeg");
    return res.status(200).send(audio);
  } catch (error) {
    console.error("Pip voice preview failed:", error);
    return res.status(502).json({ error: "Voice preview is unavailable" });
  }
}
