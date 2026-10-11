import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/scanUpload.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
});
const { requestScan, prepareScanImage, readJpegOrientation } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

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

test("reads the camera orientation and stored size from a JPEG header", () => {
  const exif = (orientation, little) => {
    const u16 = (n) => little ? [n & 255, n >> 8] : [n >> 8, n & 255];
    const u32 = (n) => little ? [...u16(n & 65535), ...u16(n >>> 16)] : [...u16(n >>> 16), ...u16(n & 65535)];
    const tiff = [...(little ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8), ...u16(1),
      ...u16(0x0112), ...u16(3), ...u32(1), ...u16(orientation), 0, 0, ...u32(0)];
    return [0xff, 0xe1, 0, tiff.length + 8, 0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  };
  const frame = [0xff, 0xc0, 0, 11, 8, 0x0b, 0xd0, 0x0f, 0xc0, 1, 1, 0x11, 0];
  const jpeg = (...segments) => new Uint8Array([0xff, 0xd8, ...segments.flat()]);
  assert.deepEqual(readJpegOrientation(jpeg(exif(6, false), frame)), { orientation: 6, width: 4032, height: 3024 });
  assert.deepEqual(readJpegOrientation(jpeg(exif(8, true), frame)), { orientation: 8, width: 4032, height: 3024 });
  assert.deepEqual(readJpegOrientation(jpeg(frame)), { orientation: 1, width: 4032, height: 3024 });
  assert.equal(readJpegOrientation(jpeg(exif(6, false))), null);
  assert.equal(readJpegOrientation(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), null);
});
