import pg from "pg"

const { Pool } = pg
let pool
let schemaReady

function getPool() {
  if (!process.env.TIGER_HOST || !process.env.TIGER_DB || !process.env.TIGER_USER || !process.env.TIGER_PASSWORD)
    throw new Error("Peaches budget database is not configured")
  if (!pool) pool = new Pool({
    host: process.env.TIGER_HOST,
    port: Number(process.env.TIGER_PORT) || 5432,
    database: process.env.TIGER_DB,
    user: process.env.TIGER_USER,
    password: process.env.TIGER_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 5000,
  })
  return pool
}

export function peachesDailyLimit(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === "") return fallback
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) && value <= 1000 ? value : null
}

export async function reservePeachesBudget(kind, limit) {
  if (kind !== "text" && kind !== "voice") throw new Error("Invalid Peaches budget kind")
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 1000) throw new Error("Invalid Peaches daily limit")
  if (limit === 0) return { allowed: false, remaining: 0 }
  const db = getPool()
  if (!schemaReady) schemaReady = db.query(`
    CREATE TABLE IF NOT EXISTS pip_provider_budget (
      day_utc DATE NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('text', 'voice')),
      attempts INTEGER NOT NULL,
      PRIMARY KEY (day_utc, kind)
    )
  `).catch((error) => { schemaReady = null; throw error })
  await schemaReady
  const result = await db.query(`
    INSERT INTO pip_provider_budget (day_utc, kind, attempts)
    VALUES ((now() AT TIME ZONE 'UTC')::date, $1, 1)
    ON CONFLICT (day_utc, kind) DO UPDATE
      SET attempts = pip_provider_budget.attempts + 1
      WHERE pip_provider_budget.attempts < $2
    RETURNING attempts
  `, [kind, limit])
  const used = result.rows[0]?.attempts
  return used === undefined
    ? { allowed: false, remaining: 0 }
    : { allowed: true, remaining: Math.max(0, limit - Number(used)) }
}
