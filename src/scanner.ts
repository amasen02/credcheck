import { open, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { matchesAnyName } from "./glob.js";

export const DEFAULT_EXCLUDES: readonly string[] = ["node_modules", ".git", "dist", "build", "coverage", ".next", "out"];

const BINARY_SNIFF_BYTES = 8000;

export interface WalkWarning {
  readonly path: string;
  readonly message: string;
}

export interface WalkResult {
  readonly filePaths: string[];
  readonly warnings: WalkWarning[];
}

/**
 * Resolves a mix of file and directory arguments into a flat list of regular, non-binary files
 * to scan. Directories are walked recursively; symlinks are never followed, matching the safe
 * default of every other file-scanning tool in this family (avoids symlink-cycle recursion and
 * scanning files the user didn't intend to include).
 */
export async function resolveScanTargets(inputPaths: readonly string[], excludeNames: readonly string[]): Promise<WalkResult> {
  const filePaths: string[] = [];
  const warnings: WalkWarning[] = [];

  for (const inputPath of inputPaths) {
    await visit(inputPath);
  }

  return { filePaths, warnings };

  async function visit(entryPath: string): Promise<void> {
    let stats;
    try {
      stats = await stat(entryPath);
    } catch (error) {
      warnings.push({ path: entryPath, message: describeError(error) });
      return;
    }

    if (stats.isDirectory()) {
      await walkDirectory(entryPath);
    } else if (stats.isFile()) {
      await addIfTextFile(entryPath);
    }
  }

  async function walkDirectory(directoryPath: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
      warnings.push({ path: directoryPath, message: describeError(error) });
      return;
    }

    for (const entry of entries) {
      if (matchesAnyName(entry.name, excludeNames)) {
        continue;
      }
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        await walkDirectory(entryPath);
      } else if (entry.isFile()) {
        await addIfTextFile(entryPath);
      }
    }
  }

  async function addIfTextFile(filePath: string): Promise<void> {
    if (await isBinaryFile(filePath)) {
      return;
    }
    filePaths.push(filePath);
  }
}

/**
 * Treats a file as binary if a NUL byte appears in its first chunk - the same heuristic used by
 * `file`, `grep -I`, and git's own binary detection. Secrets are never usefully embedded in
 * binary blobs, and reading/regex-scanning huge binaries is wasted work.
 */
async function isBinaryFile(filePath: string): Promise<boolean> {
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(BINARY_SNIFF_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, BINARY_SNIFF_BYTES, 0);
    return buffer.subarray(0, bytesRead).includes(0);
  } finally {
    await handle.close();
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
