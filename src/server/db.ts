// Server-side only (Node). Reads Tiger Data connection details from process.env.
import { Pool } from "pg";
import type { Article, Detection } from "./scanHandler";

let pool: Pool | null = null;

/** Scan ids are BIGSERIAL, which pg returns as strings; accept either form. */
export function parseScanId(value: unknown): number | null {
  const id = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0 ? id : null;
}

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.TIGER_HOST,
      port: Number(process.env.TIGER_PORT),
      database: process.env.TIGER_DB,
      user: process.env.TIGER_USER,
      password: process.env.TIGER_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(`
        CREATE TABLE IF NOT EXISTS pip_scans (
          id BIGSERIAL,
          scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          subject TEXT,
          concept TEXT,
          description TEXT,
          image_base64 TEXT,
          mime_type TEXT,
          detections JSONB,
          question TEXT,
          choices JSONB,
          correct_index INT,
          explanation TEXT,
          pip_line TEXT,
          articles JSONB,
          selected_index INT,
          is_correct BOOLEAN,
          answered_at TIMESTAMPTZ,
          PRIMARY KEY (id, scanned_at)
        );
      `)
      .then(() =>
        getPool().query(`SELECT create_hypertable('pip_scans', 'scanned_at', if_not_exists => TRUE);`),
      )
      .then(() => undefined);
  }
  return schemaReady;
}

export interface ScanRow {
  subject: string;
  concept: string;
  description: string;
  imageBase64: string;
  mimeType: string;
  detections: Detection[];
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  pipLine: string;
  articles: Article[];
}

export async function insertScan(row: ScanRow): Promise<number> {
  await ensureSchema();
  const result = await getPool().query(
    `INSERT INTO pip_scans
      (subject, concept, description, image_base64, mime_type, detections, question, choices, correct_index, explanation, pip_line, articles)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      row.subject,
      row.concept,
      row.description,
      row.imageBase64,
      row.mimeType,
      JSON.stringify(row.detections),
      row.question,
      JSON.stringify(row.choices),
      row.correctIndex,
      row.explanation,
      row.pipLine,
      JSON.stringify(row.articles),
    ],
  );
  return result.rows[0].id as number;
}

export async function recordAnswer(id: number, selectedIndex: number, isCorrect: boolean): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `UPDATE pip_scans SET selected_index = $2, is_correct = $3, answered_at = now() WHERE id = $1`,
    [id, selectedIndex, isCorrect],
  );
}

export interface HistoryRow {
  id: number;
  scannedAt: string;
  subject: string;
  concept: string;
  imageBase64: string;
  mimeType: string;
  question: string;
  selectedIndex: number | null;
  isCorrect: boolean | null;
}

export async function fetchHistory(limit = 30): Promise<HistoryRow[]> {
  await ensureSchema();
  const result = await getPool().query(
    `SELECT id, scanned_at, subject, concept, image_base64, mime_type, question, selected_index, is_correct
     FROM pip_scans ORDER BY scanned_at DESC LIMIT $1`,
    [limit],
  );
  return result.rows.map((r) => ({
    id: r.id,
    scannedAt: r.scanned_at,
    subject: r.subject,
    concept: r.concept,
    imageBase64: r.image_base64,
    mimeType: r.mime_type,
    question: r.question,
    selectedIndex: r.selected_index,
    isCorrect: r.is_correct,
  }));
}
