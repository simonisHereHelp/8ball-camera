import type { IssuerCanonEntry } from "@/types/issuerCanon";

interface CanonListResponse {
  issuers?: IssuerCanonEntry[];
}

/**
 * Fetch the issuer canon list from the API (Drive/local JSON abstraction).
 */
export const fetchIssuerCanonList = async (
  fetcher: typeof fetch = fetch,
): Promise<IssuerCanonEntry[]> => {
  const response = await fetcher("/api/issuer-canons");

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to fetch issuer canon list");
  }

  const payload = (await response.json()) as CanonListResponse;
  return payload.issuers ?? [];
};

/**
 * Insert a canon entry into the user's editable summary without auto-saving.
 * - If the summary is empty, seed it with the canon line (optionally followed by the draft summary).
 * - If the canon master already appears, leave the summary untouched.
 * - Otherwise, prepend a helpful canon line.
 */
export const applyCanonToSummary = ({
  canon,
  currentSummary,
  draftSummary,
}: {
  canon: IssuerCanonEntry;
  currentSummary: string;
  draftSummary: string;
}): string => {
  const canonLine = `單位: ${canon.master}`;
  const stripCanonLines = (text: string) =>
    text
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => !/^\s*單位\s*:/u.test(line.trim()))
      .join("\n")
      .trim();

  const normalizeLines = (text: string) =>
    stripCanonLines(text)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

  // Prefer the current editable text; fall back to the original draft when empty.
  const baseLines = normalizeLines(currentSummary).length
    ? normalizeLines(currentSummary)
    : normalizeLines(draftSummary);

  if (!baseLines.length) {
    return canonLine;
  }

  // Always place the selected canon on the first line while keeping the rest of the content.
  return [canonLine, ...baseLines].join("\n");
};

export type { IssuerCanonEntry };
