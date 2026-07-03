import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { matchesAnyPath } from "./glob.js";
import type { AllowlistConfig, RawFinding } from "./types.js";

export const DEFAULT_CONFIG_FILENAME = ".credcheckrc.json";
export const INLINE_ALLOW_PATTERN = /credcheck:\s*allow/i;

export class AllowlistConfigError extends Error {}

const EMPTY_CONFIG: AllowlistConfig = { ignorePaths: [], ignoreRules: [], allowFingerprints: [] };

/**
 * Loads the allowlist config. `configPath` explicitly set by the user must exist; when omitted,
 * `.credcheckrc.json` in `cwd` is used if present and silently skipped otherwise (a scan without
 * a config file is a normal, common case, not an error).
 */
export function loadAllowlistConfig(cwd: string, configPath: string | undefined): AllowlistConfig {
  const resolvedPath = configPath !== undefined ? path.resolve(cwd, configPath) : path.join(cwd, DEFAULT_CONFIG_FILENAME);

  if (!existsSync(resolvedPath)) {
    if (configPath !== undefined) {
      throw new AllowlistConfigError(`config file not found: ${resolvedPath}`);
    }
    return EMPTY_CONFIG;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(resolvedPath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AllowlistConfigError(`invalid JSON in ${resolvedPath}: ${message}`);
  }

  return parseConfig(raw, resolvedPath);
}

function parseConfig(raw: unknown, sourcePath: string): AllowlistConfig {
  if (typeof raw !== "object" || raw === null) {
    throw new AllowlistConfigError(`${sourcePath} must contain a JSON object`);
  }
  const record = raw as Record<string, unknown>;
  return {
    ignorePaths: parseStringArray(record.ignorePaths, "ignorePaths", sourcePath),
    ignoreRules: parseStringArray(record.ignoreRules, "ignoreRules", sourcePath),
    allowFingerprints: parseStringArray(record.allowFingerprints, "allowFingerprints", sourcePath),
  };
}

function parseStringArray(value: unknown, field: string, sourcePath: string): readonly string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === "string")) {
    throw new AllowlistConfigError(`${sourcePath}: "${field}" must be an array of strings`);
  }
  return value;
}

/** True if the config's rule-id or fingerprint allowlist suppresses this specific finding. */
export function isAllowlistedByConfig(finding: RawFinding, fingerprint: string, config: AllowlistConfig): boolean {
  return config.ignoreRules.includes(finding.ruleId) || config.allowFingerprints.includes(fingerprint);
}

/** True if `displayPath` matches one of the config's `ignorePaths` globs, skipping the file entirely. */
export function isPathIgnored(displayPath: string, config: AllowlistConfig): boolean {
  return matchesAnyPath(displayPath, config.ignorePaths);
}

/** True if the source line itself carries a `credcheck:allow` suppression comment. */
export function isAllowlistedInline(lineText: string): boolean {
  return INLINE_ALLOW_PATTERN.test(lineText);
}
