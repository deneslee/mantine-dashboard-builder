# Tasks

The big-picture checklist, by roadmap phase ([roadmap](roadmap.md#roadmap)). Each plan line links to its file in [plans/](plans/), which has the design and the file-level tasks. Notes for work that has no plan yet sit under its phase, or under Any time.

## Done

- [x] **Phase 0, scaffold** and **phase 1, chrome** (Sep 22).
- [x] **01 Shell performance** (Sep 24): the grid out of the entry chunk, `<main>` held during a window resize, reduced-motion setting. [Plan](plans/done/01-shell-performance.md)
- [x] **02 Project structure** (Sep 24): bulletproof-react layers, no barrels, import direction enforced by oxlint. [Plan](plans/done/02-project-structure.md)
- [x] **03 Design tokens** (Sep 27): primitives, semantic tokens, component bindings, token lint rules. [Plan](plans/done/03-design-tokens.md)
- [x] **Sentry prototype** (Sep 24, PR #13). [Plan](plans/done/06-sentry-prototype.md)
- [x] **Phase 2, dashboard read** (Sep 27):
  - [x] **04 Page header:** named parts, breadcrumbs from the router, a control bar for pickers. [Plan](plans/done/04-page-header.md)
  - [x] **05 Dashboard read:** JSON documents, `DataFrame`, widget and datasource registries, time range in the URL, table widget. [Plan](plans/done/05-dashboard-read.md)
- [x] **08 Structure cleanup** (Oct 1): planning in `.agents/planning/`; browser tests (every story in Chromium with a11y, editor flows as play functions); package-shaped folders with one lint rule per layer; naming rules; one flat `Dashboard` type with `schemaVersion`; one owner per kind of state, `mode` only in the URL; `dashboard-builder:` storage keys with the version in the value. [Plan](plans/done/08-structure-cleanup.md)
- [x] **07 stages 1 and 2, the edit MVP** (Oct 2): per-dashboard store, widget header and menu, edit mode with Save, Discard, Undo and a draft, drag and resize, menu actions, add widget, the widget editor. Every acceptance check passes or is a play function; the drag and resize numbers are in [grid-and-charts.md](../../docs/dashboard/grid-and-charts.md#tile-drag-and-resize). Only the widget editor's place waits on open decision 1 (Edit UI polish below). [Stage 1](plans/07-dashboard-model.md#stage-1-foundation-phase-3), [stage 2](plans/07-dashboard-model.md#stage-2-edit-mvp-phase-3)

## Next, in order

Order decided Sep 30: the edit MVP (done Oct 2), then 08 (done Oct 1), then the viewing tools, then Sentry and integrations ([roadmap](roadmap.md#roadmap)).

- [ ] **1. 07 stage 3, viewing** (phase 3; Oct 6: per-query cache entries, the time scope resolver, per-widget time, times in the dashboard's zone and full-screen view and the Inspect drawer are done; density is next): one cache entry per datasource query, scoped time with a time zone, per-widget time, full screen, the Inspect drawer, density, shortcuts. [Plan](plans/07-dashboard-model.md#stage-3-viewing-phase-3)
- [ ] **2. 06 Sentry §1 and §2:** render errors from the boundaries, data errors from the query and mutation caches, a reportability policy, the startup buffer, source maps in CI. Paused until step 1. [Plan](plans/06-sentry.md)
- [ ] **3. Integrations foundation** (not planned yet, below).
- [ ] **4. 06 Sentry §3:** Sentry as the first telemetry integration, and its rebuilt page. [Plan](plans/06-sentry.md#3-sentry-as-the-first-telemetry-integration)
- [ ] **5. 07 stage 4, layout, variables and data** (phase 4): document v2 with rows and then tabs (and the `metadata`/`spec` envelope), resolution from the layout, hover sync groups, variables through `getVariableRefs`, grouped datasource errors, per-datasource concurrency. [Plan](plans/07-dashboard-model.md#stage-4-layout-variables-data-phase-4)

### Edit UI polish (not planned yet)

These come from the Sep 30 review of the edit MVP ([07 › Sep 30 review](plans/07-dashboard-model.md#sep-30-review-of-the-edit-mvp)). Write a plan when this starts, because the docked pane needs a design.

- [ ] **Docked editor pane.**
  - The palette and widget editor become a `Splitter` pane that resizes the grid, instead of an overlay covering the tiles.
  - Inspect already shares `PaneDrawer` with the editor; the docked pane replaces it for both, with the resizable width 07 §3 asks for.
- [ ] **Edit bar.**
  - An "Editing" status that shows the dirty state.
  - Undo and Redo as `ActionIcon` + `Tooltip`, with `useHotkeys`.
  - Add widget as the primary action.
  - Import and Export JSON in one menu.
  - Save and Discard disabled while the dashboard is clean.
- [ ] **Confirmations.** Use `modals.openConfirmModal` for:
  - Discard, because it clears the undo history.
  - Leaving the query editor with unapplied changes, which today uses `window.confirm`.
- [ ] **Done vs leave.**
  - With unsaved changes, "Done" offers Save, Keep draft or Discard instead of the "Leave dashboard" dialog.
  - View mode marks a dashboard that has a draft.
- [ ] **Forms.**
  - Palette, Move and Resize become `<form>`s, so Enter submits.
  - Move and Resize state the valid range ("Column 1–12").
- [ ] **Empty and loading states.**
  - Mantine `EmptyState` for an empty dashboard.
  - A skeleton instead of "Opening editor…".
  - A one-time "Restored your unsaved draft" notice.
- [ ] **One `editable` flag.** The toolbar checks the viewport width and the grid checks its own width, so at 667 px the toolbar shows but dragging is off. Derive both from the grid's measured width.
- [ ] **Accessibility.**
  - The widget menu trigger loses `aria-haspopup` and `aria-expanded` under its Tooltip.
  - An identical live-region message isn't announced twice.
  - The remove toast's Undo undoes the latest change rather than the removal.
  - Move and Resize announce positions counted from 0 ("column 0, row 3"), while their dialogs count from 1.
- [ ] **Query editor preview.** Debounce the preview query instead of running one per keystroke.

### Integrations foundation (step 3, not planned yet)

The model and the reasons for it are in the [integrations research](research/integrations.md).

- [ ] **Manifests.** `IntegrationManifest` in `app/plugins.ts` next to widgets and datasources: `id`, `name`, `icon`, `category`, `provides` (`datasource`, `telemetry`), and `loadConfig`, `loadRuntime`, `loadSetup` as separate chunks. `features/integrations` never imports an integration.
- [ ] **Config port.** `IntegrationConfigRepository` reads `public/config/integrations.json`: the outer shape first, then only the enabled entries' config schemas. The default file enables nothing. An entry that fails its schema stays off and shows why on its Setup page.
- [ ] **Gating.** Telemetry runtimes start from `main.tsx` once the config is read, only when enabled; datasource types of disabled integrations aren't offered.
- [ ] **Catalog.** Rebuild `/integrations` (grid and row) on `Page` and tokens, grouped by category: every registered integration with its state and a Set up link. Moved here from 06.
- [ ] **Check.** Done when a build with the default config fetches no integration chunk and stays within the bundle budget, and editing the config of the same build turns Sentry on.

### Phase 4: widgets and data

- [ ] **Datasource manager** offers the built-in types (`local-json`, `mock`, `csv`) plus those of enabled integrations.

Nested layer tokens are no longer planned: they were for widgets inside a `container`, which 07 drops, so nothing nests. The variables and the Paper binding exist if something ever does ([03 §3](plans/done/03-design-tokens.md#3-surfaces-and-layering)).

### Phases 5 and 6

- [ ] **Phase 5:** a `revision` field on stored dashboards for conflict checks; integration config read from the API. Saving it from Setup pages waits for "Who changes integration config" in [roadmap › Open questions](roadmap.md#open-questions-and-risks).
- [ ] **Phase 6:** Datadog, Azure SQL, AWS and Haystack as datasource integrations. Their config and secrets live in the proxy; the browser chunk holds only the Setup form and the query editor.

## Any time

### Performance (left from 01)

- [ ] **Measure `<Activity>` for far tiles before building it.** Prototype a hide margin of about 2 viewport heights with the skeleton shown next to the hidden content, and compare one width change on `/dashboards/perf`. Done when the numbers are in [grid-and-charts.md](../../docs/dashboard/grid-and-charts.md) and the go/no-go decision is written down.
- [ ] **Spike: force Mantine transitions off.** Check whether `[data-motion='reduce']` CSS is enough for Mantine `Transition`. If not, set `transitionProps.duration` through the theme. Done when a Drawer opens instantly with the setting on and the OS setting off.
- [ ] **Trace the panel slide and breakpoint crossing.** Production build, `/dashboards/perf`. Done when the "Measured" column in [grid-and-charts.md](../../docs/dashboard/grid-and-charts.md) is filled in: no long task inside the 180 ms slide, and the number of chart resizes when a toggle crosses a breakpoint.

### Left from 04 and 05

- [ ] **Trace scrolling the 10k-row table.** Chrome Performance trace on `pnpm preview`, `/dashboards/infra`, Request log. Done when no long task is over 50 ms and the summary is in [05 Verification](plans/done/05-dashboard-read.md#verification).
- [-] **Storybook a11y check.** `Design system/Page`, `Dashboards/Controls` and `Dashboards/Grid` in the a11y panel. Moved to [08](plans/done/08-structure-cleanup.md) step 2: every story then runs as an a11y test in Chromium, and a story that fails is marked `todo` with its own line here.

### Deployment

- [ ] **First CI run.** `github-pages.yaml` (written in 08, Sep 30) runs lint, the format check, Chromium and `pnpm test` on pull requests and before each deploy, and deploys only from main. Done when a pull request runs the checks without deploying.
- [ ] **GitHub Pages deep links.** GitHub Pages has no SPA fallback, so `/dashboards/…` opened directly returns 404. The workflow already copies `index.html` to `404.html`; what's left is to check it. Done when a deep link loads on the deployed site.
- [ ] **Bundle budget in CI.** Add `size-limit` with the first-load number, stating whether it's raw or gzipped; integration manifests count toward it. Done when a pull request that pushes first load past it fails.

### Housekeeping

- [ ] **Light-scheme contrast.** The light-scheme tokens are below WCAG AA, found by the story a11y tests (Sep 30):
  - dimmed text (`#868e96` on `#f8f9fa`) is 3.15:1;
  - white on the primary filled button (`#4c6ef5`) is 4.32:1;
  - links on the canvas are 4.1:1;
  - the warning and success badges and alert titles are 2.4–3.8:1;
  - the avatar initials also fail.

  Fix it in the semantic tokens ([design-system.md](../../docs/ui/design-system.md)): a darker dimmed shade, and a primary shade or text color for filled buttons. Done when `color-contrast` is enabled again in `.storybook/preview.tsx` and every story passes.

- [ ] **`--mantine-color-body` points at the overlay surface.** Before the overlay and raised surfaces diverge, point it at the canvas surface, bind `ModalBase` (Modal, Drawer) to overlay, and bind the parts that must match the surface behind them (Table's sticky header, the active Tabs border, Scroller's fade) to `--app-layer-surface`. Details in [design-system.md](../../docs/ui/design-system.md#where-new-things-go). Done when a story shows each of those components on canvas and inside a widget.
- [ ] **Components the React Compiler skips.** `RouteError` and `SentryVerificationCard` use `try`/`finally` without `catch`; `FrameTable` uses an incompatible library (TanStack Table). Restructure them if it ever matters. The `throw` and `?.` inside `try` in the old `DashboardView` and editor forms, and the `@babel/core` 8 skip of components with destructured defaults, were fixed in [08](plans/done/08-structure-cleanup.md) (Oct 1: nothing under `features/dashboards` bails out).
