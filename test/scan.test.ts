import assert from "node:assert/strict";
import { test } from "node:test";
import { computeFingerprint } from "../src/fingerprint.js";
import { runScan } from "../src/scan.js";
import { FAKE_AWS_ACCESS_KEY_ID } from "./fixtures.js";
import { initGitRepo, runGit, stageFile, withTempDir, writeFileAt } from "./helpers.js";

const EMPTY_ALLOWLIST = { ignorePaths: [], ignoreRules: [], allowFingerprints: [] };

void test("runScan: finds a planted secret in a plain directory scan", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, "config.ts", `export const key = "${FAKE_AWS_ACCESS_KEY_ID}";\n`);

    const { report } = await runScan({
      targets: [dir],
      staged: false,
      cwd: dir,
      excludeNames: [],
      disabledRuleIds: [],
      allowlist: EMPTY_ALLOWLIST,
    });

    assert.equal(report.findings.length, 1);
    const [finding] = report.findings;
    assert.ok(finding);
    assert.equal(finding.ruleId, "aws-access-key-id");
    assert.equal(report.filesScanned, 1);
  });
});

void test("runScan: a clean directory reports zero findings", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, "config.ts", 'export const greeting = "hello world";\n');

    const { report } = await runScan({
      targets: [dir],
      staged: false,
      cwd: dir,
      excludeNames: [],
      disabledRuleIds: [],
      allowlist: EMPTY_ALLOWLIST,
    });

    assert.equal(report.findings.length, 0);
  });
});

void test("runScan: excludeNames skips matching directories entirely", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, "vendor/config.ts", `const key = "${FAKE_AWS_ACCESS_KEY_ID}";`);

    const { report } = await runScan({
      targets: [dir],
      staged: false,
      cwd: dir,
      excludeNames: ["vendor"],
      disabledRuleIds: [],
      allowlist: EMPTY_ALLOWLIST,
    });

    assert.equal(report.findings.length, 0);
  });
});

void test("runScan: disabledRuleIds suppresses a specific rule", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, "config.ts", `const key = "${FAKE_AWS_ACCESS_KEY_ID}";`);

    const { report } = await runScan({
      targets: [dir],
      staged: false,
      cwd: dir,
      excludeNames: [],
      disabledRuleIds: ["aws-access-key-id"],
      allowlist: EMPTY_ALLOWLIST,
    });

    assert.equal(report.findings.length, 0);
  });
});

void test("runScan: an inline `credcheck:allow` comment suppresses that specific line", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, "config.ts", `const key = "${FAKE_AWS_ACCESS_KEY_ID}"; // credcheck:allow test fixture\n`);

    const { report } = await runScan({
      targets: [dir],
      staged: false,
      cwd: dir,
      excludeNames: [],
      disabledRuleIds: [],
      allowlist: EMPTY_ALLOWLIST,
    });

    assert.equal(report.findings.length, 0);
    assert.equal(report.allowlistedCount, 1);
  });
});

void test("runScan: allowFingerprints suppresses one finding without disabling the rule elsewhere", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, "config.ts", `const key = "${FAKE_AWS_ACCESS_KEY_ID}";\n`);
    const fingerprint = computeFingerprint("aws-access-key-id", "config.ts", FAKE_AWS_ACCESS_KEY_ID);

    const { report } = await runScan({
      targets: [dir],
      staged: false,
      cwd: dir,
      excludeNames: [],
      disabledRuleIds: [],
      allowlist: { ...EMPTY_ALLOWLIST, allowFingerprints: [fingerprint] },
    });

    assert.equal(report.findings.length, 0);
    assert.equal(report.allowlistedCount, 1);
  });
});

void test("runScan: ignorePaths skips a whole file without reading its other secrets", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, "fixtures/sample.env", `API_KEY=${FAKE_AWS_ACCESS_KEY_ID}\n`);

    const { report } = await runScan({
      targets: [dir],
      staged: false,
      cwd: dir,
      excludeNames: [],
      disabledRuleIds: [],
      allowlist: { ...EMPTY_ALLOWLIST, ignorePaths: ["fixtures/**"] },
    });

    assert.equal(report.findings.length, 0);
    assert.equal(report.filesScanned, 0);
  });
});

void test("runScan --staged: finds a secret only in the newly-staged lines of a git repo", async () => {
  await withTempDir(async (dir) => {
    initGitRepo(dir);
    await stageFile(dir, "config.env", "SAFE=1\n");
    runGit(dir, ["commit", "--quiet", "-m", "initial"]);

    await stageFile(dir, "config.env", `SAFE=1\nAWS_KEY=${FAKE_AWS_ACCESS_KEY_ID}\n`);

    const { report } = await runScan({
      targets: [],
      staged: true,
      cwd: dir,
      excludeNames: [],
      disabledRuleIds: [],
      allowlist: EMPTY_ALLOWLIST,
    });

    assert.equal(report.findings.length, 1);
    const [finding] = report.findings;
    assert.ok(finding);
    assert.equal(finding.filePath, "config.env");
    assert.equal(finding.line, 2);
  });
});

void test("runScan --staged: unstaged working-tree changes are not scanned", async () => {
  await withTempDir(async (dir) => {
    initGitRepo(dir);
    await stageFile(dir, "config.env", "SAFE=1\n");
    runGit(dir, ["commit", "--quiet", "-m", "initial"]);

    await writeFileAt(dir, "config.env", `SAFE=1\nAWS_KEY=${FAKE_AWS_ACCESS_KEY_ID}\n`);

    const { report } = await runScan({
      targets: [],
      staged: true,
      cwd: dir,
      excludeNames: [],
      disabledRuleIds: [],
      allowlist: EMPTY_ALLOWLIST,
    });

    assert.equal(report.findings.length, 0);
  });
});
