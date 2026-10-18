import test from "node:test"
import assert from "node:assert/strict"
import handler from "../api/peaches-help.js"
import { mockPeachesBudget } from "./peaches-budget-mock.mjs"

const valid = {
  journeyId: "physics",
  questionId: "force",
  question: "What does acceleration mean?",
  solved: false,
}
let address = 0
async function call(body = valid, options = {}) {
  const response = {
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
  await handler(
    {
      method: "POST",
      headers: {
        host: "unfold.test",
        "x-forwarded-for": `test-${++address}`,
        ...options.headers,
      },
      body,
      ...options,
    },
    response,
  )
  return response
}
function configure(t) {
  mockPeachesBudget(t)
  const oldKey = process.env.GEMINI_API_KEY
  const oldEnabled = process.env.PIP_HELP_ENABLED
  process.env.GEMINI_API_KEY = "test-only-not-a-real-key"
  delete process.env.PIP_HELP_ENABLED
  t.after(() => {
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = oldKey
    if (oldEnabled === undefined) delete process.env.PIP_HELP_ENABLED
    else process.env.PIP_HELP_ENABLED = oldEnabled
  })
}

test("rejects invalid input before contacting Gemini", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => {
    throw new Error("must not contact provider")
  })
  for (const body of [
    "{invalid",
    null,
    { ...valid, question: "x".repeat(601) },
    { ...valid, journeyId: "unknown" },
    { ...valid, questionId: "unknown" },
  ])
    assert.equal((await call(body)).statusCode, 400)
  assert.equal(fetch.mock.callCount(), 0)
})
test("rejects an unrelated browser origin and non-POST requests", async () => {
  assert.equal(
    (
      await call(valid, {
        headers: { host: "unfold.test", origin: "https://elsewhere.test" },
      })
    ).statusCode,
    403,
  )
  const response = await call(valid, { method: "GET" })
  assert.equal(response.statusCode, 405)
  assert.equal(response.headers.Allow, "POST")
})
test("missing key and the disable switch return an honest unavailable status", async (t) => {
  configure(t)
  const fetch = t.mock.method(globalThis, "fetch", () => {
    throw new Error("must not contact provider")
  })
  delete process.env.GEMINI_API_KEY
  assert.equal((await call()).statusCode, 503)
  process.env.GEMINI_API_KEY = "test-only"
  process.env.PIP_HELP_ENABLED = "false"
  assert.equal((await call()).statusCode, 503)
  assert.equal(fetch.mock.callCount(), 0)
})
test("uses trusted lesson context and returns the provider's answer without thoughts", async (t) => {
  configure(t)
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(
      url,
      /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/.+:generateContent$/,
    )
    const body = JSON.parse(options.body)
    assert.equal(body.contents[0].parts[0].text, valid.question)
    assert.match(body.systemInstruction.parts[0].text, /10 kg/)
    assert.doesNotMatch(body.systemInstruction.parts[0].text, /20 N/)
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                { thought: true, text: "internal reasoning" },
                {
                  text: "Acceleration tells you how quickly velocity changes.",
                },
              ],
            },
          },
        ],
      }),
      { headers: { "Content-Type": "application/json" } },
    )
  })
  const response = await call()
  assert.equal(response.statusCode, 200)
  assert.equal(
    response.body.answer,
    "Acceleration tells you how quickly velocity changes.",
  )
})
test("provider failure and empty output stay unavailable rather than inventing an answer", async (t) => {
  configure(t)
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("busy", { status: 503 }),
  )
  assert.equal((await call()).statusCode, 502)
  fetch.mock.mockImplementation(
    async () => new Response(JSON.stringify({ candidates: [] })),
  )
  assert.equal((await call()).statusCode, 502)
  fetch.mock.mockImplementation(async () => {
    throw new Error("network failure")
  })
  assert.equal((await call()).statusCode, 502)
})
test("limits requests from one address before invoking the provider again", async (t) => {
  configure(t)
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "Think about how velocity changes." }],
              },
            },
          ],
        }),
      ),
  )
  const options = {
    headers: { host: "unfold.test", "x-forwarded-for": "rate-limit-test" },
  }
  for (let index = 0; index < 8; index++)
    assert.equal((await call(valid, options)).statusCode, 200)
  assert.equal((await call(valid, options)).statusCode, 429)
  assert.equal(fetch.mock.callCount(), 8)
})
