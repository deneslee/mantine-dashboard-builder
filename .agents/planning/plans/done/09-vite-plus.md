# 09 Vite+ migration

Status: done (2026-10-23) · Cross-cutting · Depends on: none · Research: [Vite+ migration guide](https://viteplus.dev/guide/vitest-v5)

## Goal

Finish the Vite+ migration without losing the project's lint rules or test coverage, and enforce the requested Node and pnpm versions.

## Design

Vite+ selects the exact versions declared in `package.json`; pnpm rejects mismatched runtime and package-manager versions. Keep the existing lint rule object in `oxlint.config.ts` and compose it into the root Vite+ config. Test the same lint entry point used by developers. Keep Storybook discovery and its plugin filter unchanged unless validation demonstrates a migration defect.

## Tasks

- [x] **Toolchain.** Pin Node 24.22.1 and pnpm 12.15.0, synchronize dependencies, and verify mismatched versions fail with a useful diagnostic.
- [x] **Migration repairs.** Restore lint rules and fixture exclusions, update the lint test entry point and matcher types, and align Oxfmt/editor configuration.
- [x] **Documentation and CI.** Document the version policy and Vite+ commands, and keep CI on the same pins.
- [x] **Verification.** Pass formatting, lint, type checks, unit tests, Storybook tests and the production build.

## Decisions

- 2026-10-23: Use built-in engine and package-manager checks instead of adding a custom version-check script. Preserve Stylelint as a separate check.
- 2026-10-23: Fixture tests load the shared rules through Vite+ with an explicit config, because config-level fixture exclusions are not overridden by `--no-ignore`. Give Storybook a local tsconfig extending the app config so Vite+'s type checker sees its CSS declarations. Initialize the Sentry console log lazily to satisfy the restored React purity rule.
- 2026-10-23: Keep local agent settings and imported assets outside formatting. Oxfmt owns editor formatting and the root format config; remove the duplicate Prettier ignore file.
- 2026-10-23: The two lint CLI integration tests allow 20 seconds, with each child process capped at 15 seconds. Vite+ startup took 7.3 seconds alongside the full browser suite, exceeding Vitest's default 5 seconds; assertions and other test timeouts are unchanged.

## Verification

- `vp install --frozen-lockfile`: passed, including supply-chain policy verification.
- `vp check`: formatting, lint and type checks passed; `vp run lint:css`: passed.
- `vp run test`: all 54 files and 275 tests passed, including 63 Storybook browser tests.
- `vp run typecheck` and `vp run build`: passed. The build still reports React Compiler skips for TanStack Virtual and unsupported Sentry control flow. Sentry source-map upload was disabled for local validation.
- Wrong pnpm 12.5.1: rejected with `ERR_PNPM_BAD_PM_VERSION`. Wrong Node 24.15.0: rejected with `ERR_PNPM_BAD_RUNTIME_VERSION`. npm: rejected with `EBADDEVENGINES` identifying pnpm as the required manager.
- GitHub Actions configuration was updated but not run remotely.
