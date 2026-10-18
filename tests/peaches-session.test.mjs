import test from "node:test"
import assert from "node:assert/strict"
import handler from "../api/peaches-session.js"
import { mockPeachesBudget } from "./peaches-budget-mock.mjs"

let address = 0
async function call(body, headers = {}, method = "POST") {
  const response = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(value) { this.body = value; return this },
  }
  await handler({ method, headers: { host: "unfold.test", "x-forwarded-for": `session-test-${++address}`, ...headers }, body }, response)
  return response
}
function configure(t) {
  mockPeachesBudget(t)
  const previous = [process.env.ELEVENLABS_API_KEY, process.env.ELEVENLABS_AGENT_ID, process.env.PIP_AGENT_ENABLED]
  process.env.ELEVENLABS_API_KEY = "test-only-secret"
  process.env.ELEVENLABS_AGENT_ID = "agent_test123"
  process.env.PIP_AGENT_ENABLED = "true"
  t.after(() => {
    for (const [index, name] of ["ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID", "PIP_AGENT_ENABLED"].entries()) {
      if (previous[index] === undefined) delete process.env[name]
      else process.env[name] = previous[index]
    }
  })
}

test("rejects invalid requests before calling ElevenLabs", async (t) => {
  configure(t)
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("must not call provider") })
  assert.equal((await call({ mode: "audio" })).statusCode, 400)
  assert.equal((await call({ mode: "voice" }, { origin: "https://elsewhere.test" })).statusCode, 403)
  assert.equal((await call({ mode: "voice" }, {}, "GET")).statusCode, 405)
  assert.equal(fetch.mock.callCount(), 0)
})
test("keeps live voice off until explicitly enabled", async (t) => {
  configure(t)
  delete process.env.PIP_AGENT_ENABLED
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("must not call provider") })
  assert.equal((await call({ mode: "voice" })).statusCode, 503)
  assert.equal(fetch.mock.callCount(), 0)
})
test("returns only the scoped voice session credential", async (t) => {
  configure(t)
  const fetch = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.headers["xi-api-key"], "test-only-secret")
    if (url.includes("/token?")) return new Response(JSON.stringify({ token: "voice-token", conversation_id: "conv_test" }))
    throw new Error("wrong endpoint")
  })
  assert.deepEqual((await call({ mode: "voice" })).body, { conversationToken: "voice-token", maxSeconds: 120 })
  assert.equal(fetch.mock.callCount(), 1)
})
test("missing configuration and provider failure stay unavailable", async (t) => {
  configure(t)
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response("busy", { status: 503 }))
  delete process.env.ELEVENLABS_API_KEY
  assert.equal((await call({ mode: "voice" })).statusCode, 503)
  process.env.ELEVENLABS_API_KEY = "test-only-secret"
  assert.equal((await call({ mode: "voice" })).statusCode, 502)
  assert.equal(fetch.mock.callCount(), 1)
})
