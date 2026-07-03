import assert from "node:assert/strict";
import { test } from "node:test";
import { computeFingerprint } from "../src/fingerprint.js";
import { FAKE_AWS_ACCESS_KEY_ID, FAKE_AWS_ACCESS_KEY_ID_ALT } from "./fixtures.js";

void test("computeFingerprint: is deterministic for identical inputs", () => {
  const a = computeFingerprint("aws-access-key-id", "src/config.ts", FAKE_AWS_ACCESS_KEY_ID);
  const b = computeFingerprint("aws-access-key-id", "src/config.ts", FAKE_AWS_ACCESS_KEY_ID);
  assert.equal(a, b);
});

void test("computeFingerprint: differs when the secret value differs", () => {
  const a = computeFingerprint("aws-access-key-id", "src/config.ts", FAKE_AWS_ACCESS_KEY_ID);
  const b = computeFingerprint("aws-access-key-id", "src/config.ts", FAKE_AWS_ACCESS_KEY_ID_ALT);
  assert.notEqual(a, b);
});

void test("computeFingerprint: differs when the file path differs", () => {
  const a = computeFingerprint("aws-access-key-id", "src/config.ts", FAKE_AWS_ACCESS_KEY_ID);
  const b = computeFingerprint("aws-access-key-id", "src/other.ts", FAKE_AWS_ACCESS_KEY_ID);
  assert.notEqual(a, b);
});

void test("computeFingerprint: differs when the rule id differs", () => {
  const a = computeFingerprint("rule-a", "src/config.ts", "same-value");
  const b = computeFingerprint("rule-b", "src/config.ts", "same-value");
  assert.notEqual(a, b);
});

void test("computeFingerprint: is a fixed-length lowercase hex string", () => {
  const fingerprint = computeFingerprint("rule-a", "src/config.ts", "same-value");
  assert.match(fingerprint, /^[0-9a-f]{16}$/);
});
