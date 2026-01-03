import assert from "node:assert";
import test from "node:test";

import { applyIssuerCanonToSummary } from "./issuerCanonUtils.js";

const sampleEntry = { master: "Bank & Card", aliases: ["Bank", "Card"] };

test("sets issuer header on empty summary", () => {
  const result = applyIssuerCanonToSummary("", sampleEntry);
  assert.equal(result, "單位： Bank & Card");
});

test("replaces first line and keeps body", () => {
  const base = "Old heading\nLine two\nLine three";
  const result = applyIssuerCanonToSummary(base, sampleEntry);
  const lines = result.split("\n");

  assert.equal(lines[0], "單位： Bank & Card");
  assert.deepEqual(lines.slice(1), ["Line two", "Line three"]);
});

test("subsequent selections overwrite header only", () => {
  const initial = "First line\nBody";
  const first = applyIssuerCanonToSummary(initial, sampleEntry);
  const secondEntry = { master: "Insurance Bureau" };
  const second = applyIssuerCanonToSummary(first, secondEntry);

  assert.equal(second.split("\n")[0], "單位： Insurance Bureau");
  assert.ok(second.includes("Body"));
});
