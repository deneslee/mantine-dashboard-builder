# Current state: facts, gaps, requirements

Last verified: commit `4550705`, 2026-11-22. The facts were spot-checked with grep and glob. Timings were measured on 2026-11-21 and not re-run.

**This is a snapshot.** It saves re-exploring the code, but it goes out of date with every change. Before you act on a row, check it against the code and, if it has changed, update the row and its date. If this page and the code disagree, the code wins.

## A. Facts

| ID   | Fact                                                                                                                                                                                         | Evidence                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| F-01 | One SPA package `dashboard-builder`: React 19, TanStack Router, zod 4, Convex 1.50, pnpm, Vite+                                                                                              | `package.json:2,82,86,92,139`                                                             |
| F-02 | The only workspace member is `relay` (`dashboard-relay`, Hono)                                                                                                                               | `pnpm-workspace.yaml:2-3`, `relay/package.json:2,14`                                      |
| F-03 | `apps/docs` is a Markdown capability catalog (YAML plus a generator script) with no `package.json`                                                                                           | `apps/docs/` listing                                                                      |
| F-04 | Layer order is utils < core < ui < lib < plugins < shell < features < app, enforced by `layer()` + `no-restricted-imports`. `plugins` and `shell` are siblings and may not import each other | `oxlint.config.ts:222-277,243-252`                                                        |
| F-05 | Features may not import `app`, another feature, or plugin implementations; they go through `usePlugins`                                                                                      | `oxlint.config.ts:253-263`                                                                |
| F-06 | `src/plugins` holds both the contracts and all their implementations                                                                                                                         | `src/plugins/`                                                                            |
| F-07 | `PANELS` and `ACTIONS` are empty, and record providers are configured at import time                                                                                                         | `src/app/plugins.ts:14-19,38-39`                                                          |
| F-08 | `src/app/` has 23 root files that do four different jobs                                                                                                                                     | glob `src/app/*`                                                                          |
| F-09 | `PluginsProvider` imports a feature store, and 26 feature files import plugin contracts directly                                                                                             | `PluginsProvider.tsx:2`, grep `src/features`                                              |
| F-10 | Routes: dashboards, datasources, storage, integrations, settings, explore, templates (a placeholder), debug. `/debug` has no production gate                                                 | `src/app/routes/**`                                                                       |
| F-11 | `features/node-studio` holds only an `AGENTS.md`                                                                                                                                             | glob                                                                                      |
| F-12 | Convex functions are public, with a "no auth" warning; there is one `records` table; `MAX_RECORDS` is defined twice                                                                          | `convex/records.ts:6,12`, `convexProvider.ts:21`                                          |
| F-13 | The current user is a placeholder ("Alex Morgan")                                                                                                                                            | `src/lib/useCurrentUser.ts:10-12`                                                         |
| F-14 | Legacy key migration runs at import. "Delete after 2027-01" markers appear in 4 files                                                                                                        | `storage.ts:31-52`, `dashboardSchema.ts:112`, `useInbox.ts:54`, `createShellStore.ts:194` |
| F-15 | The relay imports `../../src/core` by relative path, and its Dockerfile copies `src/core`                                                                                                    | `relay/src/*.ts`, `relay/Dockerfile:9-15`                                                 |
| F-16 | Vitest has 4 projects (node via `NODE_TESTS`, dom, convex, storybook). `check:unit` runs node and dom only                                                                                   | `vitest.config.ts:8-58`, `vite.config.ts:58-68`                                           |
| F-17 | CI on pull requests runs lint, css, fmt, unit and build. Pages deploys on push to `main` and is not gated on CI                                                                              | `ci.yaml:36-48`, `github-pages.yaml:37-43`                                                |
| F-18 | Test files: 65 `src` `.test.ts`, 18 `.test.tsx`, 20 stories, 6 relay, 1 convex, 4 `lint`, 1 `plugins.config`                                                                                 | glob                                                                                      |

