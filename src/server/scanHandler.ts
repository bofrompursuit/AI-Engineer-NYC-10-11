// Server-side only (Node). Never import this from client code — it reads secret
// API keys from process.env and would leak them into the browser bundle.

export interface Detection {
  label: string;
  /** [ymin, xmin, ymax, xmax], integers normalized to a 0-1000 scale, origin top-left. */
  box_2d: [number, number, number, number];
}

export interface Article {
  title: string;
  url: string;
  snippet: string;
}

export interface ScanResult {
  id?: number;
  subject: "physics" | "calculus" | "biopharma" | "general";
  concept: string;
  description: string;
  detections: Detection[];
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  pipLine: string;
  articles: Article[];
}

const PROMPT = `You are PIP, a friendly Montessori-style learning guide for middle-school and teen students (ages 11-16). A student just pointed their camera at something in the real world because they were curious about it.

Look at the image and:
1. Identify 1-3 notable regions in the image worth pointing out (objects, text, logos, diagrams — whatever is most relevant to the concept you'll teach). For each, give a short label and a bounding box.
2. Identify the single most interesting educational concept visible — physics, calculus/math, biology/biopharma/chemistry, or general science.
3. Write a short (1-2 sentence) description of what you see and why it's interesting, in an encouraging, curious tone.
4. Write ONE multiple-choice question testing understanding of that concept, with exactly 4 answer choices where only one is correct.
5. Write a 1-2 sentence explanation of why the correct answer is correct — this is shown to the student right after they answer, whether they got it right or wrong, so it must make sense standalone (restate the correct choice, don't say "as above").
6. Write a short, upbeat one-line encouragement in PIP's voice to show specifically when the student answers correctly.

Return ONLY a JSON object, no markdown fences, no commentary, in exactly this shape:
{
  "subject": "physics" | "calculus" | "biopharma" | "general",
  "concept": "short concept name",
  "description": "1-2 sentence description",
  "detections": [{ "label": "short label", "box_2d": [ymin, xmin, ymax, xmax] }],
  "question": "the question text",
  "choices": ["choice A", "choice B", "choice C", "choice D"],
  "correctIndex": 0,
  "explanation": "1-2 sentence standalone explanation of the correct answer",
  "pipLine": "short encouraging line for a correct answer"
}`;

class RetryableError extends Error {}

function getFallbackModels(): string[] {
  const raw = process.env.GEMINI_FALLBACK_MODELS || "gemini-flash-latest,gemini-3.5-flash,gemini-3.1-flash-lite";
  return raw.split(",").map((m) => m.trim()).filter(Boolean);
}

async function callModel(model: string, headers: Record<string, string>, body: unknown, attempts = 2): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let lastErr: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    let resp: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      resp = await fetch(url, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch (e) {
      lastErr = new RetryableError(`timeout/network error calling ${model}`);
      await sleep(2000 * (attempt + 1));
      continue;
    }

    if (resp.status === 402 || resp.status === 429 || resp.status === 503) {
      const retryAfter = resp.headers.get("Retry-After");
      const wait = retryAfter ? Math.min(Number(retryAfter) * 1000, 10_000) : Math.min(2000 * 2 ** attempt, 10_000);
      lastErr = new RetryableError(`${resp.status} from ${model}`);
      if (attempt < attempts - 1) await sleep(wait);
      continue;
    }

    if (!resp.ok) {
      throw new Error(`${resp.status} from ${model}: ${await resp.text().catch(() => "")}`);
    }
    return resp;
  }
  throw lastErr ?? new Error(`failed calling ${model}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJsonObject(text: string): any {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`Gemini did not return a JSON object. Raw response: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function fetchArticles(concept: string): Promise<Article[]> {
  const apiKey = process.env.NIMBLE_API_KEY;
  const url = process.env.NIMBLE_SEARCH_URL || "https://sdk.nimbleway.com/v2/search";
  if (!apiKey) return [];

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: concept,
        search_depth: "standard",
        max_results: 3,
        focus: "general",
        output_format: "plain_text",
      }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const results: any[] = data?.results ?? [];
    return results.slice(0, 3).map((r) => ({
      title: r.title || concept,
      url: r.url || "",
      snippet: (r.description || r.content || "").slice(0, 200).trim(),
    }));
  } catch {
    return [];
  }
}

export async function runScan(imageBase64: string, mimeType: string): Promise<ScanResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Set GEMINI_API_KEY in your environment first.");

  const primaryModel = process.env.GEMINI_MODEL || "gemini-robotics-er-2-preview";
  const models = [primaryModel, ...getFallbackModels().filter((m) => m !== primaryModel)];

  const headers = { "x-goog-api-key": apiKey };
  const body = {
    contents: [
      {
        parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: imageBase64 } }],
      },
    ],
    generationConfig: { temperature: 0.4 },
  };

  let resp: Response | null = null;
  const errors: string[] = [];
  for (const model of models) {
    try {
      resp = await callModel(model, headers, body);
      break;
    } catch (e) {
      errors.push(String(e));
    }
  }
  if (!resp) throw new Error(`All Gemini models rate-limited/unavailable: ${errors.join("; ")}`);

  const data = await resp.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  const result = extractJsonObject(text) as ScanResult;

  result.articles = await fetchArticles(result.concept);

  try {
    const { insertScan } = await import("./db.js");
    result.id = await insertScan({
      subject: result.subject,
      concept: result.concept,
      description: result.description,
      imageBase64,
      mimeType,
      detections: result.detections,
      question: result.question,
      choices: result.choices,
      correctIndex: result.correctIndex,
      explanation: result.explanation,
      pipLine: result.pipLine,
      articles: result.articles,
    });
  } catch (e) {
    console.error("[tigerdata] failed to persist scan, continuing without it:", e);
  }

  return result;
}
