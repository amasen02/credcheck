import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { toPosixRelativePath } from "../src/paths.js";
import { withTempDir } from "./helpers.js";

void test("toPosixRelativePath: converts an absolute path under cwd to a forward-slash relative path", async () => {
  await withTempDir((dir) => {
    const target = path.join(dir, "src", "config.ts");
    assert.equal(toPosixRelativePath(dir, target), "src/config.ts");
    return Promise.resolve();
  });
});

void test("toPosixRelativePath: normalizes OS-native separators on an already-relative path", () => {
  const relative = ["src", "sub", "config.ts"].join(path.sep);
  assert.equal(toPosixRelativePath("/anywhere", relative), "src/sub/config.ts");
});

void test("toPosixRelativePath: an absolute path outside cwd walks up with ..", async () => {
  await withTempDir((outer) => {
    const cwd = path.join(outer, "project");
    const target = path.join(outer, "sibling", "file.txt");
    assert.equal(toPosixRelativePath(cwd, target), "../sibling/file.txt");
    return Promise.resolve();
  });
});
