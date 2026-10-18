import test from "node:test"
import assert from "node:assert/strict"
import handler from "../api/peaches-chat.js"
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
  await handler({ method, headers: { host: "unfold.test", "x-forwarded-for": `peaches-chat-test-${++address}`, ...headers }, body }, response)
  return response
}
function configure(t, allowed = true) {
  mockPeachesBudget(t, allowed)
  const previous = process.env.GEMINI_API_KEY
  process.env.GEMINI_API_KEY = "test-only-secret"
  t.after(() => { if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous })
}
test("stops at the shared daily limit before calling Gemini", async (t) => {
  configure(t, false)
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("must not call provider") })
  const response = await call({ question: "Help", context: "Welcome" })
  assert.equal(response.statusCode, 429)
  assert.equal(fetch.mock.callCount(), 0)
})

test("rejects invalid text and cross-site requests before Gemini", async (t) => {
  configure(t)
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("must not call provider") })
  assert.equal((await call({ question: "", context: "Welcome" })).statusCode, 400)
  assert.equal((await call({ question: "Help", context: "Welcome" }, { origin: "https://elsewhere.test" })).statusCode, 403)
  assert.equal((await call({ question: "Help", context: "Welcome" }, {}, "GET")).statusCode, 405)
  assert.equal(fetch.mock.callCount(), 0)
})
test("sends page context and history to Gemini with a server-side key", async (t) => {
  configure(t)
  const fetch = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /generativelanguage\.googleapis\.com/)
    assert.equal(options.headers["x-goog-api-key"], "test-only-secret")
    const sent = JSON.parse(options.body)
    assert.match(sent.contents[0].parts[0].text, /Current page context:\nWelcome/)
    assert.match(sent.contents[0].parts[0].text, /Learner: I like physics/)
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Try the Physics journey." }] } }] }))
  })
  const response = await call({ question: "What should I choose?", context: "Welcome", history: [{ who: "you", text: "I like physics" }] })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body, { answer: "Try the Physics journey." })
  assert.equal(fetch.mock.callCount(), 1)
})
test("missing configuration and provider failure remain unavailable", async (t) => {
  configure(t)
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response("busy", { status: 503 }))
  delete process.env.GEMINI_API_KEY
  assert.equal((await call({ question: "Help", context: "Welcome" })).statusCode, 503)
  process.env.GEMINI_API_KEY = "test-only-secret"
  assert.equal((await call({ question: "Help", context: "Welcome" })).statusCode, 502)
  assert.equal(fetch.mock.callCount(), 1)
})
