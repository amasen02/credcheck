/** Below this length a value is masked in full: any revealed edge is too large a share of it. */
const MIN_LENGTH_FOR_PARTIAL_REVEAL = 12;
/** Upper bound on the edge characters kept for identification, however long the value is. */
const MAX_VISIBLE_EDGE_CHARS = 4;
/** One edge character is earned per this many characters of value, capping the reveal at 40%. */
const CHARS_PER_VISIBLE_EDGE_CHAR = 5;
const MAX_MASKED_CHARS = 20;

/**
 * Renders a secret for display without meaningfully revealing it: values shorter than 12
 * characters are masked in full (a human-chosen password like a 9-character one is effectively
 * disclosed by showing 4 characters at each end), and longer values reveal at most 40% of their
 * characters - never more than 4 per edge - so the output identifies which secret was found
 * without being usable. The masked middle is capped so a huge blob (a whole PEM key) doesn't
 * flood the terminal.
 */
export function redactSecret(value: string): string {
  const visibleEdgeChars =
    value.length < MIN_LENGTH_FOR_PARTIAL_REVEAL
      ? 0
      : Math.min(MAX_VISIBLE_EDGE_CHARS, Math.floor(value.length / CHARS_PER_VISIBLE_EDGE_CHAR));

  if (visibleEdgeChars === 0) {
    return "*".repeat(value.length);
  }

  const maskedLength = Math.min(value.length - visibleEdgeChars * 2, MAX_MASKED_CHARS);
  const prefix = value.slice(0, visibleEdgeChars);
  const suffix = value.slice(-visibleEdgeChars);
  return `${prefix}${"*".repeat(maskedLength)}${suffix}`;
}
