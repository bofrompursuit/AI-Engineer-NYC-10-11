import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/scanUpload.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
});
const { requestScan, prepareScanImage } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const valid = {
  id: "3",
  subject: "physics",
  concept: "Gravity",
  description: "A ball falls toward the ground.",
  detections: [{ label: "Ball", box_2d: [100, 100, 200, 200] }],
  question: "What pulls the ball down?",
  choices: ["Gravity", "Light", "Sound", "Heat"],
  correctIndex: 0,
  explanation: "Gravity attracts the ball toward Earth.",
  pipLine: "You got it!",
  articles: [],
};

test("sends prepared image with the caller's cancellation signal and accepts a valid quiz", async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/scan");
    assert.equal(options.method, "POST");
    assert.equal(options.signal, controller.signal);
    assert.deepEqual(JSON.parse(options.body), { image: "test-image", mimeType: "image/jpeg" });
    return Response.json(valid);
  });
  assert.deepEqual(await requestScan("test-image", "image/jpeg", controller.signal), valid);
});

test("Vercel's plain-text 413 gets a useful smaller-photo message", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("FUNCTION_PAYLOAD_TOO_LARGE", { status: 413 }));
  await assert.rejects(requestScan("image", "image/jpeg", new AbortController().signal), /too large.*smaller image/i);
});

test("server errors work with JSON, null, or an HTML error page", async (t) => {
  let response;
  t.mock.method(globalThis, "fetch", async () => response);
  response = Response.json({ error: "Scan service is unavailable." }, { status: 503 });
  await assert.rejects(requestScan("image", "image/jpeg", new AbortController().signal), /Scan service is unavailable/);
  for (const body of ["null", "<html>Gateway timeout</html>"]) {
    response = new Response(body, { status: 504 });
    await assert.rejects(requestScan("image", "image/jpeg", new AbortController().signal), /error 504/);
  }
});

test("rejects incomplete or invalid model results before the UI renders them", async (t) => {
  let response;
  t.mock.method(globalThis, "fetch", async () => response);
  for (const result of [null, {}, { ...valid, choices: ["Only one"] }, { ...valid, correctIndex: 7 },
    { ...valid, detections: [{ label: "Ball", box_2d: [1, 2, "bad", 4] }] },
    { ...valid, articles: [{ title: "Missing URL" }] }]) {
    response = Response.json(result);
    await assert.rejects(requestScan("image", "image/jpeg", new AbortController().signal), /couldn't read the scan result/);
  }
  response = new Response("<html>Unexpected page</html>");
  await assert.rejects(requestScan("image", "image/jpeg", new AbortController().signal), /couldn't read the scan result/);
});

test("rejects oversized or non-image input before image decoding", async () => {
  await assert.rejects(prepareScanImage({ size: 25_000_001, type: "image/png" }), /smaller than 25 MB/);
  await assert.rejects(prepareScanImage(new File(["text"], "notes.txt", { type: "text/plain" })), /Choose an image file/);
});
