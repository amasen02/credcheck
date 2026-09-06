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

void test("redactSecret: values below 12 characters are masked in full, not near-fully revealed", () => {
  assert.equal(redactSecret("123456789"), "*********");
  assert.equal(redactSecret("0123456789"), "**********");
  assert.equal(redactSecret("abcdefghijk"), "***********");
});

void test("redactSecret: never reveals more than 40% of a value's characters", () => {
  const source = "aB3xZ9qW7mK2pL5vT8nR4jH6";
  for (let length = 1; length <= 96; length += 1) {
    const value = source.repeat(Math.ceil(length / source.length)).slice(0, length);
    const revealed = redactSecret(value).replace(/\*/g, "").length;
    assert.ok(revealed <= Math.floor(length * 0.4), `length ${length} revealed ${revealed} characters`);
    assert.ok(revealed <= 8, `length ${length} revealed ${revealed} characters`);
  }
});
