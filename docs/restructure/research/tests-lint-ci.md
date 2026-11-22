# Tests, lint scope and CI shape

Last verified: commit `4550705`, 2026-11-22. Repo facts were re-checked against the code. Nothing was re-run. External claims carry the source the original research cited.

## Question

What test suite, lint rule set and CI shape should replace the current setup, which is heavy, strict and slow?

## Repo facts (verified)

| Fact                                                                                                                                             | Evidence                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Four Vitest projects: node, dom (jsdom), convex (edge-runtime), storybook (Playwright Chromium)                                                  | `vitest.config.ts:28-69`                           |
| Which tests run in Node depends on a hand-kept 11-glob `NODE_TESTS` list; everything else runs in jsdom                                          | `vitest.config.ts:8-20, 34-37`                     |
| CI runs only `check:unit` (node + dom). It never runs the convex project or the stories                                                          | `vite.config.ts:67-68`, `ci.yaml:33-48`            |
| Lint: `correctness: error`, `typeAware: true`, `import/no-cycle: error`, plus style rules and policy rules (`no-explicit-any`, `ban-ts-comment`) | `oxlint.config.ts:109-138`                         |
| A local JS plugin adds `app/no-inline-style`, `no-raw-style-props` and `no-datasource-query`, with folder overrides                              | `oxlint.config.ts:116,163-217`                     |
| `lint/rules.test.ts` spawns oxlint and stylelint processes against `oxlint.config.ts` (not the merged `vite.config.ts` config)                   | `lint/rules.test.ts:1-2,22`                        |
| `lint/docs.test.ts` checks doc links                                                                                                             | `lint/docs.test.ts`                                |
| `plugins.config.test.ts:74` expects a POSIX path, so it fails on Windows                                                                         | `plugins.config.test.ts:20,74`                     |
| Stylelint extends `standard` and adds design-token rules with per-folder overrides                                                               | `.stylelintrc.json:2-68`                           |
| Renovate caps `oxc-transform-react` at `~0.152.0`, while `package.json` pins `0.156.0` and `pnpm-workspace.yaml:48` says `<0.157` is accepted    | `.github/renovate.json5:36-40`, `package.json:125` |
| The deploy runs in parallel with CI on push to `main` and is not gated on it                                                                     | `github-pages.yaml:3-21`                           |
| The pre-commit hook is format-only and never blocks                                                                                              | `.vite-hooks/pre-commit:1`, `vite.config.ts:48-50` |
| There are 20 story files; a11y test level is `error`, with colour-contrast off                                                                   | `.storybook/preview.tsx:28-30`                     |

## Measured, not re-run (2026-11-21)

The unit run was red in 2 of 94 files: `lint/docs.test.ts` (dead links) and `plugins.config.test.ts:74` (POSIX path). jsdom was created 52 times.

## External evidence (cited by the original research, not re-fetched)

| Claim                                                                                     | Source                                 |
| ----------------------------------------------------------------------------------------- | -------------------------------------- |
| oxlint categories, type-aware backend, `import/no-cycle` cost                             | oxc.rs linter docs                     |
| Vite+ recommends one `lint` block and ships `RuleTester`                                  | viteplus.dev/guide/lint                |
| Vitest performance levers, browser mode                                                   | vitest.dev/guide/improving-performance |
| Skipped GitHub jobs report Success; path-filtered workflows leave required checks pending | docs.github.com (Actions)              |
| Testing-trophy priorities                                                                 | kentcdodds.com testing trophy          |

## Proposals (not decided)

- **Green baseline.** Fix the POSIX-path test, then fix or cut `docs.test.ts` and `toolchain.test.ts`, and fix the Renovate cap. → D-01, phase 2
- **Test environment.** Choose it by file extension (`.test.ts` runs in node, `.test.tsx` in jsdom), with a docblock for exceptions. → D-09
- **Cut low-value tests.** Remove the change-detector tests (primitives, most semantic and theme tests, `getIntegrations`). Remove `rules.test.ts` and its fixtures. → D-09
- **Lint.** Keep correctness, hooks, Compiler rules and type checking. Drop the style and restriction rules. Replace `layer()` with package boundaries after the move. → D-06, D-09
- **CI.** One workflow with parallel jobs, a `ci-ok` aggregator and the deploy gated on CI. Add the convex project and the relay build. Stories are an optional job (user answer). → D-10

## Open questions

- Do any design-token lint rules stay, as warnings? → D-09
- Do `no-explicit-any` and `ban-ts-comment` stay? → D-09
- Coverage target: ECC's default is 80 %, while U8 says to shrink the tests. → D-11

## Corrections to the earlier version

- `rules.test.ts` uses a 15 s helper timeout and 20 s test timeouts. The earlier version did not give the helper timeout.
- Dropping the JS-plugin rules also removes their folder overrides (`oxlint.config.ts:175-217`). The earlier version did not mention this.
