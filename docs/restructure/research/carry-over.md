# Carry-over from the old docs (research for ADR-0006, ADR-0007, ADR-0014)

**Research for:** [ADR-0006](../../adr/0006-boundary-and-layer-rules.md), [ADR-0007](../../adr/0007-plugin-model.md), [ADR-0014](../../adr/0014-chart-widgets.md).

Last verified: commit `4550705`, 2026-11-22. These are items in the old docs (`docs/STATUS.md`, `docs/archive/**`) that no row in [gap-register.md](gap-register.md) or [baseline-audit.md](baseline-audit.md) covers. The old files were deleted on 2026-11-22 (recover from git at `4550705`); this page keeps what was useful. Each row says whether it was checked against the code.

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

Evidence: `oxlint.config.ts:163-173,222+`. Whether these rules stay is decision ADR-0006.

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
| ECharts chunk 176.2 kB gzip vs Recharts 121.5 kB; ECharts showed fewer long frames                                  | Evidence for ADR-0014 (one or both chart widgets)     |
| Crossing the grid breakpoint could double chart layouts; fixed by computing the breakpoint from width during render | Applied: `DashboardGrid.tsx:56`                       |

**Unverified rules from `restructure-and-stack.md` (grepped only, not read in full):**

- no Motion `layout` animations on grid or chart holders;
- one persistence path;
- no second filter engine;
- a perf harness with hard budgets (`perf/*.perf.ts`). This conflicts with U8 ("fewer tests"), so it needs a decision.

## Pinned versions with reasons

`react-grid-layout` stays on 2.2.4 because 2.3.0 broke drag in edit mode. The reason is linked from `.github/renovate.json5:32,51` to a doc at commit `0e400dd`, so it lives in git history, not in the tree.

## From the skimmed docs (2026-11-22, summarised before deletion; not re-checked against code)

**Old target contracts and architecture (`docs/archive/target/*`). These were proposals, not decisions; input for ADR-0007 and P6:**

- **Two kinds of data.** Query data is read-only (datasources and `DataFrame`). Record data is read/write (the record provider). Keeping them apart was "the main structural rule".
- **Widget data.**
  - One cache entry per datasource query, and identical queries share a request.
  - The key covers datasource, revision, query and time.
  - The route starts the first-screen queries; edit mode starts none.
  - A tile keeps its last complete result, and requests can be cancelled.
- **Record provider.**
  - Operations: list, get, create, update, delete, export, import, status.
  - Outcomes are returned, not thrown (not supported, not found, conflict).
  - Imports are all-or-nothing, with a revision floor.
  - Each write declares the keys it makes stale.
  - Reads time out after 10 s; writes never time out.
  - `ListQuery` takes search, filters, sort and a cursor.
- **State.** One store per open dashboard. The URL owns the time range. Undo keeps 50 steps.
- **Planned action and context-panel shapes** (the scaffolding that G-031 lists for deletion):
  - action `{id,label,icon,placements,load}`, placed in `dashboard.header` or `widget.menu`;
  - panels named by TanStack route id.

**Earlier audit (`docs/review/architecture-audit.md`):**

- **Strength to keep:** zero production layer violations, and `import/no-cycle` is on.
- **Large components:**

  | Component                | Size      |
  | ------------------------ | --------- |
  | `DashboardPage`          | CC 30     |
  | `SentryVerificationCard` | 504 lines |
  | `WidgetHeader`           | 274 lines |
  | `AddToBuildDialog`       | 236 lines |

- **App identity is hard-coded in more places than G-018 lists:**
  - the demo dashboards in `app/nav.ts`;
  - the `public/data` seed;
  - the Vite base `/mantine-dashboard-builder/`.
- **Persisted keys `record-provider` and `place-settings` must survive renames.** This is a rollback item for P4.
- **Open questions it raised:**
  - shared shell vs one shell per app (it recommended per app);
  - the scope of provider selection (app, browser, workspace or collection);
  - whether the relay stays a custom API or moves to another BaaS.

**ChatGPT chat (direction, not decided; adds to D1–D6):**

- A capability has three states: included, configured, active. A missing provider shows a visible config error, never a silent backend switch.
- Server-backed providers need an authenticated API, not credentials held in the browser.
- Keep the Convex adapter (`plugins/integrations/convex`) separate from the Convex functions (`services/convex`). There is no universal `backend/` folder.
- Don't create empty folder sets; a single-file component stays a single file.
- Possibly split document storage from record storage later.

**Node Studio plan (`docs/archive/node-studio/*`). Node Studio is kept (A-8):**

- **First milestone:** an interactive schema editor at `/node-studio`, using React Flow (`@xyflow/react`). It seeds an in-memory schema with stable field ids and has an inspector for rename and reconnect. A visual review comes before the next step.
- **Next:** a read-only "Explore" view using **`react-force-graph-2d`**. That package is a planned dependency, so G-029 ("no importer") is not simply dead code.
- **References:** React Flow handles and reconnecting edges; Liam ERD and ChartDB table nodes.

## `apps/docs` mismatches (kept, flagged)

`apps/docs/` (the capability catalog) is kept but not verified. Do not use it as evidence. Its `potential.md` holds ideas only. Mismatches with the code (checked at `4550705`):

- It says the browser default is IndexedDB; the code uses `localStorage`.
- It lists Convex as providing search, assets, jobs and sign-in; only records exist, with no auth.
- Paraglide, Ajv and `@mantine/schedule` are not dependencies.
- It names Recharts as the default chart; the default widget uses ECharts.
- It says Sentry is an optional plugin; it lives in `src/lib/sentry/`.
- It lists context tabs, nav, commands and a "YAML nav manifest" as decided; there are no implementations.
- It lists many plugin kinds; the code has widget, datasource and record-provider kinds, plus two empty ones.

Where it moves to is a P4 question (G-033).

## Stale references in code comments (need approval to change code)

`oxlint.config.ts:166,219`, `lint/plugin.js:108` and `lint/rules.test.ts:106` point to deleted `docs/target/contracts.md` and `docs/current-state.md`. Candidate for P2.
