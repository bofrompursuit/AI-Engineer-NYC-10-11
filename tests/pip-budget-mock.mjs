import pg from "pg"

export function mockPipBudget(t, allowed = true) {
  const previous = Object.fromEntries(["TIGER_HOST", "TIGER_DB", "TIGER_USER", "TIGER_PASSWORD"].map((name) => [name, process.env[name]]))
  process.env.TIGER_HOST = "db.test"
  process.env.TIGER_DB = "test"
  process.env.TIGER_USER = "test"
  process.env.TIGER_PASSWORD = "test"
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  })
  return t.mock.method(pg.Pool.prototype, "query", async (sql) => ({
    rows: String(sql).includes("RETURNING attempts") && allowed ? [{ attempts: 1 }] : [],
  }))
}
