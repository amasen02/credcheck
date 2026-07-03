import assert from "node:assert/strict";
import { test } from "node:test";
import { CliArgError, parseCliArgs } from "../src/cli-args.js";

void test("parseCliArgs: defaults to no explicit paths and every flag off", () => {
  const options = parseCliArgs([]);
  assert.deepEqual(options.paths, []);
  assert.equal(options.staged, false);
  assert.equal(options.configPath, undefined);
  assert.deepEqual(options.excludePatterns, []);
  assert.deepEqual(options.disabledRuleIds, []);
  assert.equal(options.json, false);
});

void test("parseCliArgs: collects positional paths", () => {
  const options = parseCliArgs(["src", "test"]);
  assert.deepEqual(options.paths, ["src", "test"]);
});

void test("parseCliArgs: --staged sets the staged flag", () => {
  assert.equal(parseCliArgs(["--staged"]).staged, true);
});

void test("parseCliArgs: --exclude and --disable-rule are repeatable", () => {
  const options = parseCliArgs(["--exclude", "*.lock", "--exclude", "vendor", "--disable-rule", "jwt", "--disable-rule", "npm-token"]);
  assert.deepEqual(options.excludePatterns, ["*.lock", "vendor"]);
  assert.deepEqual(options.disabledRuleIds, ["jwt", "npm-token"]);
});

void test("parseCliArgs: --config captures the config file path", () => {
  assert.equal(parseCliArgs(["--config", "custom.json"]).configPath, "custom.json");
});

void test("parseCliArgs: --json, --help, and -v/--version map correctly", () => {
  assert.equal(parseCliArgs(["--json"]).json, true);
  assert.equal(parseCliArgs(["--help"]).help, true);
  assert.equal(parseCliArgs(["-v"]).version, true);
  assert.equal(parseCliArgs(["--version"]).version, true);
});

void test("parseCliArgs: an unrecognized flag throws CliArgError", () => {
  assert.throws(() => parseCliArgs(["--not-a-real-flag"]), CliArgError);
});
