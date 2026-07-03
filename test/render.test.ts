import assert from "node:assert/strict";
import { test } from "node:test";
import { renderReportText, toJsonReport } from "../src/render.js";
import type { Finding, ScanReport } from "../src/types.js";
import { FAKE_AWS_ACCESS_KEY_ID } from "./fixtures.js";

const SAMPLE_FINDING: Finding = {
  ruleId: "aws-access-key-id",
  ruleDescription: "AWS access key ID",
  severity: "critical",
  filePath: "src/config.ts",
  line: 3,
  column: 10,
  secret: FAKE_AWS_ACCESS_KEY_ID,
  redactedSecret: "AKIA************MNOP",
  fingerprint: "abc123abc123abc1",
};

void test("renderReportText: a clean report reads as a success message with the file count", () => {
  const report: ScanReport = { findings: [], filesScanned: 12, allowlistedCount: 0 };
  const text = renderReportText(report, false);
  assert.match(text, /No secrets found/);
  assert.match(text, /12 file\(s\)/);
});

void test("renderReportText: mentions how many findings were allowlisted even when the report is clean", () => {
  const report: ScanReport = { findings: [], filesScanned: 5, allowlistedCount: 2 };
  const text = renderReportText(report, false);
  assert.match(text, /2 allowlisted/);
});

void test("renderReportText: a report with findings never prints the raw secret, only the redacted form", () => {
  const report: ScanReport = { findings: [SAMPLE_FINDING], filesScanned: 1, allowlistedCount: 0 };
  const text = renderReportText(report, false);
  assert.ok(!text.includes(SAMPLE_FINDING.secret));
  assert.ok(text.includes(SAMPLE_FINDING.redactedSecret));
  assert.match(text, /src\/config\.ts:3:10/);
  assert.match(text, /aws-access-key-id/);
  assert.match(text, /Found 1 likely secret/);
});

void test("toJsonReport: sets leaksFound based on whether any findings exist", () => {
  assert.equal(toJsonReport({ findings: [], filesScanned: 1, allowlistedCount: 0 }).leaksFound, false);
  assert.equal(toJsonReport({ findings: [SAMPLE_FINDING], filesScanned: 1, allowlistedCount: 0 }).leaksFound, true);
});

void test("toJsonReport: strips the raw secret value - JSON output carries the same redaction guarantee as text", () => {
  const report: ScanReport = { findings: [SAMPLE_FINDING], filesScanned: 3, allowlistedCount: 1 };
  const serialized = JSON.stringify(toJsonReport(report));
  assert.ok(!serialized.includes(SAMPLE_FINDING.secret));
  assert.ok(serialized.includes(SAMPLE_FINDING.redactedSecret));

  const roundTripped: unknown = JSON.parse(serialized);
  assert.deepEqual(roundTripped, {
    findings: [
      {
        ruleId: SAMPLE_FINDING.ruleId,
        ruleDescription: SAMPLE_FINDING.ruleDescription,
        severity: SAMPLE_FINDING.severity,
        filePath: SAMPLE_FINDING.filePath,
        line: SAMPLE_FINDING.line,
        column: SAMPLE_FINDING.column,
        redactedSecret: SAMPLE_FINDING.redactedSecret,
        fingerprint: SAMPLE_FINDING.fingerprint,
      },
    ],
    filesScanned: 3,
    allowlistedCount: 1,
    leaksFound: true,
  });
});
