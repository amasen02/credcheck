import assert from "node:assert/strict";
import { test } from "node:test";
import { BUILT_IN_RULES } from "../src/rules.js";

void test("BUILT_IN_RULES: every rule id is unique", () => {
  const ids = BUILT_IN_RULES.map((rule) => rule.id);
  assert.equal(new Set(ids).size, ids.length);
});

void test("BUILT_IN_RULES: every rule has a non-empty description and a valid severity", () => {
  for (const rule of BUILT_IN_RULES) {
    assert.ok(rule.description.length > 0, `rule ${rule.id} has no description`);
    assert.ok(["critical", "high", "medium"].includes(rule.severity), `rule ${rule.id} has an invalid severity`);
  }
});

void test("BUILT_IN_RULES: pattern rules use a global regex so multiple matches per line are found", () => {
  for (const rule of BUILT_IN_RULES) {
    if (rule.kind === "pattern") {
      assert.ok(rule.pattern.global, `rule ${rule.id}'s pattern must have the global flag`);
    }
  }
});
