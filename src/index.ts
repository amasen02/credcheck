export { isAllowlistedByConfig, isAllowlistedInline, isPathIgnored, loadAllowlistConfig, AllowlistConfigError } from "./allowlist.js";
export { detectInContent, detectInLines } from "./detector.js";
export { shannonEntropy } from "./entropy.js";
export { computeFingerprint } from "./fingerprint.js";
export { getStagedAddedLines, GitError } from "./git.js";
export { redactSecret } from "./redact.js";
export { BUILT_IN_RULES } from "./rules.js";
export { resolveScanTargets, DEFAULT_EXCLUDES } from "./scanner.js";
export { runScan } from "./scan.js";
export { renderReportText, toJsonReport } from "./render.js";
export type {
  AllowlistConfig,
  Finding,
  KeyedEntropyRule,
  KeyedLiteralRule,
  PatternRule,
  RawFinding,
  Rule,
  ScanReport,
  Severity,
} from "./types.js";
export type { ScanOptions, ScanOutcome } from "./scan.js";
