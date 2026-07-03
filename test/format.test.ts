import assert from "node:assert/strict";
import { test } from "node:test";
import { colorsEnabled, paint, paintSeverity } from "../src/format.js";

function fakeStream(isTTY: boolean): NodeJS.WriteStream {
  return { isTTY } as NodeJS.WriteStream;
}

void test("colorsEnabled: false when NO_COLOR is set, even on a TTY", () => {
  assert.equal(colorsEnabled(fakeStream(true), { NO_COLOR: "1" }), false);
});

void test("colorsEnabled: true when FORCE_COLOR is set to a non-zero value, even off a TTY", () => {
  assert.equal(colorsEnabled(fakeStream(false), { FORCE_COLOR: "1" }), true);
});

void test("colorsEnabled: false when FORCE_COLOR is explicitly \"0\"", () => {
  assert.equal(colorsEnabled(fakeStream(true), { FORCE_COLOR: "0" }), false);
});

void test("colorsEnabled: falls back to TTY detection when neither env var is set", () => {
  assert.equal(colorsEnabled(fakeStream(true), {}), true);
  assert.equal(colorsEnabled(fakeStream(false), {}), false);
});

void test("paint: passes text through unchanged when color is disabled", () => {
  assert.equal(paint("hello", "red", false), "hello");
});

void test("paint: wraps text in ANSI codes when color is enabled", () => {
  const painted = paint("hello", "red", true);
  assert.notEqual(painted, "hello");
  assert.ok(painted.includes("hello"));
});

void test("paintSeverity: uppercases the severity label", () => {
  assert.equal(paintSeverity("critical", false), "CRITICAL");
  assert.equal(paintSeverity("medium", false), "MEDIUM");
});
