import type { Rule } from "./types.js";

/**
 * Built-in detectors, split into three families (see types.ts):
 *
 *  - "pattern": the secret's own shape is the signal (an AWS key ID, a PEM header, a JWT).
 *    These fire unconditionally wherever they match, since no legitimate non-secret string has
 *    that shape by accident.
 *  - "keyed-entropy": the shape alone (an arbitrary 20-40 char string) is too generic to fire on
 *    its own, so these require both a secret-looking variable name AND a value that clears an
 *    entropy bar - catches "generic API token" leaks without flagging every long string in a file.
 *  - "keyed-literal": passwords are often plain English, so no entropy bar applies; a
 *    credential-looking key name plus a non-placeholder literal value is enough.
 */
export const BUILT_IN_RULES: readonly Rule[] = [
  {
    id: "private-key-block",
    description: "Private key block (PEM/OpenSSH)",
    severity: "critical",
    kind: "pattern",
    pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/g,
  },
  {
    id: "aws-access-key-id",
    description: "AWS access key ID",
    severity: "critical",
    kind: "pattern",
    pattern: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    id: "aws-secret-access-key",
    description: "AWS secret access key",
    severity: "critical",
    kind: "keyed-entropy",
    keyPattern: /aws_?(secret|session)_?(access_)?(key|token)/i,
    minValueLength: 40,
    maxValueLength: 40,
    minEntropyBitsPerChar: 3.5,
  },
  {
    id: "github-token",
    description: "GitHub personal access / OAuth / app token",
    severity: "critical",
    kind: "pattern",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/g,
  },
  {
    id: "github-fine-grained-pat",
    description: "GitHub fine-grained personal access token",
    severity: "critical",
    kind: "pattern",
    pattern: /\bgithub_pat_[A-Za-z0-9_]{80,}\b/g,
  },
  {
    id: "gitlab-pat",
    description: "GitLab personal access token",
    severity: "high",
    kind: "pattern",
    pattern: /\bglpat-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    id: "slack-token",
    description: "Slack token",
    severity: "high",
    kind: "pattern",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,72}\b/g,
  },
  {
    id: "slack-webhook-url",
    description: "Slack incoming webhook URL",
    severity: "medium",
    kind: "pattern",
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g,
  },
  {
    id: "google-api-key",
    description: "Google API key",
    severity: "high",
    kind: "pattern",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    id: "stripe-live-key",
    description: "Stripe live secret/restricted key",
    severity: "critical",
    kind: "pattern",
    pattern: /\b(sk|rk)_live_[A-Za-z0-9]{16,247}\b/g,
  },
  {
    id: "stripe-test-key",
    description: "Stripe test secret/restricted key",
    severity: "medium",
    kind: "pattern",
    pattern: /\b(sk|rk)_test_[A-Za-z0-9]{16,247}\b/g,
  },
  {
    id: "npm-token",
    description: "npm access token",
    severity: "high",
    kind: "pattern",
    pattern: /\bnpm_[A-Za-z0-9]{36}\b/g,
  },
  {
    id: "jwt",
    description: "JSON Web Token",
    severity: "medium",
    kind: "pattern",
    pattern: /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    id: "generic-api-key-assignment",
    description: "High-entropy value assigned to a secret-looking variable",
    severity: "medium",
    kind: "keyed-entropy",
    keyPattern: /(api|access|client|auth)[-_]?(key|token|secret)|secret[-_]?key/i,
    minValueLength: 16,
    maxValueLength: 256,
    minEntropyBitsPerChar: 3.0,
  },
  {
    id: "hardcoded-password-assignment",
    description: "Literal password/credential assigned in source",
    severity: "medium",
    kind: "keyed-literal",
    keyPattern: /pass(word|wd)?|pwd/i,
    minValueLength: 4,
  },
];
