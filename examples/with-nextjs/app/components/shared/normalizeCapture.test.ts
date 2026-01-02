import assert from "node:assert";
import test from "node:test";

import { CaptureError, normalizeCapture } from "./normalizeCapture.js";

test.beforeEach(() => {
  URL.createObjectURL = () => "blob://preview";
});

test("returns a normalized file for camera captures", async () => {
  const cameraFile = new File([new Blob(["camera"], { type: "image/jpeg" })], "camera.jpg", {
    type: "image/jpeg",
  });

  const result = await normalizeCapture(cameraFile, "camera", {
    preferredName: "capture-1.jpeg",
  });

  assert.ok(result.file instanceof File);
  assert.equal(result.file.name, "capture-1.jpeg");
  assert.equal(result.previewUrl, "blob://preview");
  assert.equal(result.source, "camera");
});

test("rejects unsupported mime types", async () => {
  const textFile = new File([new Blob(["note"], { type: "text/plain" })], "note.txt", {
    type: "text/plain",
  });

  await assert.rejects(() => normalizeCapture(textFile, "photos"), CaptureError);
});

test("applies size limits", async () => {
  const heavy = new File([new Uint8Array(8).fill(1)], "big.png", { type: "image/png" });

  await assert.rejects(
    () =>
      normalizeCapture(heavy, "photos", {
        maxFileSize: 1,
      }),
    CaptureError,
  );
});
