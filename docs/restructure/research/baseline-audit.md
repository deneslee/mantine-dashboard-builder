# Baseline audit: what exists today

**Research for:** every ADR. It is the starting point the restructure is measured against.
**Question it answers:** what does the repo look like today, before any change?
**Last verified:** commit `4550705`, 2026-11-22. The facts were spot-checked with grep and glob. Timings were measured on 2026-11-21 and not re-run.

ECC's `brownfield-retrospective` skill calls this file `baseline-audit.md`. The gaps found are in [gap-register.md](gap-register.md).

**This is a snapshot.** It saves re-exploring the code, but it goes out of date with every change. Before you act on a row, check it against the code and, if it has changed, update the row and its date. If this page and the code disagree, the code wins.

## Facts

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

## Browser storage keys

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

## Corrections to the earlier version (`docs/ecc/work/01-current-state.md`)

- The layer order is not strictly linear: `plugins` and `shell` are siblings.
- Line numbers were off: `WidgetPlugin.ts:117`, `OptionalPlugin.ts:102`.
- Test counts are 65 and 6, not 63 and 5.
- No comment says `/debug` is for development only.
- Lint comments still cite `AGENTS.md` and `docs/current-state.md` as the source of the layer rules (`oxlint.config.ts:219`). Those references are stale.
