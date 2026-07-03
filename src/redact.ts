const VISIBLE_EDGE_CHARS = 4;
const MAX_MASKED_CHARS = 20;

/**
 * Renders a secret for display without ever printing it in full: short values are fully masked
 * (revealing 4 characters of an 8-character token still narrows a live secret too much), longer
 * values keep 4 characters on each edge for identification and cap the masked middle so a huge
 * blob (a whole PEM key) doesn't flood the terminal.
 */
export function redactSecret(value: string): string {
  if (value.length <= VISIBLE_EDGE_CHARS * 2) {
    return "*".repeat(value.length);
  }

  const maskedLength = Math.min(value.length - VISIBLE_EDGE_CHARS * 2, MAX_MASKED_CHARS);
  const prefix = value.slice(0, VISIBLE_EDGE_CHARS);
  const suffix = value.slice(-VISIBLE_EDGE_CHARS);
  return `${prefix}${"*".repeat(maskedLength)}${suffix}`;
}
