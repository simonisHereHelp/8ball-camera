export interface IssuerCanonEntry {
  master: string;
  aliases?: string[];
}

/**
 * Apply an issuer canon selection to the editable summary text.
 * - Replaces the first line with a static issuer header (e.g., "單位： 勞保局").
 * - Preserves the rest of the summary body unchanged.
 */
export function applyIssuerCanonToSummary(
  currentSummary: string,
  entry: IssuerCanonEntry,
): string {
  const header = `單位： ${entry.master}`;
  if (!currentSummary.trim()) return header;

  const lines = currentSummary.split(/\r?\n/);
  const [, ...rest] = lines;
  const body = rest.join("\n");

  return body.trim() ? `${header}\n${body}` : header;
}
