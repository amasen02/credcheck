import assert from "node:assert/strict";
import { test } from "node:test";
import { detectInContent, detectInLines } from "../src/detector.js";
import { BUILT_IN_RULES } from "../src/rules.js";
import type { RawFinding } from "../src/types.js";
import { FAKE_AWS_ACCESS_KEY_ID, FAKE_AWS_ACCESS_KEY_ID_ALT, FAKE_AWS_SECRET_ACCESS_KEY, FAKE_GITHUB_TOKEN, FAKE_NPM_TOKEN, FAKE_STRIPE_LIVE_KEY } from "./fixtures.js";

function findRule(ruleId: string): (typeof BUILT_IN_RULES)[number] {
  const rule = BUILT_IN_RULES.find((candidate) => candidate.id === ruleId);
  if (!rule) {
    throw new Error(`no such rule: ${ruleId}`);
  }
  return rule;
}

function onlyFinding(findings: readonly RawFinding[]): RawFinding {
  assert.equal(findings.length, 1);
  const [finding] = findings;
  assert.ok(finding);
  return finding;
}

void test("detectInContent: flags an AWS access key ID", () => {
  const findings = detectInContent("app.ts", `const key = "${FAKE_AWS_ACCESS_KEY_ID}";`, BUILT_IN_RULES);
  const finding = onlyFinding(findings);
  assert.equal(finding.ruleId, "aws-access-key-id");
  assert.equal(finding.secret, FAKE_AWS_ACCESS_KEY_ID);
  assert.equal(finding.line, 1);
});

void test("detectInContent: flags a PEM private key block header", () => {
  const content = ["-----BEGIN RSA PRIVATE KEY-----", "MIIEpAIBAAKCAQEA...", "-----END RSA PRIVATE KEY-----"].join("\n");
  const finding = onlyFinding(detectInContent("id_rsa", content, BUILT_IN_RULES));
  assert.equal(finding.ruleId, "private-key-block");
  assert.equal(finding.line, 1);
});

void test("detectInContent: flags a GitHub personal access token", () => {
  const finding = onlyFinding(detectInContent("app.ts", `const token = "${FAKE_GITHUB_TOKEN}";`, BUILT_IN_RULES));
  assert.equal(finding.ruleId, "github-token");
});

void test("detectInContent: flags an npm access token", () => {
  const finding = onlyFinding(detectInContent(".npmrc", `//registry.npmjs.org/:_authToken=${FAKE_NPM_TOKEN}`, BUILT_IN_RULES));
  assert.equal(finding.ruleId, "npm-token");
});

void test("detectInContent: flags a well-formed JWT", () => {
  const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dGhpc2lzYWZha2VzaWduYXR1cmU";
  const finding = onlyFinding(detectInContent("app.ts", `const authHeader = "Bearer ${jwt}";`, BUILT_IN_RULES));
  assert.equal(finding.ruleId, "jwt");
  assert.equal(finding.secret, jwt);
});

void test("detectInContent: flags a high-entropy value assigned to aws_secret_access_key", () => {
  const finding = onlyFinding(detectInContent(".env", `aws_secret_access_key=${FAKE_AWS_SECRET_ACCESS_KEY}`, BUILT_IN_RULES));
  assert.equal(finding.ruleId, "aws-secret-access-key");
  assert.equal(finding.secret, FAKE_AWS_SECRET_ACCESS_KEY);
});

void test("detectInContent: does not flag a low-entropy value even with a secret-shaped key name", () => {
  const findings = detectInContent("app.ts", 'const apiKey = "aaaaaaaaaaaaaaaaaaaa";', BUILT_IN_RULES);
  assert.equal(findings.length, 0);
});

void test("detectInContent: does not flag a short placeholder value", () => {
  const findings = detectInContent("app.ts", 'const apiKey = "your-key-here";', BUILT_IN_RULES);
  assert.equal(findings.length, 0);
});

void test("detectInContent: flags a high-entropy generic API key assignment and reports the correct column", () => {
  const secret = "e2yiUY9BFgL+bejJLptPb6Sk";
  const finding = onlyFinding(detectInContent("app.ts", `apiKey="${secret}"`, BUILT_IN_RULES));
  assert.equal(finding.ruleId, "generic-api-key-assignment");
  assert.equal(finding.secret, secret);
  assert.equal(finding.column, 9);
});

void test("detectInContent: flags a hardcoded password literal", () => {
  const finding = onlyFinding(detectInContent("app.ts", 'const password = "SuperSecret123!";', BUILT_IN_RULES));
  assert.equal(finding.ruleId, "hardcoded-password-assignment");
  assert.equal(finding.secret, "SuperSecret123!");
});

void test("detectInContent: does not flag an obvious password placeholder", () => {
  const findings = detectInContent("app.ts", 'const password = "changeme";', BUILT_IN_RULES);
  assert.equal(findings.length, 0);
});

void test("detectInContent: does not flag a password read from an environment variable", () => {
  const findings = detectInContent("app.ts", "const password = process.env.DB_PASSWORD;", BUILT_IN_RULES);
  assert.equal(findings.length, 0);
});

void test("detectInContent: never flags AWS's own published example access key", () => {
  const findings = detectInContent("README.md", "aws_access_key_id = AKIAIOSFODNN7EXAMPLE", BUILT_IN_RULES);
  assert.equal(findings.length, 0);
});

void test("detectInContent: reports one finding per line for multiple distinct secrets", () => {
  const content = [`const a = "${FAKE_AWS_ACCESS_KEY_ID}";`, `const b = "${FAKE_AWS_ACCESS_KEY_ID_ALT}";`].join("\n");
  const findings = detectInContent("app.ts", content, BUILT_IN_RULES);
  assert.equal(findings.length, 2);
  assert.deepEqual(
    findings.map((finding) => finding.line),
    [1, 2],
  );
});

void test("detectInContent: dedupes when a pattern rule and a keyed-entropy rule both match the same secret", () => {
  const finding = onlyFinding(detectInContent("app.ts", `const stripeSecretKey = "${FAKE_STRIPE_LIVE_KEY}";`, BUILT_IN_RULES));
  assert.equal(finding.ruleId, "stripe-live-key");
});

void test("detectInContent: an inactive rule set means the pattern is never flagged", () => {
  const rulesWithoutAws = BUILT_IN_RULES.filter((rule) => rule.id !== "aws-access-key-id");
  const findings = detectInContent("app.ts", `const key = "${FAKE_AWS_ACCESS_KEY_ID}";`, rulesWithoutAws);
  assert.equal(findings.length, 0);
});

void test("detectInLines: scans only the given sparse line numbers, preserving them in the output", () => {
  const findings = detectInLines(
    "app.ts",
    [
      { line: 5, content: `const key = "${FAKE_AWS_ACCESS_KEY_ID}";` },
      { line: 42, content: "// just a comment" },
    ],
    [findRule("aws-access-key-id")],
  );
  const finding = onlyFinding(findings);
  assert.equal(finding.line, 5);
});
