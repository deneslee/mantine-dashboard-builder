# Task running and caching

Last verified: commit `4550705`, 2026-11-22. Repo facts were re-checked against the code. Timings come from the 2026-11-21 runs and were not re-run. External claims carry the source the original research cited; they were not re-fetched.

## Question

Should anything (Turborepo, Nx, moon) run tasks alongside `vp run`, and why does a docs-only change miss the lint cache?

## Repo facts (verified)

| Fact                                                                                                                                        | Evidence                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Catalog pins `vite-plus` 1.6.0 and `vitest` 5.1.0                                                                                           | `pnpm-workspace.yaml:66-70`                          |
| `cacheInput` is `{auto:true}` plus `!.git` and does **not** exclude `docs/`                                                                 | `vite.config.ts:17-35`                               |
| `check:build`, `check:lint`, `check:fmt`, `check:test`, `check:unit` and `check:stories` use `cacheInput`; `check:css` uses explicit inputs | `vite.config.ts:58-68`                               |
| The `check:build` `cache.env` is only `SENTRY_*`, although the build embeds `GITHUB_*` values                                               | `vite.config.ts:58`, `plugins.config.ts:110,111,221` |
| `typecheck` is an alias of `check:lint` (tsgolint, `typeCheck: true`); there is no `tsc` step                                               | `package.json:32`, `vite.config.ts:55-56,75`         |
| CI runs `vp run check:{lint,css,fmt,unit,build}` in one job and restores no task cache                                                      | `.github/workflows/ci.yaml:28-48`                    |
| The Pages workflow runs `vp check --no-fmt` and `vp build` directly and is not gated on CI                                                  | `.github/workflows/github-pages.yaml:36-40`          |
| The only workspace member is `relay`                                                                                                        | `pnpm-workspace.yaml:3`                              |

## Measured, not re-run (2026-11-21, Windows)

- A cold lint run took 164 s.
- The unit run took 269 s and was red in 2 of 94 files.
- A docs-only change caused a lint cache miss.

## External evidence (cited by the original research, not re-fetched)

| Claim                                                                                                  | Source                                           |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Vite Task auto-tracks inputs, including directory listings; only exit-0 runs are cached                | viteplus.dev/guide/run, viteplus.dev/guide/cache |
| Vite+ 1.6.0 applies `input` exclusions to listed folders                                               | vite-plus release v1.6.0                         |
| Remote cache not released yet                                                                          | voidzero-dev/vite-task issue 930                 |
| An Actions cache for the task cache is "experimental"                                                  | viteplus.dev/guide/github-actions-cache          |
| Turborepo `--affected`, Nx `affected`, moon `--affected` exist; the Nx self-hosted cache is deprecated | turborepo.dev, nx.dev, moonrepo.dev docs         |

**Hypotheses (no source):**

- `vp run` has no git "changed since" filter. This comes from a local `--help` read only.
- The jsdom import cost of 200–500 ms per file is unconfirmed: Context7 gave no URL.

## Proposals (not decided)

- **Runner.** Use `vp run` only, and add no other runner until there is a second app or a need for a shared cache. → D-08
- **Cache inputs.** Exclude `docs/**` from them. Add `GITHUB_*` to `check:build` `cache.env`. → part of the green-baseline phase
- **CI.** Optionally restore the Actions task cache, but keep it only if it is measured faster. → D-10
- **Lint speed.** Try Vite+ 1.7 (tsrs backend) and re-measure lint.

## Open questions

- Is a cache shared across developers and CI needed before Vite+ remote cache ships?
- Must type-aware lint run on every local commit, or only at pre-push and in CI?

## Corrections to the earlier version

- Not every `check:*` task uses `cacheInput`: `check:css` does not.
- The pre-commit hook is `vp staged || echo …`, so it never blocks a commit (`.vite-hooks/pre-commit:1`).
