# Scan & Learn — sponsor integration notes

This document covers **only the Scan page** (`Header → Scan` nav tab) — the one part of this
Unfold codebase with real backend integrations. Everything else in the app (Dashboard, Case,
Analytics, Join) is static mock UI/content and out of scope here.

If you're an agent picking this up mid-hackathon: read this before touching
`src/server/*`, `api/*`, `ScanScreen.tsx`, `ScanUploadView.tsx`, `GalleryScreen.tsx`, or
`AnnotatedImage.tsx`.

## What it does

1. User uploads/takes a photo on the **Upload** sub-view.
2. **Gemini** (vision) looks at the photo and returns: 1-3 bounding boxes, an educational
   concept, a 4-choice quiz question about it, the correct answer + explanation, and a short
   "Peaches" (the app's guide persona) encouragement line.
3. The photo is redrawn client-side on a `<canvas>` with the boxes + labels overlaid
   (`AnnotatedImage.tsx`) — this is NOT server-side image processing, it's pure browser Canvas2D.
4. **Nimble** search fetches the top 3 real articles about the detected concept.
5. The full result (image + quiz + articles) is persisted to **Tiger Data** (TimescaleDB) as one row.
6. When the user answers (right or wrong), the **correct** answer + explanation + articles are
   always revealed, and a second write updates that row with what they picked.
7. The **Gallery** sub-view queries Tiger Data and shows every past scan with its outcome.

## Photo upload preparation

- `src/scanUpload.ts` prepares photos in the browser before sending them to `/api/scan`.
  It caps the longest side at 1600 pixels and encodes a JPEG at quality 0.82, resizing
  further if needed to keep the image under 1.5 MB (about 2 MB after base64 encoding).
- This keeps camera photos and large screenshots below Vercel's 4.5 MB request body
  limit. For example, an 8.82 MB PNG would otherwise become an 11.76 MB JSON request
  and fail with HTTP 413 before the scan handler runs.
- The preview uses the same prepared image sent to Gemini, so annotations use the
  same dimensions and orientation. The original file on the user's device is unchanged.
- Files over 25 MB and images the browser cannot decode show a retry message. Use
  JPG, PNG, or WebP if a phone's HEIC image cannot open in the browser.
- Upload requests have a 90-second browser timeout. Timeout, connection, size, and
  malformed result errors show a retry action. Cancelling the browser request does
  not cancel work already running in a server function.
- Run `pnpm test` for request/error regression tests. Verify image preparation in a
  real browser; the tests do not simulate Canvas image encoding.

## Architecture

```
Browser (ScanUploadView.tsx)
  │  POST { image: base64, mimeType }
  ▼
/api/scan ──────────────────────────────► src/server/scanHandler.ts
  │                                         ├─ calls Gemini (with model fallback chain)
  │                                         ├─ calls Nimble (top-3 articles)
  │                                         └─ calls src/server/db.ts → inserts row, returns id
  ▼
Browser renders quiz, user picks an answer
  │  POST { id, selectedIndex, isCorrect }
  ▼
/api/answer ────────────────────────────► src/server/db.ts (UPDATE row)

Browser (GalleryScreen.tsx)
  │  GET
  ▼
/api/history ───────────────────────────► src/server/db.ts (SELECT recent rows)
```

**Two runtimes share the same handler code, on purpose:**
- **Local dev**: `src/server/viteApiPlugin.ts` mounts `/api/scan`, `/api/answer`, `/api/history`
  directly on the Vite dev server (`configureServer` middleware) — no second process, just
  `npm run dev`.
- **Production (Vercel)**: `api/scan.ts`, `api/answer.ts`, `api/history.ts` are thin wrappers
  that import the exact same functions from `src/server/scanHandler.ts` / `src/server/db.ts` and
  adapt them to the Vercel Node function `(req, res)` signature.

Don't duplicate logic between these two paths — if you need to change behavior, change it in
`src/server/*` and both paths pick it up.

**Why TypeScript server code lives under `src/`:** `tsconfig.json`'s `include` covers both
`src` and `api` — this was a real bug once (see Gotchas). If you add a new server module, make
sure it's reachable from that include list or `tsc --noEmit` will silently skip it.

## Environment variables (`.env`, gitignored)

```bash
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-robotics-er-2-preview        # primary model
GEMINI_FALLBACK_MODELS=gemini-flash-latest,gemini-3.5-flash,gemini-3.1-flash-lite

NIMBLE_API_KEY=...
NIMBLE_SEARCH_URL=https://sdk.nimbleway.com/v2/search

TIGER_HOST=...
TIGER_PORT=...
TIGER_DB=...
TIGER_USER=...
TIGER_PASSWORD=...
```

These are loaded two ways — both needed:
- `vite.config.ts` calls `loadEnv(mode, process.cwd(), '')` and assigns the result onto
  `process.env` so the **dev middleware** (Node-side, not bundled) can read them.
- In production, Vercel injects its own project env vars into the function runtime directly —
  set the same keys in the Vercel dashboard before deploying.

**Never prefix these with `VITE_`** — that prefix tells Vite to inline the value into the
client bundle, which would ship your API keys to every visitor's browser.

## Gemini integration (`src/server/scanHandler.ts`)

- One multimodal `generateContent` call does detection + quiz generation + explanation in a
  single round trip (not two calls) — cheaper and faster, at some cost to box precision. If
  boxes ever need to be more accurate, consider splitting into a dedicated detection call.
- Auth is the `x-goog-api-key` header, **not** `?key=` in the URL — this matters because a
  thrown `fetch` error's message can include the request URL, and a URL-embedded key would leak
  into logs/error banners shown on screen.
- **Model fallback chain**: tries `GEMINI_MODEL`, then each of `GEMINI_FALLBACK_MODELS` in
  order. Retries each model up to twice, backing off on `402`, `429`, and `503` (all three are
  treated as transient — see Gotchas for why `402` is in that list). Respects a `Retry-After`
  header when present, capped at 10s so a bad response can't stall the UI for too long.
- JSON extraction is defensive: it slices from the first `{` to the last `}` in the response
  text rather than `JSON.parse`-ing directly, because Gemini occasionally wraps the JSON in
  markdown fences or adds a stray sentence despite the prompt saying not to.

## Nimble integration (`fetchArticles` in `scanHandler.ts`)

- Endpoint: `POST https://sdk.nimbleway.com/v2/search`, auth via `Authorization: Bearer <key>`.
- `focus: "general"` is required — `search_depth: "standard"` only works with `focus=general`;
  other focus modes (`news`, `shopping`, etc.) only support `search_depth: "lite"`.
- Query is the Gemini-identified `concept` string directly. For a company/brand name specifically
  (not currently a path in this feature, but relevant if reused elsewhere), a bare entity name is
  too ambiguous on its own — pull in a few words of surrounding context to disambiguate.
- Returns up to 3 `{ title, url, snippet }` articles. Failures here are non-fatal — the scan
  still succeeds with `articles: []` if Nimble is down or the key is missing.

## Tiger Data integration (`src/server/db.ts`)

- Plain `pg` (`node-postgres`) `Pool`, not an ORM. Connects with `ssl: { rejectUnauthorized: false }`
  — Tiger Cloud requires SSL but this environment's cert chain isn't in Node's default trust
  store, so full verification is disabled. Fine for a hackathon; revisit for production.
- `ensureSchema()` is idempotent (`CREATE TABLE IF NOT EXISTS` + `create_hypertable(...,
  if_not_exists => TRUE)`) and runs lazily on first use — no separate migration step.
- Table `pip_scans` is a genuine TimescaleDB **hypertable** partitioned on `scanned_at`, not a
  plain table with a timestamp column — this is the actual "Tiger Data" angle for the hackathon
  prize, not just incidental storage.
- The image is stored as base64 **text** directly in a column (`image_base64`), not in a
  separate blob store. Deliberate simplification for hackathon scale — Postgres TOASTs large
  text fields automatically, but this will not scale to production volumes. If that ever
  matters, swap to a blob store (Vercel Blob, S3) and store a URL instead.
- Every DB call in `scanHandler.ts` is wrapped in try/catch and logs-but-doesn't-throw — a Tiger
  Data outage degrades the feature (no persistence, no gallery entry) instead of breaking the
  scan/quiz flow itself.
- Row lifecycle: `insertScan()` writes the full row (image, quiz, articles) at scan time and
  returns an `id`; `recordAnswer(id, selectedIndex, isCorrect)` later updates that same row —
  it's an insert-then-update pattern, not two separate tables.

## API reference

| Endpoint | Method | Body | Returns |
|---|---|---|---|
| `/api/scan` | POST | `{ image: base64string, mimeType: string }` | `ScanResult` (see `scanHandler.ts`) incl. `id` |
| `/api/answer` | POST | `{ id: number, selectedIndex: number, isCorrect: boolean }` | `{ ok: true }` |
| `/api/history` | GET | — | `HistoryRow[]`, newest first, limit 30 |

## Known gotchas (learned the hard way tonight)

- **`gemini-2.5-flash` returns 404** for this key — "no longer available to new users," Google's
  error message points to `gemini-3.8-flash` instead. Model availability shifts during an event
  like this; if a model suddenly 404s, check the error body before assuming the code is broken.
- **`402 Payment Required`** from Gemini turned out to be transient (confirmed by retrying the
  exact same request seconds later — it succeeded). Likely a momentary free-tier quota blip
  under heavy load, not a hard billing wall. That's why `402` is in the retryable set, not treated
  as fatal.
- **EXIF orientation**: phone photos carry an orientation tag that `PIL`/`canvas` don't auto-apply.
  If Gemini and the box-drawing code ever disagree about "upright," that's almost certainly why.
  (This bit us in the earlier Python prototype of this feature — mentioned here because the same
  class of bug could resurface if box-drawing logic changes. Gemini's own vision pipeline
  generally handles EXIF correctly; the risk is specifically in `AnnotatedImage.tsx`'s canvas
  draw not matching what Gemini "saw.")
- **`tsconfig.json` `include`** must list `api` explicitly — it was missing once, which meant
  `npx tsc --noEmit` silently never checked `api/*.ts` and a type error shipped unnoticed.
- The Vite dev server's nav bar (and this whole page) is laid out with `vw`-relative units for a
  wide desktop screen — at narrow widths (under ~900px) the design's own responsive rules kick
  in via the `max-width: 900px` media query at the bottom of `index.css`; don't assume something
  is broken just because it looks cramped in a narrow preview pane.
