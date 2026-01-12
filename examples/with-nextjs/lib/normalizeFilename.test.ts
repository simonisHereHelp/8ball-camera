import test from "node:test";
import assert from "node:assert";
import { normalizeFilename } from "./normalizeFilename.js";

test("normalizeFilename converts names to NFC", () => {
  const decomposed = "Cafe\u0301";
  const normalized = normalizeFilename(decomposed);

  assert.equal(normalized, "Café");
  assert.equal(normalized, decomposed.normalize("NFC"));
});
