import assert from "node:assert/strict";
import { test } from "node:test";
import { isKnownSafeValue, looksLikePlaceholder } from "../src/known-safe.js";
import { FAKE_AWS_ACCESS_KEY_ID } from "./fixtures.js";

void test("isKnownSafeValue: recognizes AWS's own published example credential pair", () => {
  assert.ok(isKnownSafeValue("AKIAIOSFODNN7EXAMPLE"));
  assert.ok(isKnownSafeValue("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"));
});

void test("isKnownSafeValue: does not treat an arbitrary real-shaped key as safe", () => {
  assert.equal(isKnownSafeValue(FAKE_AWS_ACCESS_KEY_ID), false);
});

void test("looksLikePlaceholder: recognizes common non-secret filler", () => {
  for (const value of ["changeme", "CHANGE_ME", "<your-password-here>", "${DB_PASSWORD}", "process.env.PASSWORD", "xxxxxxxx", "********"]) {
    assert.ok(looksLikePlaceholder(value), `expected "${value}" to be recognized as a placeholder`);
  }
});

void test("looksLikePlaceholder: does not flag a real-looking password", () => {
  assert.equal(looksLikePlaceholder("tr0ub4dor&3-correct-horse"), false);
});
