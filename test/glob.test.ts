import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesAnyName, matchesAnyPath } from "../src/glob.js";

void test("matchesAnyName: exact names match case-insensitively", () => {
  assert.ok(matchesAnyName("NODE_MODULES", ["node_modules"]));
  assert.ok(matchesAnyName("node_modules", ["NODE_MODULES"]));
  assert.equal(matchesAnyName("src", ["node_modules"]), false);
});

void test("matchesAnyName: `*`/`?` wildcards match within a single name", () => {
  assert.ok(matchesAnyName("debug.log", ["*.log"]));
  assert.ok(matchesAnyName("a.log", ["?.log"]));
  assert.equal(matchesAnyName("ab.log", ["?.log"]), false);
});

void test("matchesAnyPath: a slash-free pattern matches the basename at any depth", () => {
  assert.ok(matchesAnyPath("server.pem", ["*.pem"]));
  assert.ok(matchesAnyPath("keys/nested/server.pem", ["*.pem"]));
  assert.equal(matchesAnyPath("keys/server.pem.txt", ["*.pem"]), false);
});

void test("matchesAnyPath: `**` in a path pattern spans directory separators", () => {
  assert.ok(matchesAnyPath("test/fixtures/foo/bar.txt", ["test/fixtures/**"]));
  assert.ok(matchesAnyPath("test/fixtures/bar.txt", ["test/fixtures/**"]));
  assert.equal(matchesAnyPath("test/other/bar.txt", ["test/fixtures/**"]), false);
});

void test("matchesAnyPath: `*` within a path pattern does not cross a directory separator", () => {
  assert.ok(matchesAnyPath("src/index.ts", ["src/*.ts"]));
  assert.equal(matchesAnyPath("src/sub/index.ts", ["src/*.ts"]), false);
});

void test("matchesAnyPath: no pattern matches an unrelated path", () => {
  assert.equal(matchesAnyPath("src/index.ts", ["test/**", "*.md"]), false);
});