**Baseline, measured 2026-11-21 on Windows (not re-run):**

- **Cold lint:** 164 s; 416 files; 165 rules; type-aware.
- **Lint cache:** missed because of a change in `docs/`.
- **Unit run:** red, with 2 of 94 files failing (`lint/docs.test.ts` and `plugins.config.test.ts`). It took 269 s, of which only 5 % was spent in tests. jsdom was created 52 times.

## B. Gap register

Severity runs from P0 (highest) to P3. Status: **C** means confirmed at `4550705`; **ch** means confirmed but changed; **nr** means not re-checked. Each gap's phase is in [../phases.md](../phases.md).

| ID    | Gap                                                                                                    | Sev            | Status       |
| ----- | ------------------------------------------------------------------------------------------------------ | -------------- | ------------ |
| G-001 | Storage, place and record provider are three names for one concept                                     | P2             | C            |
| G-002 | "Plugin" means five things; `OptionalPlugin` covers datasource types only                              | P1             | C            |
| G-003 | The layout was re-decided about 6 times; the reasons survive only in archived docs and comments        | P1             | nr           |
| G-004 | No identity, auth or ownership: Convex is public and the user is a placeholder                         | P0 if deployed | C            |
| G-005 | The browser holds DB connection strings and sends them on every call; there is one shared bearer token | P1             | nr           |
| G-006 | Only record storage is a selectable capability                                                         | P2             | C            |
| G-007 | Drafts, connections and the vault bypass the record provider                                           | P2             | nr           |
| G-008 | `app/` is flat and mixes four jobs                                                                     | P3             | C            |
| G-009 | Contracts and implementations share `src/plugins`; the app depends on a feature store                  | P2             | C            |
| G-010 | The platform runtime lives in `lib/` as global state, with duplicated store code                       | P2             | C            |
| G-011 | Modules have side effects at import time                                                               | P2             | C            |
| G-012 | The relay depends on `src/core` by path                                                                | P2             | C            |
| G-013 | Feature folders are organised differently from one another                                             | P3             | nr           |
| G-014 | `isLoopback` is implemented twice (`relay/src/env.ts:23`, `relayFields.ts:9`)                          | P3             | C            |
| G-015 | `SqlServerQuery` and `MongoQuery` share a name with different meanings                                 | P3             | nr           |
| G-016 | `dashboardApi.ts` mixes jobs; `DashboardPage` has cyclomatic complexity 30                             | P3             | nr           |
| G-017 | Legacy migration is duplicated and dated for deletion                                                  | P3             | ch (4 files) |
| G-018 | The app identity is hard-coded (`Brand.tsx:6`, storage prefix)                                         | P2             | C            |
| G-019 | Tooling config is keyed to folder paths                                                                | P1             | C            |
| G-020 | Checks are slow, and the lint cache is invalidated by docs changes                                     | P2             | nr           |
| G-021 | `src/core` holds non-domain `build/` and `relay/` code                                                 | P3             | nr           |
| G-022 | `/debug` is routed with no production gate                                                             | P2             | C            |
| G-023 | The provider contract has a single-string setup and full-read list, and duplicates `MAX_RECORDS`       | P2             | C            |
| G-024 | Subscriptions are not wired (`watchRecords` is unused)                                                 | P3             | C            |
| G-025 | CI skips the stories, the convex project and the relay build; Pages is not gated                       | P2             | C            |
| G-026 | The pre-commit hook never blocks                                                                       | P3             | C            |
| G-027 | Relay scrubbing is pattern-based                                                                       | P3             | nr           |
| G-028 | Two chart stacks ship (ECharts and Recharts)                                                           | P3             | C            |
| G-029 | `react-force-graph-2d` has no importer                                                                 | P3             | C            |
| G-030 | "Add to build" machinery exists for 4 unlisted bundles                                                 | P2             | C            |
| G-031 | Speculative scaffolding has no consumer                                                                | P3             | C            |
| G-032 | Tests are slow, and some test docs or packages rather than behaviour                                   | P2             | nr           |
| G-033 | `apps/docs` is not an app                                                                              | P3             | C            |
| G-034 | The Renovate cap `~0.152.0` contradicts the `0.156.0` pin                                              | P3             | C            |
| G-035 | Doc links point at the archived `docs/target`                                                          | P1             | nr           |
| G-036 | `plugins.config.test.ts:74` hard-codes a POSIX path, so it fails on Windows                            | P1             | C            |

