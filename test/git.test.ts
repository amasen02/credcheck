import assert from "node:assert/strict";
import { test } from "node:test";
import { getStagedAddedLines, GitError } from "../src/git.js";
import { initGitRepo, runGit, stageFile, withTempDir } from "./helpers.js";

void test("getStagedAddedLines: reports only added lines, with correct file path and line numbers", async () => {
  await withTempDir(async (dir) => {
    initGitRepo(dir);
    await stageFile(dir, "config.env", "FIRST=1\nAPI_KEY=abc123\n");

    const diffs = getStagedAddedLines(dir);

    assert.equal(diffs.length, 1);
    const [diff] = diffs;
    assert.ok(diff);
    assert.equal(diff.filePath, "config.env");
    assert.deepEqual(
      diff.addedLines.map((entry) => entry.line),
      [1, 2],
    );
    assert.deepEqual(
      diff.addedLines.map((entry) => entry.content),
      ["FIRST=1", "API_KEY=abc123"],
    );
  });
});

void test("getStagedAddedLines: only reports newly-added lines, not pre-existing committed content", async () => {
  await withTempDir(async (dir) => {
    initGitRepo(dir);
    await stageFile(dir, "config.env", "OLD_LINE=safe\n");
    runGit(dir, ["commit", "--quiet", "-m", "initial"]);

    await stageFile(dir, "config.env", "OLD_LINE=safe\nNEW_SECRET=super-secret-value\n");

    const diffs = getStagedAddedLines(dir);

    assert.equal(diffs.length, 1);
    const [diff] = diffs;
    assert.ok(diff);
    assert.deepEqual(
      diff.addedLines.map((entry) => entry.content),
      ["NEW_SECRET=super-secret-value"],
    );
    const [addedLine] = diff.addedLines;
    assert.ok(addedLine);
    assert.equal(addedLine.line, 2);
  });
});

void test("getStagedAddedLines: a file staged in a nested directory reports a repo-relative path", async () => {
  await withTempDir(async (dir) => {
    initGitRepo(dir);
    await stageFile(dir, "src/nested/config.env", "TOKEN=value\n");

    const diffs = getStagedAddedLines(dir);

    assert.equal(diffs.length, 1);
    const [diff] = diffs;
    assert.ok(diff);
    assert.equal(diff.filePath, "src/nested/config.env");
  });
});

void test("getStagedAddedLines: returns nothing when nothing is staged", async () => {
  await withTempDir((dir) => {
    initGitRepo(dir);
    const diffs = getStagedAddedLines(dir);
    assert.deepEqual(diffs, []);
    return Promise.resolve();
  });
});

void test("getStagedAddedLines: throws GitError outside a git repository", async () => {
  await withTempDir((dir) => {
    assert.throws(() => getStagedAddedLines(dir), GitError);
    return Promise.resolve();
  });
});
