/**
 * Literal values that are publicly documented as non-secret and appear constantly in real
 * codebases (copied from vendor docs into README snippets, fixtures, and tests). Structural
 * rules (AWS key shape, PEM header, ...) fire on these unconditionally, so without this list the
 * scanner would flag AWS's own example credential pair on every scan of every AWS quickstart.
 * Real tools in this space (gitleaks, trufflehog) carry the same exception for the same reason.
 */
const KNOWN_SAFE_VALUES = new Set<string>([
  // AWS's own documented example access key, e.g. https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
  "AKIAIOSFODNN7EXAMPLE",
  "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
]);

export function isKnownSafeValue(value: string): boolean {
  return KNOWN_SAFE_VALUES.has(value);
}

const PLACEHOLDER_VALUE_PATTERN =
  /^(changeme|change_me|change-me|password|passw0rd|xxx+|\*+|<[^>]*>|\{\{.*}}|\$\{.*}|process\.env\.\w+|your[-_].*|example|placeholder|redacted|secret|todo|n\/a)$/i;

/** Recognizes filler like `<your-password-here>`, `changeme`, `${DB_PASSWORD}` — not real leaks. */
export function looksLikePlaceholder(value: string): boolean {
  return PLACEHOLDER_VALUE_PATTERN.test(value.trim());
}
