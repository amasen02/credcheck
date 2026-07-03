import { paint, paintSeverity } from "./format.js";
import type { Finding, ScanReport } from "./types.js";

export function renderReportText(report: ScanReport, useColor: boolean): string {
  if (report.findings.length === 0) {
    const suffix = report.allowlistedCount > 0 ? ` (${String(report.allowlistedCount)} allowlisted)` : "";
    return paint(`No secrets found. Scanned ${String(report.filesScanned)} file(s)${suffix}.`, "green", useColor);
  }

  const lines = report.findings.map((finding) => renderFinding(finding, useColor));
  const summary = `Found ${String(report.findings.length)} likely secret(s) across ${String(report.filesScanned)} file(s) scanned` + (report.allowlistedCount > 0 ? `, ${String(report.allowlistedCount)} allowlisted.` : ".");

  return [...lines, "", summary].join("\n");
}

function renderFinding(finding: Finding, useColor: boolean): string {
  const location = paint(`${finding.filePath}:${String(finding.line)}:${String(finding.column)}`, "bold", useColor);
  const severity = paintSeverity(finding.severity, useColor);
  return `${severity}  ${location}  ${finding.ruleDescription} [${finding.ruleId}]\n    ${finding.redactedSecret}  (fingerprint: ${finding.fingerprint})`;
}

export type RedactedFinding = Omit<Finding, "secret">;

export interface JsonReport {
  readonly findings: readonly RedactedFinding[];
  readonly filesScanned: number;
  readonly allowlistedCount: number;
  readonly leaksFound: boolean;
}

/**
 * Strips the raw `secret` value before serializing: `--json` output is the kind of thing that
 * ends up in CI logs, Slack notifications, or a saved artifact, so it must carry the same
 * redaction guarantee as the text renderer, not just whatever `Finding` happens to contain.
 */
export function toJsonReport(report: ScanReport): JsonReport {
  return {
    findings: report.findings.map(toRedactedFinding),
    filesScanned: report.filesScanned,
    allowlistedCount: report.allowlistedCount,
    leaksFound: report.findings.length > 0,
  };
}

function toRedactedFinding(finding: Finding): RedactedFinding {
  return {
    ruleId: finding.ruleId,
    ruleDescription: finding.ruleDescription,
    severity: finding.severity,
    filePath: finding.filePath,
    line: finding.line,
    column: finding.column,
    redactedSecret: finding.redactedSecret,
    fingerprint: finding.fingerprint,
  };
}
