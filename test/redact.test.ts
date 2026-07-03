import assert from "node:assert/strict";
import { test } from "node:test";
import { redactSecret } from "../src/redact.js";
import { FAKE_AWS_ACCESS_KEY_ID, FAKE_STRIPE_LIVE_KEY } from "./fixtures.js";

void test("redactSecret: short values are fully masked, not partially revealed", () => {
  assert.equal(redactSecret("short12"), "*******");
  assert.equal(redactSecret("12345678"), "********");
});

void test("redactSecret: longer values keep 4 characters on each edge", () => {
  const redacted = redactSecret(FAKE_AWS_ACCESS_KEY_ID);
  assert.ok(redacted.startsWith("AKIA"));
  assert.ok(redacted.endsWith("MNOP"));
  assert.ok(redacted.includes("*"));
});

void test("redactSecret: never returns the original value verbatim", () => {
  const redacted = redactSecret(FAKE_STRIPE_LIVE_KEY);
  assert.notEqual(redacted, FAKE_STRIPE_LIVE_KEY);
  assert.ok(!redacted.includes(FAKE_STRIPE_LIVE_KEY.slice(4, -4)));
});

void test("redactSecret: caps the masked middle so huge blobs (e.g. a PEM key) stay readable", () => {
  const huge = "A".repeat(4) + "x".repeat(500) + "B".repeat(4);
  const redacted = redactSecret(huge);
  assert.ok(redacted.length < huge.length);
  assert.ok(redacted.startsWith("AAAA"));
  assert.ok(redacted.endsWith("BBBB"));
});
