# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Keyed rules (`generic-api-key-assignment`, `hardcoded-password-assignment`,
  `aws-secret-access-key`) now fire on quoted keys, so JSON configuration files are actually
  scanned. The assignment regex required the key to be followed directly by `:` or `=`, which the
  closing quote in `"apiKey": "..."` always blocked - every secret in `appsettings.json`,
  `config.json`, `firebase*.json` and similar files was silently missed.

### Security

- `redactSecret` no longer near-fully discloses short secrets. A 9-character password was printed
  with 8 of its 9 characters intact (`Summ*r!23`), and README-recommended usage writes that output
  to CI logs and `report.json`. Values under 12 characters are now masked in full, and longer ones
  reveal at most 40% of their characters (never more than 4 per edge).

## [1.0.0] - 2026-07-03

### Added

- Filesystem scanner: recursive directory walk with configurable exclude patterns and binary-file
  sniffing (files are skipped, not misread, based on a NUL-byte check).
- `--staged` mode: parses `git diff --cached` and scans only the lines a commit is about to add,
  so a pre-commit hook never re-flags pre-existing history it isn't touching.
- 15 built-in detection rules across three families: shape-only patterns (AWS access key IDs,
  PEM/OpenSSH private key headers, GitHub/GitLab/Slack/npm/Stripe tokens, JWTs), keyed-entropy
  rules (a secret-shaped variable name plus a value that clears a Shannon-entropy bar, covering
  AWS secret keys and generic API tokens), and a keyed-literal rule for hardcoded passwords.
- Hard-coded exception for AWS's own published example credential pair, and placeholder detection
  (`changeme`, `<your-key-here>`, `process.env.X`, ...) so obvious non-secrets never fire.
- Three-tier allowlisting: an inline `credcheck:allow` comment on the offending line, a stable
  per-finding fingerprint, and a `.credcheckrc.json` config file (rule ids and path globs).
- Secrets are never printed in full: findings are redacted to a few edge characters before being
  written to text or `--json` output.
- Human-readable and `--json` output formats, with exit codes distinguishing "no secrets," "found
  secrets," "invalid input," and "runtime error" for CI/hook integration.
- Zero runtime dependencies.

[1.0.0]: https://github.com/amasen02/credcheck/releases/tag/v1.0.0
