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

## In progress

- [ ] **06 Sentry** (cross-cutting): errors reported from every boundary and source maps in CI now; Sentry as the first telemetry integration once the Integrations foundation is in. [Plan](../../.agents/plans/06-sentry.md)

## Next: not planned yet

### Integrations foundation (before phase 3)

The model and the reasons for it are in the [integrations research](../../.agents/plans/research/integrations.md).

- [ ] **Registry.** `IntegrationDefinition` in `app/registry.ts` next to widgets and datasources: `provides` (`datasource`, `telemetry`), a zod `configSchema`, `load()` as its own chunk, a lazy `Setup` page. `features/integrations` never imports an integration.
- [ ] **Config port.** `IntegrationConfigRepository` reads `public/config/integrations.json`, validated with zod; the default file enables nothing. An entry that fails its schema stays off and shows why on its Setup page.
- [ ] **Gating.** Telemetry `load()` runs after first render, only when enabled; datasource types of disabled integrations aren't offered.
- [ ] **Catalog.** Rebuild `/integrations` (grid and row) on `Page` and tokens: every registered integration with its state and a Set up link. Moved here from 06.
- [ ] **Check.** Done when a build with the default config has no integration code in first load (809 KiB), and editing the config of the same build turns Sentry on.

### Phase 3: dashboard edit

- [ ] Tile drag and resize following grid rules 5–7: config as module constants, save the layout on `onDragStop` / `onResizeStop` with undo (`zundo`), no saving in `onLayoutChange`.
- [ ] Style the drag placeholder and resize handles (react-grid-layout's defaults are red and black).
- [ ] Measure tile drag and resize like the panel toggles.

### Phase 4: widgets and data

- [ ] **Nested layer tokens.** `theme/layers.css` with `[data-layer]` depth rules (up to 3 levels), a nested-layer story, and the "Outline layers" switch on the Debug page, for widgets inside a `container`. The variables and the Paper binding exist ([03 §3](../../.agents/plans/done/03-design-tokens.md#3-surfaces-and-layering)).
- [ ] **Datasource manager** offers the built-in types (`local-json`, `mock`, `csv`) plus those of enabled integrations.

### Phases 5 and 6

- [ ] **Phase 5:** integration config read from the API. Saving it from Setup pages waits for "Who changes integration config" in [plan.md › Open questions](plan.md#open-questions-and-risks).
- [ ] **Phase 6:** Datadog, Azure SQL, AWS and Haystack as datasource integrations. Their config and secrets live in the proxy; the browser chunk holds only the Setup form and the query editor.

## Any time

### Performance (left from 01)

- [ ] **Measure `<Activity>` for far tiles before building it.** Prototype a hide margin of about 2 viewport heights with the skeleton shown next to the hidden content, and compare one width change on `/dashboards/perf`. Done when the numbers are in [grid-and-charts.md](../dashboard/grid-and-charts.md) and the go/no-go decision is written down.
- [ ] **Spike: force Mantine transitions off.** Check whether `[data-motion='reduce']` CSS is enough for Mantine `Transition`. If not, set `transitionProps.duration` through the theme. Done when a Drawer opens instantly with the setting on and the OS setting off.
- [ ] **Trace the panel slide and breakpoint crossing.** Production build, `/dashboards/perf`. Done when the "Measured" column in [grid-and-charts.md](../dashboard/grid-and-charts.md) is filled in: no long task inside the 180 ms slide, and the number of chart resizes when a toggle crosses a breakpoint.

### Left from 04 and 05

- [ ] **Trace scrolling the 10k-row table.** Chrome Performance trace on `pnpm preview`, `/dashboards/infra`, Request log. Done when no long task is over 50 ms and the summary is in [05 Verification](../../.agents/plans/done/05-dashboard-read.md#verification).
- [ ] **Storybook a11y check.** `Design system/Page`, `Dashboards/Controls` and `Dashboards/Grid` in the a11y panel. Done when there are no new violations.

### Housekeeping

- [ ] `RouteError` is the one component the React Compiler skips (`try`/`finally` without `catch`); restructure it if it ever matters.
