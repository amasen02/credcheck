import { readFile } from "node:fs/promises";
import { isAllowlistedByConfig, isAllowlistedInline, isPathIgnored } from "./allowlist.js";
import { detectInContent, detectInLines, type NumberedLine } from "./detector.js";
import { computeFingerprint } from "./fingerprint.js";
import { getStagedAddedLines } from "./git.js";
import { toPosixRelativePath } from "./paths.js";
import { redactSecret } from "./redact.js";
import { BUILT_IN_RULES } from "./rules.js";
import { resolveScanTargets, type WalkWarning } from "./scanner.js";
import type { AllowlistConfig, Finding, RawFinding, Rule, ScanReport } from "./types.js";

export interface ScanOptions {
  readonly targets: readonly string[];
  readonly staged: boolean;
  readonly cwd: string;
  readonly excludeNames: readonly string[];
  readonly disabledRuleIds: readonly string[];
  readonly allowlist: AllowlistConfig;
}

export interface ScanOutcome {
  readonly report: ScanReport;
  readonly warnings: readonly WalkWarning[];
}

export async function runScan(options: ScanOptions): Promise<ScanOutcome> {
  const activeRules = selectActiveRules(options.disabledRuleIds, options.allowlist.ignoreRules);

  if (options.staged) {
    return { report: scanStaged(options.cwd, activeRules, options.allowlist), warnings: [] };
  }
  return scanPaths(options, activeRules);
}

function selectActiveRules(disabledRuleIds: readonly string[], ignoreRuleIds: readonly string[]): Rule[] {
  const disabled = new Set([...disabledRuleIds, ...ignoreRuleIds]);
  return BUILT_IN_RULES.filter((rule) => !disabled.has(rule.id));
}

function scanStaged(cwd: string, rules: readonly Rule[], allowlist: AllowlistConfig): ScanReport {
  const stagedFiles = getStagedAddedLines(cwd);
  const findings: Finding[] = [];
  let allowlistedCount = 0;
  let filesScanned = 0;

  for (const file of stagedFiles) {
    if (isPathIgnored(file.filePath, allowlist)) {
      continue;
    }
    filesScanned += 1;

    const lines: readonly NumberedLine[] = file.addedLines;
    const raw = detectInLines(file.filePath, lines, rules);
    const lineTextByNumber = new Map(file.addedLines.map((entry) => [entry.line, entry.content]));
    const finalized = finalizeFindings(raw, lineTextByNumber, allowlist);
    findings.push(...finalized.findings);
    allowlistedCount += finalized.allowlistedCount;
  }

  return { findings, filesScanned, allowlistedCount };
}

async function scanPaths(options: ScanOptions, rules: readonly Rule[]): Promise<ScanOutcome> {
  const { filePaths, warnings } = await resolveScanTargets(options.targets, options.excludeNames);
  const findings: Finding[] = [];
  let allowlistedCount = 0;
  let filesScanned = 0;

  for (const filePath of filePaths) {
    const displayPath = toPosixRelativePath(options.cwd, filePath);
    if (isPathIgnored(displayPath, options.allowlist)) {
      continue;
    }
    filesScanned += 1;

    const content = await readFile(filePath, "utf8");
    const raw = detectInContent(displayPath, content, rules);
    const lineTextByNumber = new Map(content.split(/\r\n|\r|\n/).map((text, index) => [index + 1, text]));
    const finalized = finalizeFindings(raw, lineTextByNumber, options.allowlist);
    findings.push(...finalized.findings);
    allowlistedCount += finalized.allowlistedCount;
  }

  return { report: { findings, filesScanned, allowlistedCount }, warnings };
}

function finalizeFindings(
  raw: readonly RawFinding[],
  lineTextByNumber: ReadonlyMap<number, string>,
  allowlist: AllowlistConfig,
): { findings: Finding[]; allowlistedCount: number } {
  const findings: Finding[] = [];
  let allowlistedCount = 0;

  for (const rawFinding of raw) {
    const fingerprint = computeFingerprint(rawFinding.ruleId, rawFinding.filePath, rawFinding.secret);
    const lineText = lineTextByNumber.get(rawFinding.line) ?? "";

    if (isAllowlistedByConfig(rawFinding, fingerprint, allowlist) || isAllowlistedInline(lineText)) {
      allowlistedCount += 1;
      continue;
    }

    findings.push({ ...rawFinding, redactedSecret: redactSecret(rawFinding.secret), fingerprint });
  }

  return { findings, allowlistedCount };
}
