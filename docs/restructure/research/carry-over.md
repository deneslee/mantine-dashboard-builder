# Carry-over from the old docs

Last verified: commit `4550705`, 2026-11-22. These are items in the old docs (`docs/STATUS.md`, `docs/archive/**`) that no gap row or question in [current-state.md](current-state.md) covers. They are kept here so that deleting the old files loses nothing useful. Each row says whether it was checked against the code.

## Open items (from the old `docs/STATUS.md`)

| Item                                                                                                                  | Checked                                |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Removing `floorplan/` from git _history_ needs a history rewrite and a force-push. It is already untracked            | `.gitignore:13`. History not checked   |
| The old `AGENTS.md` pointed to `convex/_generated/ai/guidelines.md`, which is missing. Install it or drop the pointer | Not checked                            |
| Set `VITE_SENTRY_DSN` when the app goes live; Sentry stays off without it                                             | Not checked (env files are off-limits) |

## Engineering rules (from `docs/archive/AGENTS-PRE.md`)

**Enforced by lint today, so they survive deletion. Only their rationale was in the old doc:**

- no inline styles and no raw style props outside `ui/tokens` and `ui/theme`;
- layer imports, and no barrels;
- `.query` only in `dashboardQueries.ts`;
- the Sentry SDK only via `lib/sentry/runtime`.

Evidence: `oxlint.config.ts:163-173,222+`. Whether these rules stay is decision D-06.

**Not enforced. Candidates for the future `AGENTS.md`; each needs a decision before it becomes a rule:**

| Rule                                                                                                                                                                           | Checked                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Notifications go through `notify.*` only                                                                                                                                       | Yes: `notifications.show` appears only in `lib/notify/notify.tsx:57,77`                                                                       |
| localStorage keys go through `storageKey()`, with the version in the value                                                                                                     | **Partly violated**: direct `localStorage.` calls in `ColorSchemeToggle.tsx`, `sentryConfig.ts`, `placeSetting.ts`, `activeRecordProvider.ts` |
| react-grid-layout v2 only, never `/legacy`; React 19 `ref` prop, no `forwardRef`                                                                                               | Yes: no matches outside tests                                                                                                                 |
| Status colours are aliases (`danger`, not `red`); ActionIcon + Tooltip + aria-label; `@container` over viewport classes                                                        | Not checked                                                                                                                                   |
| Naming: file named after its main export; no generic `types.ts`, `utils.ts` or `index.ts`; `is/has/should/can` booleans; `handle*`/`on*`; role suffixes (`*Page`, `*Panel`, …) | Not checked. Matches ChatGPT direction D6                                                                                                     |
| Check `@mantine/core` exports before writing a component (Mantine MCP)                                                                                                         | Preference; not checkable                                                                                                                     |
| Never `pnpm test` while working, because it runs the Chromium story project; use `test:changed` or `vp test run <path>`                                                        | Not checked                                                                                                                                   |

## Measurements (from `docs/archive/_EXTRA/perf-and-spikes/`, not re-run)

| Measurement                                                                                                         | Status today                                          |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Opening a side panel laid out each chart ~6 times (0.35–0.5 s long frames); a CSS quick fix cut it to 9 layouts     | `SplitView.module.css:22` still animates `flex-basis` |
| ECharts chunk 176.2 kB gzip vs Recharts 121.5 kB; ECharts showed fewer long frames                                  | Evidence for D-14 (one or both chart widgets)         |
| Crossing the grid breakpoint could double chart layouts; fixed by computing the breakpoint from width during render | Applied: `DashboardGrid.tsx:56`                       |

**Unverified rules from `restructure-and-stack.md` (grepped only, not read in full):**

- no Motion `layout` animations on grid or chart holders;
- one persistence path;
- no second filter engine;
- a perf harness with hard budgets (`perf/*.perf.ts`). This conflicts with U8 ("fewer tests"), so it needs a decision.

## Pinned versions with reasons

`react-grid-layout` stays on 2.2.4 because 2.3.0 broke drag in edit mode. The reason is linked from `.github/renovate.json5:32,51` to a doc at commit `0e400dd`, so it lives in git history, not in the tree.

## Not extracted (skim before deleting)

These files were not read in full by any re-verification pass:

- `docs/archive/target/architecture.md`
- `docs/archive/target/contracts.md`
- `docs/archive/node-studio/*`
- `docs/review/architecture-audit.md`

The earlier audit says the review's P1–P11 findings were reconfirmed in `docs/ecc/work/01-current-state.md` §1.11. That claim is unverified here.
