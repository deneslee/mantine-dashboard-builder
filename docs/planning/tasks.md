# Tasks

The big-picture checklist, by roadmap phase ([plan.md › Roadmap](plan.md#roadmap)). Each plan line links to its file in [.agents/plans/](../../.agents/plans/), which has the design and the file-level tasks. Notes for work that has no plan yet sit under its phase, or under Any time.

## Done

- [x] **Phase 0, scaffold** and **phase 1, chrome** (Sep 22).
- [x] **01 Shell performance** (Sep 24): the grid out of the entry chunk, `<main>` held during a window resize, reduced-motion setting. [Plan](../../.agents/plans/done/01-shell-performance.md)
- [x] **02 Project structure** (Sep 24): bulletproof-react layers, no barrels, import direction enforced by oxlint. [Plan](../../.agents/plans/done/02-project-structure.md)
- [x] **03 Design tokens** (Sep 27): primitives, semantic tokens, component bindings, token lint rules. [Plan](../../.agents/plans/done/03-design-tokens.md)
- [x] **Sentry prototype** (Sep 24, PR #13). [Plan](../../.agents/plans/done/06-sentry-prototype.md)
- [x] **Phase 2, dashboard read** (Sep 27):
  - [x] **04 Page header:** named parts, breadcrumbs from the router, a control bar for pickers. [Plan](../../.agents/plans/done/04-page-header.md)
  - [x] **05 Dashboard read:** JSON documents, `DataFrame`, widget and datasource registries, time range in the URL, table widget. [Plan](../../.agents/plans/done/05-dashboard-read.md)

## Next, in order

Order decided Sep 30: the edit MVP first, then the viewing tools, then Sentry and integrations ([plan.md › Roadmap](plan.md#roadmap)).

- [ ] **1. 07 stages 1 and 2, the edit MVP** (phase 3): dashboard store and `DashboardProvider`, widget header and menu, edit mode with Save, Discard, Undo and Redo, drag and resize with one undo step each, Move to… and Resize… in the menu, add widget, draft, export, browser tests, drag and resize measured. [Stage 1](../../.agents/plans/07-dashboard-model.md#stage-1-foundation-phase-3), [stage 2](../../.agents/plans/07-dashboard-model.md#stage-2-edit-mvp-phase-3)
- [ ] **2. 07 stage 3, viewing** (phase 3): one cache entry per datasource query, scoped time with a time zone, per-widget time, full screen, the Inspect drawer, density, shortcuts. [Plan](../../.agents/plans/07-dashboard-model.md#stage-3-viewing-phase-3)
- [ ] **3. 06 Sentry §1 and §2:** render errors from the boundaries, data errors from the query and mutation caches, a reportability policy, the startup buffer, source maps in CI. Paused until step 2. [Plan](../../.agents/plans/06-sentry.md)
- [ ] **4. Integrations foundation** (not planned yet, below).
- [ ] **5. 06 Sentry §3:** Sentry as the first telemetry integration, and its rebuilt page. [Plan](../../.agents/plans/06-sentry.md#3-sentry-as-the-first-telemetry-integration)
- [ ] **6. 07 stage 4, layout, variables and data** (phase 4): document v2 with rows and then tabs, resolution from the layout, hover sync groups, variables through `getVariableRefs`, grouped datasource errors, per-datasource concurrency. [Plan](../../.agents/plans/07-dashboard-model.md#stage-4-layout-variables-data-phase-4)

### Integrations foundation (step 4, not planned yet)

The model and the reasons for it are in the [integrations research](../../.agents/plans/research/integrations.md).

- [ ] **Manifests.** `IntegrationManifest` in `app/registry.ts` next to widgets and datasources: `id`, `name`, `icon`, `category`, `provides` (`datasource`, `telemetry`), and `loadConfig`, `loadRuntime`, `loadSetup` as separate chunks. `features/integrations` never imports an integration.
- [ ] **Config port.** `IntegrationConfigRepository` reads `public/config/integrations.json`: the outer shape first, then only the enabled entries' config schemas. The default file enables nothing. An entry that fails its schema stays off and shows why on its Setup page.
- [ ] **Gating.** Telemetry runtimes start from `main.tsx` once the config is read, only when enabled; datasource types of disabled integrations aren't offered.
- [ ] **Catalog.** Rebuild `/integrations` (grid and row) on `Page` and tokens, grouped by category: every registered integration with its state and a Set up link. Moved here from 06.
- [ ] **Check.** Done when a build with the default config fetches no integration chunk and stays within the bundle budget, and editing the config of the same build turns Sentry on.

### Phase 4: widgets and data

- [ ] **Datasource manager** offers the built-in types (`local-json`, `mock`, `csv`) plus those of enabled integrations.

Nested layer tokens are no longer planned: they were for widgets inside a `container`, which 07 drops, so nothing nests. The variables and the Paper binding exist if something ever does ([03 §3](../../.agents/plans/done/03-design-tokens.md#3-surfaces-and-layering)).

### Phases 5 and 6

- [ ] **Phase 5:** a `revision` field on stored dashboards for conflict checks; integration config read from the API. Saving it from Setup pages waits for "Who changes integration config" in [plan.md › Open questions](plan.md#open-questions-and-risks).
- [ ] **Phase 6:** Datadog, Azure SQL, AWS and Haystack as datasource integrations. Their config and secrets live in the proxy; the browser chunk holds only the Setup form and the query editor.

## Any time

### Performance (left from 01)

- [ ] **Measure `<Activity>` for far tiles before building it.** Prototype a hide margin of about 2 viewport heights with the skeleton shown next to the hidden content, and compare one width change on `/dashboards/perf`. Done when the numbers are in [grid-and-charts.md](../dashboard/grid-and-charts.md) and the go/no-go decision is written down.
- [ ] **Spike: force Mantine transitions off.** Check whether `[data-motion='reduce']` CSS is enough for Mantine `Transition`. If not, set `transitionProps.duration` through the theme. Done when a Drawer opens instantly with the setting on and the OS setting off.
- [ ] **Trace the panel slide and breakpoint crossing.** Production build, `/dashboards/perf`. Done when the "Measured" column in [grid-and-charts.md](../dashboard/grid-and-charts.md) is filled in: no long task inside the 180 ms slide, and the number of chart resizes when a toggle crosses a breakpoint.

### Left from 04 and 05

- [ ] **Trace scrolling the 10k-row table.** Chrome Performance trace on `pnpm preview`, `/dashboards/infra`, Request log. Done when no long task is over 50 ms and the summary is in [05 Verification](../../.agents/plans/done/05-dashboard-read.md#verification).
- [ ] **Storybook a11y check.** `Design system/Page`, `Dashboards/Controls` and `Dashboards/Grid` in the a11y panel. Done when there are no new violations.

### Deployment

- [ ] **GitHub Pages deep links.** GitHub Pages has no SPA fallback, so `/dashboards/…` opened directly returns 404. Add a `404.html` fallback. Done when a deep link loads on the deployed site.
- [ ] **Bundle budget in CI.** Add `size-limit` with the first-load number, stating whether it's raw or gzipped; integration manifests count toward it. Done when a pull request that pushes first load past it fails.

### Housekeeping

- [ ] **`--mantine-color-body` points at the overlay surface.** Before the overlay and raised surfaces diverge, point it at the canvas surface, bind `ModalBase` (Modal, Drawer) to overlay, and bind the parts that must match the surface behind them (Table's sticky header, the active Tabs border, Scroller's fade) to `--app-layer-surface`. Details in [design-system.md](../ui/design-system.md#where-new-things-go). Done when a story shows each of those components on canvas and inside a widget.
- [ ] `RouteError` is the one component the React Compiler skips (`try`/`finally` without `catch`); restructure it if it ever matters.
