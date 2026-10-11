const recent = new Map()

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store")
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }
  const origin = req.headers.origin
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host)
        return res.status(403).json({ error: "Open Pip from this site" })
    } catch {
      return res.status(403).json({ error: "Invalid origin" })
    }
  }
  let body = req.body
  if (typeof body === "string") {
    if (body.length > 1000) return res.status(400).json({ error: "Invalid request" })
    try { body = JSON.parse(body) }
    catch { return res.status(400).json({ error: "Invalid request" }) }
  }
  const mode = body?.mode
  if (mode !== "voice")
    return res.status(400).json({ error: "Choose voice" })

  const key = process.env.ELEVENLABS_API_KEY
  const agentId = process.env.ELEVENLABS_AGENT_ID
  if (!key || !agentId || !/^agent_[a-zA-Z0-9]+$/.test(agentId) || process.env.PIP_AGENT_ENABLED === "false")
    return res.status(503).json({ error: "Pip's live conversation is not configured" })

  const now = Date.now()
  for (const [address, times] of recent)
    if (times.every((time) => now - time >= 60000)) recent.delete(address)
  const address = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim()
  const times = (recent.get(address) || []).filter((time) => now - time < 60000)
  if (times.length >= 6 || (recent.size >= 500 && !recent.has(address)))
    return res.status(429).json({ error: "Please wait before starting another conversation" })
  times.push(now)
  recent.set(address, times)

  const url = `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`
  try {
    const response = await fetch(url, {
      headers: { "xi-api-key": key },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return res.status(502).json({ error: "Pip could not start a conversation" })
    const data = await response.json()
    if (typeof data.token === "string" && data.token)
      return res.status(200).json({ conversationToken: data.token })
    return res.status(502).json({ error: "Pip could not start a conversation" })
  } catch {
    return res.status(502).json({ error: "Pip could not start a conversation" })
  }
}
