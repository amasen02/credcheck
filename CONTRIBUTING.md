# Contributing to credcheck

Pull requests are welcome — new detection rules, fewer false positives, better docs — provided
they keep the tone and quality of the codebase.

## Ground rules

1. **One concern per pull request.** No drive-by refactors mixed with feature work.
2. **Branch from `main`**, keep the branch short, and squash-merge back.
3. **Conventional commits** (`feat:`, `fix:`, `perf:`, `refactor:`, `test:`, `docs:`, `chore:`).
4. **Green CI is non-negotiable.** Lint, typecheck, build, and test must all pass before review.
5. **The PR template must be filled.** Empty checkboxes block review.

## Coding standards

- **TypeScript strict mode.** No `any`, no unjustified `as`/`!` assertions — see `tsconfig.json`.
- **Zero runtime dependencies.** This is a deliberate design constraint: the whole tool is regexes,
  entropy math, and Node's own `fs`/`child_process`. A new feature is not a reason to add one —
  discuss first if you think an exception is warranted.
- **Intention-revealing names.** Full descriptive identifiers; `c`, `tmp`, `mgr` are rejected.
- **Comments explain *why*, never *what*.** No filler comments.
- **SOLID / KISS / DRY / YAGNI.** One responsibility per module; the simplest correct solution wins.

## Adding a detection rule

Rules live in `src/rules.ts` as one of three kinds (see the doc comment there): `pattern` (the
secret's own shape is the signal), `keyed-entropy` (a secret-looking variable name plus a
high-entropy value), or `keyed-literal` (a credential-looking variable name plus a non-placeholder
literal, no entropy bar — used for passwords). Pick the narrowest kind that fits; a new bare
`pattern` regex that's too generic is the single easiest way to flood users with false positives.

Every new rule needs, in `test/detector.test.ts`:

- A positive test with a realistic (but fake) example value.
- A negative test proving it doesn't fire on an obvious placeholder or an unrelated value.

If the rule's value shape could plausibly appear in a public example (the way AWS's own docs
publish `AKIAIOSFODNN7EXAMPLE`), consider whether it belongs in `src/known-safe.ts` instead of, or
in addition to, the rule itself.

## Build, test, run

```bash
npm install
npm run lint          # eslint
npm run typecheck     # tsc --noEmit, src and test
npm run build          # tsc -> dist/
npm test              # node's built-in test runner via tsx
node dist/cli.js --help
```

## Tests

A pull request that ships behavior without a test is sent back unless it is purely documentation.

Tests exercise real temporary directories and real `git` subprocesses (via `node:fs` and
`node:test`) rather than mocking the filesystem or git — this project's entire value proposition
is correctly reading real files and real diffs, so the tests exercise the real thing.

## Reporting bugs, false positives, and proposing features

Use the issue templates — there's a dedicated one for detection false positives/negatives. For
security vulnerabilities, **do not open a public issue** — follow [`SECURITY.md`](SECURITY.md).
