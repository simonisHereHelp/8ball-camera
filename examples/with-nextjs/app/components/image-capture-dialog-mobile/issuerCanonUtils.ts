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
  const trimmedCurrent = currentSummary.trim();

  const stripCanonLines = (text: string) =>
    text
      .split(/\r?\n/)
      .filter((line) => !/^\s*單位\s*:/u.test(line.trim()))
      .join("\n")
      .trim();

  const cleanedCurrent = stripCanonLines(trimmedCurrent);
  const cleanedDraft = stripCanonLines(draftSummary.trim());

  if (!cleanedCurrent) {
    return cleanedDraft ? `${canonLine}\n${cleanedDraft}` : canonLine;
  }

  return `${canonLine}\n${cleanedCurrent}`;
};

export type { IssuerCanonEntry };
