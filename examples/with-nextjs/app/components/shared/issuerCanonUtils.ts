export interface IssuerCanonEntry {
  master: string;
  aliases?: string[];
}

/**
 * Apply an issuer canon selection to the editable summary text.
 * - Appends a short note with the canonical issuer name (and aliases if present).
 * - Avoids duplicating the same canon insertion twice in a row.
 */
export function applyIssuerCanonToSummary(
  currentSummary: string,
  entry: IssuerCanonEntry,
): string {
  const insertion = `Issuer Canon: ${entry.master}${
    entry.aliases?.length ? ` (aliases: ${entry.aliases.join(", ")})` : ""
  }`;

  const trimmed = currentSummary.trim();

  if (!trimmed) return insertion;

  const alreadyContains = trimmed.includes(entry.master);
  if (alreadyContains) return trimmed;

  return `${trimmed}\n\n${insertion}`;
}
