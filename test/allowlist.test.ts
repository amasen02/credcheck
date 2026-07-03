import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AllowlistConfigError,
  isAllowlistedByConfig,
  isAllowlistedInline,
  isPathIgnored,
  loadAllowlistConfig,
} from "../src/allowlist.js";
import type { RawFinding } from "../src/types.js";
import { FAKE_AWS_ACCESS_KEY_ID } from "./fixtures.js";
import { withTempDir, writeFileAt } from "./helpers.js";

const SAMPLE_FINDING: RawFinding = {
  ruleId: "aws-access-key-id",
  ruleDescription: "AWS access key ID",
  severity: "critical",
  filePath: "src/config.ts",
  line: 3,
  column: 10,
  secret: FAKE_AWS_ACCESS_KEY_ID,
};

void test("loadAllowlistConfig: returns an empty config when no config file exists and none was requested", async () => {
  await withTempDir((dir) => {
    const config = loadAllowlistConfig(dir, undefined);
    assert.deepEqual(config, { ignorePaths: [], ignoreRules: [], allowFingerprints: [] });
    return Promise.resolve();
  });
});

void test("loadAllowlistConfig: throws when an explicitly requested config file does not exist", async () => {
  await withTempDir((dir) => {
    assert.throws(() => loadAllowlistConfig(dir, "missing.json"), AllowlistConfigError);
    return Promise.resolve();
  });
});

void test("loadAllowlistConfig: loads a well-formed default config file", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(
      dir,
      ".credcheckrc.json",
      JSON.stringify({ ignorePaths: ["test/fixtures/**"], ignoreRules: ["jwt"], allowFingerprints: ["abc123"] }),
    );

    const config = loadAllowlistConfig(dir, undefined);
    assert.deepEqual(config, {
      ignorePaths: ["test/fixtures/**"],
      ignoreRules: ["jwt"],
      allowFingerprints: ["abc123"],
    });
  });
});

void test("loadAllowlistConfig: throws on invalid JSON", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, ".credcheckrc.json", "{ not json");
    assert.throws(() => loadAllowlistConfig(dir, undefined), AllowlistConfigError);
  });
});

void test("loadAllowlistConfig: throws when a field has the wrong type", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, ".credcheckrc.json", JSON.stringify({ ignorePaths: "not-an-array" }));
    assert.throws(() => loadAllowlistConfig(dir, undefined), AllowlistConfigError);
  });
});

void test("isAllowlistedByConfig: matches by rule id", () => {
  const config = { ignorePaths: [], ignoreRules: ["aws-access-key-id"], allowFingerprints: [] };
  assert.ok(isAllowlistedByConfig(SAMPLE_FINDING, "fingerprint", config));
});

void test("isAllowlistedByConfig: matches by fingerprint", () => {
  const config = { ignorePaths: [], ignoreRules: [], allowFingerprints: ["fingerprint-xyz"] };
  assert.ok(isAllowlistedByConfig(SAMPLE_FINDING, "fingerprint-xyz", config));
});

void test("isAllowlistedByConfig: false when nothing matches", () => {
  const config = { ignorePaths: [], ignoreRules: ["other-rule"], allowFingerprints: ["other-fingerprint"] };
  assert.equal(isAllowlistedByConfig(SAMPLE_FINDING, "fingerprint", config), false);
});

void test("isPathIgnored: matches ignorePaths globs", () => {
  const config = { ignorePaths: ["test/fixtures/**"], ignoreRules: [], allowFingerprints: [] };
  assert.ok(isPathIgnored("test/fixtures/sample.env", config));
  assert.equal(isPathIgnored("src/config.ts", config), false);
});

void test("isAllowlistedInline: recognizes a credcheck:allow comment, case-insensitively and with or without a space", () => {
  assert.ok(isAllowlistedInline('const key = "AKIA..."; // credcheck:allow'));
  assert.ok(isAllowlistedInline('const key = "AKIA..."; // CredCheck:Allow'));
  assert.ok(isAllowlistedInline('const key = "AKIA..."; // credcheck: allow (rotated)'));
});

void test("isAllowlistedInline: false when no suppression marker is present", () => {
  assert.equal(isAllowlistedInline('const key = "AKIA...";'), false);
});
