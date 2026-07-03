export type Severity = "critical" | "high" | "medium";

/** A pattern rule matches a self-contained secret shape (an AWS key, a JWT, a PEM header, ...). */
export interface PatternRule {
  readonly id: string;
  readonly description: string;
  readonly severity: Severity;
  readonly kind: "pattern";
  readonly pattern: RegExp;
}

/**
 * A keyed-entropy rule fires on `key = value` / `key: "value"` assignments whose key name looks
 * secret-shaped (e.g. `api_key`, `aws_secret_access_key`) and whose value clears an entropy bar,
 * so `apiKey = "sk_live_51H..."` is flagged but `apiKey = "your-key-here"` is not.
 */
export interface KeyedEntropyRule {
  readonly id: string;
  readonly description: string;
  readonly severity: Severity;
  readonly kind: "keyed-entropy";
  readonly keyPattern: RegExp;
  readonly minValueLength: number;
  readonly maxValueLength: number;
  readonly minEntropyBitsPerChar: number;
}

/**
 * A keyed-literal rule fires on `key = value` assignments whose key name looks credential-shaped
 * (e.g. `password`) and whose value is a non-empty literal that isn't an obvious placeholder.
 * Unlike keyed-entropy, no entropy bar applies: plain-English passwords are still worth flagging.
 */
export interface KeyedLiteralRule {
  readonly id: string;
  readonly description: string;
  readonly severity: Severity;
  readonly kind: "keyed-literal";
  readonly keyPattern: RegExp;
  readonly minValueLength: number;
}

export type Rule = PatternRule | KeyedEntropyRule | KeyedLiteralRule;

export interface RawFinding {
  readonly ruleId: string;
  readonly ruleDescription: string;
  readonly severity: Severity;
  readonly filePath: string;
  readonly line: number;
  readonly column: number;
  readonly secret: string;
}

export interface Finding extends RawFinding {
  readonly redactedSecret: string;
  readonly fingerprint: string;
}

export interface AllowlistConfig {
  readonly ignorePaths: readonly string[];
  readonly ignoreRules: readonly string[];
  readonly allowFingerprints: readonly string[];
}

export interface ScanReport {
  readonly findings: readonly Finding[];
  readonly filesScanned: number;
  readonly allowlistedCount: number;
}