## C. Requirements and direction

**User requirements:**

- **U7.** Keep Vite+. Consider better task running and caching alongside it.
- **U8.** Tests are too heavy; shrink them to what is useful.
- **U9.** Linting is too much and too strict, including the doc linting.
- **U10.** Order: restructure, then tooling, simplification, CI, tests.
- **U11.** Copy library skills in locally after the tooling work.

The later answers are in [../decisions.md](../decisions.md) A-1…A-12.

**ChatGPT direction (proposals, not decided):**

- **D1.** The project becomes a reusable platform for several apps.
- **D2.** Plugins stay internal folders, not a package each.
- **D3.** A capability can have several implementations in the build, with the active one chosen at runtime.
- **D4.** Several alternative backends sit behind the same contracts.
- **D5.** The restructure is staged and preserves behaviour.
- **D6.** Layout of `apps/`, `packages/` and the backend. Feature folders in the Bulletproof-React style, with `components/` and `hooks/`. No ambiguous same-name folders and no grab-bag folders.

## D. Still-open questions

Each one now lives in [../decisions.md](../decisions.md):

| Question                                                                 | Decision   |
| ------------------------------------------------------------------------ | ---------- |
| Q4: which capabilities are real (records only, or also search and auth)? | D-07       |
| Q6: drafts, connections and vault as records?                            | D-16       |
| Q7: chart widgets                                                        | D-14       |
| Q8: Action and ContextPanel scaffolding                                  | D-07       |
| Q9: relay as a workspace app                                             | D-03       |
| Q10: `/debug`                                                            | D-15       |
| Q11: feature folders                                                     | D-05       |
| Q12: runner and type-aware lint                                          | D-08, D-09 |
| G-030                                                                    | D-12       |

## F. Browser storage keys

Copied from the old `docs/current-state.md`; not re-checked.

These keys matter for rollback: a move or rename must not change persisted keys unless a step says so. Keys are `storageKey(name)` = `dashboard-builder:<name>` (`src/lib/storage.ts`). The version lives in the value, not in the key. Some code calls `localStorage` directly; see [carry-over.md](carry-over.md).

| Key suffix                          | Holds                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `shell`, `notifications`            | Layout and inbox (zustand persist, version 2)                                    |
| `motion`, `density`, `color-scheme` | Appearance (`color-scheme` is also read by `index.html`)                         |
| `saved:<id>`                        | Legacy save, migrated into `records:dashboards` at startup                       |
| `draft:<placeId>:<id>`              | Unsaved edits (`{version: 2, source, baseline, document}`); A-5 adds the user id |
| `connections`                       | Connection settings, never secrets (version 1)                                   |
| `vault`                             | Secrets, encrypted with a passphrase                                             |
| `record-provider`                   | `{version: 1, id}`, either `browser` or `convex`                                 |
| `records:<collection>`              | Browser record storage (`{version: 1, records}`)                                 |
| `sentry`, `build-repo`              | Sentry prototype settings; the "add to build" repo and branch                    |

## E. Corrections to the earlier version (`docs/ecc/work/01-current-state.md`)

- The layer order is not strictly linear: `plugins` and `shell` are siblings.
- Line numbers were off: `WidgetPlugin.ts:117`, `OptionalPlugin.ts:102`.
- Test counts are 65 and 6, not 63 and 5.
- No comment says `/debug` is for development only.
- Lint comments still cite `AGENTS.md` and `docs/current-state.md` as the source of the layer rules (`oxlint.config.ts:219`). Those references are stale.
