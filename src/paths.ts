import path from "node:path";

/** Renders a path relative to `cwd` with forward slashes, regardless of host OS, so displayed
 * paths and glob patterns in config files are portable between Windows, macOS, and Linux. */
export function toPosixRelativePath(cwd: string, targetPath: string): string {
  const relative = path.isAbsolute(targetPath) ? path.relative(cwd, targetPath) : targetPath;
  return relative.split(path.sep).join("/");
}
