import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "credcheck-test-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function writeFileAt(dir: string, relativePath: string, contents: string): Promise<string> {
  const fullPath = path.join(dir, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents);
  return fullPath;
}

/** Runs a git subcommand in `dir`, throwing with stderr on failure, for tests that need real git. */
export function runGit(dir: string, args: readonly string[]): string {
  const result = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout;
}

/** Initializes a git repo with a fixed local identity, isolated from the host's global config. */
export function initGitRepo(dir: string): void {
  runGit(dir, ["init", "--initial-branch=main", "--quiet"]);
  runGit(dir, ["config", "user.email", "test@example.com"]);
  runGit(dir, ["config", "user.name", "Test"]);
}

/** Writes and `git add`s a file so it shows up in `git diff --cached`. */
export async function stageFile(dir: string, relativePath: string, contents: string): Promise<void> {
  await writeFileAt(dir, relativePath, contents);
  runGit(dir, ["add", "--", relativePath]);
}
