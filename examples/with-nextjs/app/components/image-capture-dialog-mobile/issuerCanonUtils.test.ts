import assert from "node:assert";
import test from "node:test";

import {
  applyCanonToSummary,
  fetchIssuerCanonList,
  type IssuerCanonEntry,
} from "./issuerCanonUtils.js";

const sampleCanon: IssuerCanonEntry = {
  master: "Mega Bank",
  aliases: ["Mega", "MG"],
};

test("fetchIssuerCanonList returns issuers from API payload", async () => {
  const mockFetch = async (input: string) => {
    assert.equal(input, "/api/issuer-canons");
    return {
      ok: true,
      json: async () => ({ issuers: [sampleCanon] }),
    } as any;
  };

  const issuers = await fetchIssuerCanonList(mockFetch as any);
  assert.equal(issuers.length, 1);
  assert.equal(issuers[0].master, "Mega Bank");
  assert.deepEqual(issuers[0].aliases, ["Mega", "MG"]);
});

test("applyCanonToSummary seeds empty summary with canon and draft", () => {
  const draftSummary = "Draft text";
  const updated = applyCanonToSummary({
    canon: sampleCanon,
    currentSummary: "",
    draftSummary,
  });

  assert.equal(updated.startsWith("單位: Mega Bank"), true);
  assert.equal(updated.includes(draftSummary), true);
});

test("applyCanonToSummary avoids duplicating existing canon", () => {
  const existing = "單位: Mega Bank\nExisting text";
  const updated = applyCanonToSummary({
    canon: sampleCanon,
    currentSummary: existing,
    draftSummary: "",
  });

  assert.equal(updated, existing.trim());
});

test("applyCanonToSummary prepends canon when missing", () => {
  const updated = applyCanonToSummary({
    canon: sampleCanon,
    currentSummary: "Other summary line",
    draftSummary: "",
  });

  assert.equal(
    updated,
    "單位: Mega Bank\nOther summary line",
  );
});

test("applyCanonToSummary replaces older registry lines", () => {
  const updated = applyCanonToSummary({
    canon: { master: "New Canon" },
    currentSummary: "單位: Old Canon\nExisting text",
    draftSummary: "單位: Older Canon\nDraft body",
  });

  assert.equal(
    updated,
    "單位: New Canon\nExisting text",
  );
});
