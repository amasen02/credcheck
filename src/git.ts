import { spawnSync } from "node:child_process";

export class GitError extends Error {}

export interface StagedAddedLine {
  readonly line: number;
  readonly content: string;
}

export interface StagedFileDiff {
  readonly filePath: string;
  readonly addedLines: readonly StagedAddedLine[];
}

const HUNK_HEADER_PATTERN = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/**
 * Runs `git diff --cached` and returns only the lines being *added* by the staged change, per
 * file - the content about to enter history. Scanning the full staged file (not just the diff)
 * would re-flag every pre-existing line on every commit that touches a file, which is exactly
 * the noise a pre-commit hook can't tolerate.
 */
export function getStagedAddedLines(cwd: string): StagedFileDiff[] {
  const result = spawnSync("git", ["diff", "--cached", "--no-color", "--unified=0", "--diff-filter=ACMR"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 1024,
  });

  if (result.error) {
    throw new GitError(`failed to run git: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new GitError(result.stderr.trim() || "git diff --cached exited with a non-zero status");
  }

  return parseUnifiedDiff(result.stdout);
}

function parseUnifiedDiff(diffText: string): StagedFileDiff[] {
  const files: StagedFileDiff[] = [];
  let currentFilePath: string | undefined;
  let currentAddedLines: StagedAddedLine[] = [];
  let nextLineNumber = 0;

  const flush = (): void => {
    if (currentFilePath !== undefined) {
      files.push({ filePath: currentFilePath, addedLines: currentAddedLines });
    }
  };

  for (const rawLine of diffText.split("\n")) {
    if (rawLine.startsWith("diff --git ")) {
      flush();
      currentFilePath = undefined;
      currentAddedLines = [];
      continue;
    }

    if (rawLine.startsWith("+++ ")) {
      currentFilePath = parseDiffPath(rawLine.slice("+++ ".length));
      continue;
    }

    const hunkMatch = HUNK_HEADER_PATTERN.exec(rawLine);
    if (hunkMatch?.[1] !== undefined) {
      nextLineNumber = Number.parseInt(hunkMatch[1], 10);
      continue;
    }

    if (currentFilePath === undefined) {
      continue;
    }

    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      currentAddedLines.push({ line: nextLineNumber, content: rawLine.slice(1) });
      nextLineNumber += 1;
    }
  }

  flush();
  return files.filter((file) => file.addedLines.length > 0);
}

/** `+++ b/path/to/file` -> `path/to/file`; `+++ /dev/null` (a deleted file) -> undefined. */
function parseDiffPath(rawPath: string): string | undefined {
  if (rawPath === "/dev/null") {
    return undefined;
  }
  return rawPath.startsWith("b/") ? rawPath.slice(2) : rawPath;
}
