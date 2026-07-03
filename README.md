# credcheck — local secrets & credential scanner

[![CI](https://github.com/amasen02/credcheck/actions/workflows/ci.yml/badge.svg)](https://github.com/amasen02/credcheck/actions/workflows/ci.yml)
[![CodeQL](https://github.com/amasen02/credcheck/actions/workflows/codeql.yml/badge.svg)](https://github.com/amasen02/credcheck/actions/workflows/codeql.yml)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-blue)](CODE_OF_CONDUCT.md)

A fast CLI that scans files — or just your staged git changes — for likely-leaked secrets: AWS
keys, private key blocks, GitHub/GitLab/Slack/npm/Stripe tokens, JWTs, and generic high-entropy
API keys and passwords. Zero runtime dependencies.

```
$ credcheck src/
CRITICAL  src/config.ts:12:15  AWS access key ID [aws-access-key-id]
    AKIA************MNOP  (fingerprint: 7e3a1c9b4f2d8e01)

Found 1 likely secret(s) across 43 file(s) scanned.
```

## Why entropy + allowlisting, not just regexes

A regex alone can't tell `apiKey = "sk_live_51H8xJ2KZT..."` (a real leaked key) from
`apiKey = "your-key-here"` (a placeholder) — both match "an API key assignment." credcheck's
generic rules require both a secret-shaped variable name **and** a value whose
[Shannon entropy](src/entropy.ts) clears a threshold, so placeholders, short strings, and
low-entropy filler (`"aaaaaaaa"`, `"changeme"`) never fire. Structural secrets (an AWS key ID, a
PEM header, a JWT) fire on shape alone, since no legitimate value looks like one by accident —
including the one well-known exception, AWS's own published example key, which is hard-coded as
safe (see [`src/known-safe.ts`](src/known-safe.ts)) exactly like gitleaks and truffleHog do.

Every finding gets a stable **fingerprint** (a truncated hash of the rule, path, and secret) so
you can allowlist one specific false positive without disabling the rule everywhere else.

## Install

Requires Node.js **20+**. Not yet published to npm — install from source:

```bash
git clone https://github.com/amasen02/credcheck.git
cd credcheck
npm install
npm run build
npm link          # makes `credcheck` available on your PATH
```

Or run it without installing:

```bash
npm install
npm run build
node dist/cli.js <path...>
```

## Usage

```
credcheck [paths...] [options]
```

| Flag | Meaning |
|---|---|
| `--staged` | Scan only the **added lines** of the staged git diff — ideal for a pre-commit hook. Ignores any positional paths. |
| `--config <path>` | Allowlist config file (default: `.credcheckrc.json` in the cwd, if present). |
| `--exclude <pattern>` | Skip files/dirs matching a name pattern (repeatable). Always excludes `node_modules`, `.git`, `dist`, `build`, `coverage`, `.next`, `out`. |
| `--disable-rule <id>` | Disable a built-in rule by id (repeatable). |
| `--json` | Print a machine-readable report instead of text. |
| `-h, --help` / `-v, --version` | Show help or the installed version. |

Exit codes: `0` no secrets found, `1` likely secret(s) found, `2` invalid arguments or allowlist
config, `3` a runtime error prevented the scan (e.g. `--staged` outside a git repository).

### Examples

```bash
# Scan a directory tree
credcheck src/

# Pre-commit hook: only fail on secrets you're about to introduce
credcheck --staged

# Machine-readable output for CI
credcheck src/ --json > report.json

# Turn off a noisy rule for this run
credcheck src/ --disable-rule generic-api-key-assignment
```

### As a pre-commit hook

```bash
#!/bin/sh
# .git/hooks/pre-commit
credcheck --staged || exit 1
```

## Detection rules

| Rule id | Kind | Severity |
|---|---|---|
| `private-key-block` | PEM/OpenSSH private key header | critical |
| `aws-access-key-id` | AWS access key ID shape | critical |
| `aws-secret-access-key` | `aws_secret_access_key`-style assignment + entropy | critical |
| `github-token` | `ghp_`/`gho_`/`ghu_`/`ghs_`/`ghr_` token | critical |
| `github-fine-grained-pat` | `github_pat_...` token | critical |
| `stripe-live-key` | `sk_live_`/`rk_live_` key | critical |
| `gitlab-pat` | `glpat-...` token | high |
| `slack-token` | `xoxb-`/`xoxp-`/... token | high |
| `google-api-key` | `AIza...` key | high |
| `npm-token` | `npm_...` token | high |
| `slack-webhook-url` | `hooks.slack.com/services/...` URL | medium |
| `stripe-test-key` | `sk_test_`/`rk_test_` key | medium |
| `jwt` | Three-part JSON Web Token | medium |
| `generic-api-key-assignment` | secret-shaped variable name + high-entropy value | medium |
| `hardcoded-password-assignment` | password-shaped variable name + non-placeholder literal | medium |

## Suppressing a false positive

Three ways, from narrowest to broadest:

1. **Inline**, on the offending line: `const key = "..."; // credcheck:allow rotated, safe`
2. **By fingerprint**, in `.credcheckrc.json` (copy the fingerprint from a finding's output):
   ```json
   { "allowFingerprints": ["7e3a1c9b4f2d8e01"] }
   ```
3. **By path glob or rule id**, in `.credcheckrc.json`:
   ```json
   {
     "ignorePaths": ["test/fixtures/**", "*.pem.example"],
     "ignoreRules": ["jwt"]
   }
   ```

`ignorePaths` entries without a `/` match the basename at any depth (`*.pem` skips a matching
file anywhere); entries with a `/` match the full relative path, and `**` spans directories.

## Tests

```bash
npm test
```

The suite (100+ tests, `node:test`) exercises real temporary directories and real `git`
subprocesses rather than mocking the filesystem or git — this tool's entire value is correctly
reading real files and real diffs. It covers every built-in rule (both a firing case and a
placeholder/negative case), the entropy and redaction math, the `git diff` parser, the allowlist
config loader, and end-to-end CLI invocations spawned as a real subprocess.

## Architecture (separation of concerns)

```
src/
  cli.ts            CLI entry: parse args -> load allowlist -> scan -> render -> exit code
  cli-args.ts        argv parsing (node:util parseArgs) + validation
  rules.ts            built-in detector definitions (pattern / keyed-entropy / keyed-literal)
  entropy.ts          Shannon entropy of a candidate value
  known-safe.ts       hard-coded exceptions (AWS's own example key) + placeholder detection
  detector.ts         runs rules against line-numbered content, dedupes overlapping matches
  scanner.ts          recursive filesystem walk, binary-file sniffing, exclude-aware
  git.ts              `git diff --cached` unified-diff parsing -> added lines per file
  scan.ts             orchestrates scanner/git -> detector -> allowlist -> Finding[]
  allowlist.ts         .credcheckrc.json loading + rule-id/fingerprint/path/inline suppression
  fingerprint.ts       stable (rule, path, secret) hash for allowlisting
  redact.ts           never print a secret in full
  paths.ts            OS-native path -> portable forward-slash display path
  format.ts / render.ts  ANSI colour handling, text/JSON rendering
  index.ts            public API surface for programmatic use
test/                node:test unit + integration tests, one file per src module
```

## Contributing

Contributions are welcome — new detection rules, fewer false positives, better docs. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow and coding bar, and please be mindful of the
[Code of Conduct](CODE_OF_CONDUCT.md). Use the issue templates — there's a dedicated one for
detection false positives/negatives; green CI (lint, typecheck, build, test) is required on every
pull request. Report security issues privately per [`SECURITY.md`](SECURITY.md) — never as a
public issue.

## Open source commitments

This project is, and will remain, free and open source. As maintainer I commit to:

- **A permissive licence, kept stable.** [MIT](LICENSE) — use it commercially, fork it, build on
  it. No relicensing of accepted contributions.
- **No CLA.** Contributions are accepted under the MIT licence; you keep the copyright to your work.
- **An honest history.** Real, walkable commits — no fabricated activity, no rewritten releases.
- **Best-effort, transparent triage.** Issues and pull requests are read and answered; security
  reports are acknowledged within 72 hours.
- **A welcoming community** governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
- **Reproducible builds.** Green CI — lint, typecheck, tests, and CodeQL security analysis — on
  every change.

## License

MIT — see [`LICENSE`](LICENSE). You are free to use, modify, and distribute this software,
including for commercial purposes, provided the copyright notice is retained.

## Author

**Ama Senevirathne** — [GitHub](https://github.com/amasen02)
