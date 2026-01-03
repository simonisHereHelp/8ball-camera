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
  const aliasText = canon.aliases?.length
    ? ` (aliases: ${canon.aliases.join(", ")})`
    : "";
  const canonLine = `Issuer: ${canon.master}${aliasText}`.trim();
  const trimmedCurrent = currentSummary.trim();

  if (!trimmedCurrent) {
    const draftPortion = draftSummary.trim();
    return draftPortion ? `${canonLine}\n${draftPortion}` : canonLine;
  }

  if (trimmedCurrent.includes(canon.master)) {
    return trimmedCurrent;
  }

  return `${canonLine}\n${trimmedCurrent}`;
};

export type { IssuerCanonEntry };
