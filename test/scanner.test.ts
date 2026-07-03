import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { DEFAULT_EXCLUDES, resolveScanTargets } from "../src/scanner.js";
import { withTempDir, writeFileAt } from "./helpers.js";

void test("resolveScanTargets: finds files recursively across nested directories", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, "a.txt", "a");
    await writeFileAt(dir, "sub/b.txt", "b");
    await writeFileAt(dir, "sub/deeper/c.txt", "c");

    const { filePaths, warnings } = await resolveScanTargets([dir], []);

    assert.deepEqual(warnings, []);
    const relative = filePaths.map((filePath) => path.relative(dir, filePath)).sort();
    assert.deepEqual(relative, [path.join("sub", "b.txt"), path.join("sub", "deeper", "c.txt"), "a.txt"].sort());
  });
});

void test("resolveScanTargets: accepts a single file path directly, not only directories", async () => {
  await withTempDir(async (dir) => {
    const filePath = await writeFileAt(dir, "one.txt", "hello");
    const { filePaths } = await resolveScanTargets([filePath], []);
    assert.deepEqual(filePaths, [filePath]);
  });
});

void test("resolveScanTargets: excludes directories and files matching exclude names", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, "keep.txt", "keep");
    await writeFileAt(dir, "node_modules/pkg/index.js", "skip");
    await writeFileAt(dir, "debug.tmp", "skip");

    const { filePaths } = await resolveScanTargets([dir], [...DEFAULT_EXCLUDES, "*.tmp"]);

    const relative = filePaths.map((filePath) => path.relative(dir, filePath));
    assert.deepEqual(relative, ["keep.txt"]);
  });
});

void test("resolveScanTargets: skips binary files (detected via a NUL byte)", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, "text.txt", "plain text");
    const binaryPath = path.join(dir, "photo.png");
    const fs = await import("node:fs/promises");
    await fs.writeFile(binaryPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02]));

    const { filePaths } = await resolveScanTargets([dir], []);

    const relative = filePaths.map((filePath) => path.relative(dir, filePath));
    assert.deepEqual(relative, ["text.txt"]);
  });
});

void test("resolveScanTargets: records a warning instead of throwing for a missing path", async () => {
  await withTempDir(async (dir) => {
    const missing = path.join(dir, "does-not-exist");
    const { filePaths, warnings } = await resolveScanTargets([missing], []);

    assert.deepEqual(filePaths, []);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0]?.path, missing);
  });
});
