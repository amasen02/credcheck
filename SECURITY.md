# Security policy

credcheck reads files under paths **you** specify (or the staged git diff of the repository
you run it in) and never writes to, deletes, or modifies anything. Its security surface is small
and entirely local; the notes below document the few areas worth understanding, especially since
this is a tool whose entire job is handling potential secrets.

## Security-relevant behaviour

| Area | Behaviour |
|---|---|
| Read-only | credcheck never writes, deletes, renames, or modifies any file it scans. It only reads. |
| No network access | credcheck never makes a network call. All work is local filesystem and `git` subprocess I/O. |
| No telemetry | Nothing is collected, logged externally, or phoned home. |
| Secrets are never printed in full | Findings are redacted (`redactSecret` in `src/redact.ts`) before being written to stdout or JSON output — a few edge characters at most, never the full value. |
| Secrets are never persisted | credcheck does not write scan results, caches, or logs to disk anywhere. Output goes to stdout/stderr only, for the caller to handle. |
| Allowlist fingerprints are one-way | The fingerprint used to allowlist a specific finding (`src/fingerprint.ts`) is a truncated SHA-256 hash, not a reversible encoding of the secret. |
| `git diff` is read-only | `--staged` mode runs `git diff --cached` and parses its output; it never modifies the index, working tree, or history. |
| Binary files are skipped | Files are sniffed for a NUL byte before reading; binaries are never loaded into memory or matched against rules. |
| Symlinks are not followed | Directory scanning does not follow symlinks, avoiding traversal outside the intended scan root. |

## What this tool does *not* protect against

credcheck is a detection aid, not a guarantee. A clean scan does not mean a codebase has no
leaked credentials — only that none matched a built-in rule and cleared its confidence bar. Treat
it as one layer alongside secret rotation, least-privilege credentials, and provider-side leak
detection (e.g. GitHub secret scanning), not a replacement for any of them.

## Reporting a vulnerability

Email `amasen02@gmail.com` with the subject prefix `[SECURITY]`, or open a private
[GitHub security advisory](https://github.com/amasen02/credcheck/security/advisories/new).
**Do not open a public issue.** Expect acknowledgement within 72 hours.

## Coordinated disclosure window

90 days from acknowledgement, unless mutually extended.
