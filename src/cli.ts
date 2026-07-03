#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AllowlistConfigError, loadAllowlistConfig } from "./allowlist.js";
import { CliArgError, parseCliArgs } from "./cli-args.js";
import { colorsEnabled } from "./format.js";
import { GitError } from "./git.js";
import { renderReportText, toJsonReport } from "./render.js";
import { runScan } from "./scan.js";
import { DEFAULT_EXCLUDES } from "./scanner.js";

const EXIT_SUCCESS = 0;
const EXIT_SECRETS_FOUND = 1;
const EXIT_ARG_ERROR = 2;
const EXIT_RUNTIME_ERROR = 3;

const HELP_TEXT = `credcheck - scan files or staged git changes for likely-leaked secrets

Usage:
  credcheck [paths...] [options]

Options:
      --staged                Scan only added lines in the staged git diff (for pre-commit hooks).
                               Ignores any positional paths.
      --config <path>         Allowlist config file (default: .credcheckrc.json in the cwd, if present)
      --exclude <pattern>     Skip files/dirs matching a name pattern (repeatable).
                               Always excludes: ${DEFAULT_EXCLUDES.join(", ")}
      --disable-rule <id>     Disable a built-in rule by id (repeatable)
      --json                  Print machine-readable JSON instead of text
  -h, --help                  Show this help text
  -v, --version               Show the installed version

Suppressing a false positive:
  - Inline: add a comment containing "credcheck:allow" on the offending line.
  - Config: list a rule id, path glob, or finding fingerprint in .credcheckrc.json.

Exit codes:
  0  scan completed, no secrets found
  1  scan completed, likely secret(s) found
  2  invalid command-line arguments or allowlist config
  3  a runtime error prevented the scan (e.g. --staged outside a git repository)
`;

function readPackageVersion(): string {
  const packageJsonPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
  const contents = readFileSync(packageJsonPath, "utf8");
  const parsed = JSON.parse(contents) as { version: string };
  return parsed.version;
}

async function main(): Promise<number> {
  let options;
  try {
    options = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof CliArgError) {
      process.stderr.write(`credcheck: ${error.message}\n`);
      return EXIT_ARG_ERROR;
    }
    throw error;
  }

  if (options.help) {
    process.stdout.write(HELP_TEXT);
    return EXIT_SUCCESS;
  }

  if (options.version) {
    process.stdout.write(`${readPackageVersion()}\n`);
    return EXIT_SUCCESS;
  }

  if (options.staged && options.paths.length > 0) {
    process.stderr.write("credcheck: --staged ignores positional path arguments\n");
  }

  const cwd = process.cwd();

  let allowlist;
  try {
    allowlist = loadAllowlistConfig(cwd, options.configPath);
  } catch (error) {
    if (error instanceof AllowlistConfigError) {
      process.stderr.write(`credcheck: ${error.message}\n`);
      return EXIT_ARG_ERROR;
    }
    throw error;
  }

  let outcome;
  try {
    outcome = await runScan({
      targets: options.paths.length > 0 ? options.paths : ["."],
      staged: options.staged,
      cwd,
      excludeNames: [...DEFAULT_EXCLUDES, ...options.excludePatterns],
      disabledRuleIds: options.disabledRuleIds,
      allowlist,
    });
  } catch (error) {
    if (error instanceof GitError) {
      process.stderr.write(`credcheck: ${error.message}\n`);
      return EXIT_RUNTIME_ERROR;
    }
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`credcheck: ${message}\n`);
    return EXIT_RUNTIME_ERROR;
  }

  for (const warning of outcome.warnings) {
    process.stderr.write(`credcheck: warning: ${warning.path}: ${warning.message}\n`);
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(toJsonReport(outcome.report), null, 2)}\n`);
  } else {
    process.stdout.write(`${renderReportText(outcome.report, colorsEnabled(process.stdout, process.env))}\n`);
  }

  return outcome.report.findings.length > 0 ? EXIT_SECRETS_FOUND : EXIT_SUCCESS;
}

main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error: unknown) => {
    const details = error instanceof Error ? (error.stack ?? error.message) : String(error);
    process.stderr.write(`credcheck: unexpected error: ${details}\n`);
    process.exitCode = EXIT_RUNTIME_ERROR;
  });
