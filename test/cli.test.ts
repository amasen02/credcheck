import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FAKE_AWS_ACCESS_KEY_ID } from "./fixtures.js";
import { initGitRepo, runGit, stageFile, withTempDir, writeFileAt } from "./helpers.js";

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI_ENTRY = path.join(PROJECT_ROOT, "src", "cli.ts");
// An absolute file:// URL, not the bare "tsx" specifier: a test below runs the CLI with `cwd`
// set to a scratch directory with no node_modules of its own, and bare-specifier package
// resolution for `--import` is relative to the child process's cwd, not this project's root.
const TSX_LOADER = pathToFileURL(path.join(PROJECT_ROOT, "node_modules", "tsx", "dist", "loader.mjs")).href;

interface CliResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

async function runCli(args: string[], options: { cwd?: string } = {}): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", TSX_LOADER, CLI_ENTRY, ...args], {
      cwd: options.cwd,
      env: { ...process.env, NO_COLOR: "1" },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
    child.stdin.end();
  });
}

void test("cli: --help prints usage and exits 0", async () => {
  const result = await runCli(["--help"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Usage:/);
});

void test("cli: --version prints a semver-looking string and exits 0", async () => {
  const result = await runCli(["--version"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+/);
});

void test("cli: an invalid flag exits 2 with a message on stderr", async () => {
  const result = await runCli(["--not-a-real-flag"]);
  assert.equal(result.exitCode, 2);
  assert.match(result.stderr, /credcheck:/);
});

void test("cli: a clean directory exits 0 and reports no secrets", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, "a.txt", "nothing to see here");

    const result = await runCli([dir]);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /No secrets found/);
  });
});

void test("cli: a directory with a planted secret exits 1 and reports it", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, "config.ts", `const key = "${FAKE_AWS_ACCESS_KEY_ID}";`);

    const result = await runCli([dir]);
    assert.equal(result.exitCode, 1);
    assert.match(result.stdout, /aws-access-key-id/);
  });
});

void test("cli: --json emits a machine-readable report and never includes the raw secret", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, "config.ts", `const key = "${FAKE_AWS_ACCESS_KEY_ID}";`);

    const result = await runCli([dir, "--json"]);
    assert.equal(result.exitCode, 1);
    assert.ok(!result.stdout.includes(FAKE_AWS_ACCESS_KEY_ID));

    const parsed = JSON.parse(result.stdout) as { findings: unknown[]; leaksFound: boolean; filesScanned: number };
    assert.equal(parsed.leaksFound, true);
    assert.equal(parsed.findings.length, 1);
    assert.equal(parsed.filesScanned, 1);
  });
});

void test("cli: --disable-rule suppresses that rule's findings", async () => {
  await withTempDir(async (dir) => {
    await writeFileAt(dir, "config.ts", `const key = "${FAKE_AWS_ACCESS_KEY_ID}";`);

    const result = await runCli([dir, "--disable-rule", "aws-access-key-id"]);
    assert.equal(result.exitCode, 0);
  });
});

void test("cli: scanning a non-existent path reports a warning but does not crash", async () => {
  await withTempDir(async (dir) => {
    const result = await runCli([path.join(dir, "does-not-exist")]);
    assert.equal(result.exitCode, 0);
    assert.match(result.stderr, /warning/);
  });
});

void test("cli: an unreadable config file exits 2 with a message", async () => {
  await withTempDir(async (dir) => {
    const result = await runCli([dir, "--config", "missing.json"]);
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /credcheck:/);
  });
});

void test("cli: --staged scans only staged git changes and exits 1 when they contain a secret", async () => {
  await withTempDir(async (dir) => {
    initGitRepo(dir);
    await stageFile(dir, "config.env", "SAFE=1\n");
    runGit(dir, ["commit", "--quiet", "-m", "initial"]);
    await stageFile(dir, "config.env", `SAFE=1\nAWS_KEY=${FAKE_AWS_ACCESS_KEY_ID}\n`);

    const result = await runCli(["--staged"], { cwd: dir });
    assert.equal(result.exitCode, 1);
    assert.match(result.stdout, /config\.env/);
  });
});

void test("cli: --staged outside a git repository exits 3", async () => {
  await withTempDir(async (dir) => {
    const result = await runCli(["--staged"], { cwd: dir });
    assert.equal(result.exitCode, 3);
    assert.match(result.stderr, /credcheck:/);
  });
});
