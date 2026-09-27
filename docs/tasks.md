# Tasks

The big-picture checklist, by roadmap phase ([plan.md › Roadmap](plan.md#roadmap)). Each plan line links to its file in [.agents/plans/](../.agents/plans/), which has the design and the file-level tasks. Notes for work that has no plan yet sit under its phase, or under Any time.

## Done

- [x] **Phase 0, scaffold** and **phase 1, chrome** (Sep 22).
- [x] **01 Shell performance** (Sep 24): the grid out of the entry chunk, `<main>` held during a window resize, reduced-motion setting. [Plan](../.agents/plans/done/01-shell-performance.md)
- [x] **02 Project structure** (Sep 24): bulletproof-react layers, no barrels, import direction enforced by oxlint. [Plan](../.agents/plans/done/02-project-structure.md)
- [x] **03 Design tokens** (Sep 27): primitives, semantic tokens, component bindings, token lint rules. [Plan](../.agents/plans/done/03-design-tokens.md)
- [x] **Sentry prototype** (Sep 24, PR #13). [Plan](../.agents/plans/done/06-sentry-prototype.md)

## In progress: phase 2, dashboard read

- [ ] **04 Page header:** named parts, breadcrumbs from the router, a control bar for pickers. [Plan](../.agents/plans/04-page-header.md)
- [ ] **05 Dashboard read:** JSON documents, `DataFrame`, widget and datasource registries, time range in the URL, table widget. [Plan](../.agents/plans/05-dashboard-read.md)
- [ ] **06 Sentry** (cross-cutting): errors reported from every boundary, source maps in CI, the Integrations area rebuilt as a product feature. [Plan](../.agents/plans/06-sentry.md)

## Next: not planned yet

### Phase 3: dashboard edit

- [ ] Tile drag and resize following grid rules 5–7: config as module constants, save the layout on `onDragStop` / `onResizeStop` with undo (`zundo`), no saving in `onLayoutChange`.
- [ ] Style the drag placeholder and resize handles (react-grid-layout's defaults are red and black).
- [ ] Measure tile drag and resize like the panel toggles.

### Phase 4: widgets and data

- [ ] **Nested layer tokens.** `theme/layers.css` with `[data-layer]` depth rules (up to 3 levels), a nested-layer story, and the "Outline layers" switch on the Debug page, for widgets inside a `container`. The variables and the Paper binding exist ([03 §3](../.agents/plans/done/03-design-tokens.md#3-surfaces-and-layering)).

### Phases 5 and 6

Nothing noted yet.

## Any time

### Performance (left from 01)

- [ ] **Measure `<Activity>` for far tiles before building it.** Prototype a hide margin of about 2 viewport heights with the skeleton shown next to the hidden content, and compare one width change on `/dashboards/perf`. Done when the numbers are in `grid-and-charts.md` and the go/no-go decision is written down.
- [ ] **Spike: force Mantine transitions off.** Check whether `[data-motion='reduce']` CSS is enough for Mantine `Transition`. If not, set `transitionProps.duration` through the theme. Done when a Drawer opens instantly with the setting on and the OS setting off.
- [ ] **Trace the panel slide and breakpoint crossing.** Production build, `/dashboards/perf`. Done when the "Measured" column in `grid-and-charts.md` is filled in: no long task inside the 180 ms slide, and the number of chart resizes when a toggle crosses a breakpoint.

### Housekeeping

- [ ] `RouteError` is the one component the React Compiler skips (`try`/`finally` without `catch`); restructure it if it ever matters.
