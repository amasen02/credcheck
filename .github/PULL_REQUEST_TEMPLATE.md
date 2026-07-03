## What

<!-- One short paragraph: what does this PR change? -->

## Why

<!-- Link an issue, or describe the driver. -->

## How

<!-- Notable design decisions, trade-offs, alternatives considered. -->

## Affected area

- [ ] Detection rules (`src/rules.ts`, `src/detector.ts`)
- [ ] Allowlist / suppression (config file, inline comments, fingerprints)
- [ ] Filesystem scanning
- [ ] `--staged` / git diff parsing
- [ ] CLI parsing / options
- [ ] Output formats (text / JSON)
- [ ] Docs

## Tests

- [ ] Unit / integration tests added or updated
- [ ] `npm test` passes locally
- [ ] `npm run lint` and `npm run typecheck` pass locally

## Checklist

- [ ] No secrets or credentials committed
- [ ] No new runtime dependency added (or the exception is discussed in "Why")
- [ ] A new detection rule includes both a positive test and a false-positive/placeholder test
- [ ] `--help` / README updated if flags or behaviour changed
- [ ] Conventional-commit title
