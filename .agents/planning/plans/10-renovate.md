# 10 Renovate

Status: open (Oct 23, 2026) · Cross-cutting · Depends on: [09](done/09-vite-plus.md) · Research: [Renovate npm manager](https://docs.renovatebot.com/modules/manager/npm/), [Vite+ updates](https://viteplus.dev/guide/upgrade-project)

## Goal

Dependency updates arrive as grouped pull requests (Mantine, TanStack, React, the Vite+ toolchain and others), and CI proves each one works before it is merged. Renovate replaces Dependabot, which had only three groups and bumped the Vite+ toolchain's packages one by one.

## Design

- **Config:** [`.github/renovate.json5`](../../../.github/renovate.json5) holds every rule, with its reason next to it. Renovate reads the pnpm catalog in `pnpm-workspace.yaml` (including the `npm:` alias behind `vite`) and, since 44.128, `devEngines`.
- **Checks:** `github-pages.yaml` already runs lint, format, all tests (stories in Chromium) and the build on every pull request, and deploys only from main. Pull requests build without the Sentry token, so they upload no source maps.
- **Timing:** weekly, early Monday (UTC), plus weekly lockfile maintenance. A release must be 3 days old: pnpm's own `minimumReleaseAge` (1 day) rejects anything newer, and Renovate doesn't read it.
- **Held back:** react-grid-layout skips 2.3.0 and waits for Dependency Dashboard approval ([RGL.md](../../../docs/upgrades/RGL.md)). `oxc-transform-react` stays in the range `@vitejs/plugin-react` peers ([grid-and-charts.md › React Compiler](../../../docs/dashboard/grid-and-charts.md#react-compiler)).
- **Toolchain:** vite-plus pins Vitest and its Vite build exactly, and `peerDependencyRules` lets any `vite`/`vitest` through, so a half-updated group could still install. [`lint/toolchain.test.ts`](../../../lint/toolchain.test.ts) fails on that mismatch; `vp migrate` on the branch fixes it.

## Tasks

- [x] **Config.** Groups, schedule, release age, lockfile maintenance, `rangeStrategy: bump`, the two holds. Done when the Renovate config validator accepts it.
- [x] **Toolchain check.** `lint/toolchain.test.ts`. Done when it passes on the current lockfile.
- [x] **CI.** Pull requests build without the Sentry token.
- [x] **Retire Dependabot.** Delete `.github/dependabot.yml`.
- [ ] **Install the app.** Install the Mend Renovate GitHub App on this repository only, and turn off Dependabot security updates in the repository's security settings so they don't duplicate Renovate's. Done when the Dependency Dashboard issue appears.
- [ ] **Protect main.** Require the `build` check before merging, so a red update can't land. Done when a pull request with a failing check can't be merged.
- [ ] **First updates.** Done when the first grouped pull requests have run CI, and "First CI run" in [tasks.md](../tasks.md) is ticked.
- [ ] **Quarantine exemptions.** Once vite-plus 1.4.0 is a day old (after Oct 24, 03:40 UTC), remove the toolchain entries from `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`. Renovate's 3-day wait makes them unnecessary. Done when `vp install` passes without them.

## Decisions

- 2026-10-23: Hosted Mend app, not self-hosted Renovate. Self-hosting would allow running `vp migrate` after a toolchain update (`postUpgradeTasks`), but it needs a token and a runner; the toolchain check catches the rare mismatch instead.
- 2026-10-23: No automerge. Every update is merged by hand after CI; revisit once main is protected and the groups have proven quiet.
- 2026-10-23: `rangeStrategy: bump` rather than pinning everything: ranges stay, but their floor follows the version in use.

## Verification

- `renovate-config-validator --strict` (Renovate 44.181.0): passed as the repository config.
- Local dry run (`--platform=local --dry-run=lookup`, Oct 23): 16 branches. TanStack's seven packages share one, as do Storybook's five, Testing's seven and React's two; Sentry's major is its own branch. react-grid-layout and oxc-transform-react get no update; the catalog, `engines`, `devEngines`, `packageManager` and `.nvmrc` pins are all read. GitHub Actions weren't looked up (no token locally).
- `vp check` and `vp run test lint/`: passed, including the toolchain check.
