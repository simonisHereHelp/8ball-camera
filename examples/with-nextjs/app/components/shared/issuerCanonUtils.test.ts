import assert from "node:assert";
import test from "node:test";

import { applyIssuerCanonToSummary } from "./issuerCanonUtils.js";

const sampleEntry = { master: "Bank & Card", aliases: ["Bank", "Card"] };

test("adds issuer canon to empty summary", () => {
  const result = applyIssuerCanonToSummary("", sampleEntry);
  assert.ok(result.includes("Bank & Card"));
});

test("appends issuer canon to existing summary", () => {
  const base = "Existing summary.";
  const result = applyIssuerCanonToSummary(base, sampleEntry);
  assert.ok(result.startsWith(base));
  assert.ok(result.includes("aliases: Bank, Card"));
});

test("avoids duplicate insertions", () => {
  const once = applyIssuerCanonToSummary("Existing", sampleEntry);
  const twice = applyIssuerCanonToSummary(once, sampleEntry);
  assert.equal(twice, once);
});
