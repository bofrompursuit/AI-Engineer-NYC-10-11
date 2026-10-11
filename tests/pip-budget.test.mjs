import test from "node:test"
import assert from "node:assert/strict"
import { pipDailyLimit, reservePipBudget } from "../lib/pip-budget.js"
import { mockPipBudget } from "./pip-budget-mock.mjs"

test("accepts a zero cap and rejects invalid daily limits", (t) => {
  const previous = process.env.PIP_TEXT_DAILY_LIMIT
  t.after(() => { if (previous === undefined) delete process.env.PIP_TEXT_DAILY_LIMIT; else process.env.PIP_TEXT_DAILY_LIMIT = previous })
  process.env.PIP_TEXT_DAILY_LIMIT = "0"
  assert.equal(pipDailyLimit("PIP_TEXT_DAILY_LIMIT", 25), 0)
  process.env.PIP_TEXT_DAILY_LIMIT = "-1"
  assert.equal(pipDailyLimit("PIP_TEXT_DAILY_LIMIT", 25), null)
  process.env.PIP_TEXT_DAILY_LIMIT = "1001"
  assert.equal(pipDailyLimit("PIP_TEXT_DAILY_LIMIT", 25), null)
})

test("uses one atomic database reservation per provider attempt", async (t) => {
  const query = mockPipBudget(t)
  assert.deepEqual(await reservePipBudget("text", 25), { allowed: true, remaining: 24 })
  assert.equal(query.mock.calls.some(({ arguments: args }) => String(args[0]).includes("ON CONFLICT") && args[1][0] === "text" && args[1][1] === 25), true)
})
