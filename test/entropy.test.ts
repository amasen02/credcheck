import assert from "node:assert/strict";
import { test } from "node:test";
import { shannonEntropy } from "../src/entropy.js";

void test("shannonEntropy: empty string has zero entropy", () => {
  assert.equal(shannonEntropy(""), 0);
});

void test("shannonEntropy: a single repeated character has zero entropy", () => {
  assert.equal(shannonEntropy("aaaaaaaaaaaa"), 0);
});

void test("shannonEntropy: n distinct, uniformly-distributed characters yields log2(n) bits/char", () => {
  assert.ok(Math.abs(shannonEntropy("abcdefgh") - 3) < 1e-9);
});

void test("shannonEntropy: a realistic random token scores far higher than repetitive filler", () => {
  const token = "k3F9xQm2LpZ8vNc7WdRt5AyB";
  const filler = "aaaaaaaaaaaaaaaaaaaaaaaa";
  assert.ok(shannonEntropy(token) > shannonEntropy(filler));
  assert.ok(shannonEntropy(token) > 3.5);
});

void test("shannonEntropy: low-cardinality placeholder text stays low", () => {
  assert.ok(shannonEntropy("111111111111") < 1);
});
