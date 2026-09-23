# Tasks

Open work, in order. Background: [shell.md](shell.md), [grid-and-charts.md](grid-and-charts.md), [plan.md](plan.md).

## 1. Finish the performance work

- [ ] **Trace the panel slide.** Production build (`pnpm build`, `preview` entry in `.claude/launch.json`), `/dashboards/perf`, app window in front. Check that no long task falls inside the 180ms slide, and whether a toggle that crosses a breakpoint (context bar open) still resizes each chart twice. Fill in the "Measured" column in grid-and-charts.md.
- [ ] **Window resize.** The canvas still follows a browser-window drag every frame, which means a full chart reflow (150–250ms for 12 charts) per frame. Hold `<main>` while the window is resizing and release it about 150ms after the last resize, with `useMainLock`.
- [ ] **Pause far off-screen tiles.** Render the content of tiles far outside the viewport in `<Activity mode="hidden">`. Only visible charts re-render on a width change (12 today, 4–6 expected), and memory stays bounded on large dashboards.
- [ ] **Bundle.** The main chunk is 620 kB: the route loader imports `dashboardQuery` from the dashboards `index.ts`, which pulls the grid and react-grid-layout in with it. Make `DashboardView` a lazy export so they move to the dashboard route's chunk.

## 2. Virtualization

No virtualizer is in use. Mantine has none of its own; use `@tanstack/react-virtual` with Mantine `ScrollArea`.

- [ ] **Dashboard list.** Virtualize or page it once it can pass about 50 items.
- [ ] **Table widget rows.** Virtualize from the start (phase 2).
- Already fine, no action: notifications inbox (capped at 50), Spotlight (8 results), grid tiles (content mounts near the viewport, `content-visibility: auto` off-screen).

## 3. Page header composition

A composable page header (or widget) with variants or options, possibly similar to a control bar.

- [ ] Research
- [ ] Plan
- [ ] Implement

References to look at: Grafana (Storybook), Kibana, Perses (listed as "percel"; could also mean Vercel), Apache Superset, Atlassian Design System, Horizon, Cloudspace.

## 4. Phase 2: dashboard read ([plan.md](plan.md#roadmap))

- [ ] Dashboard schema (zod, versioned) with a layout stored per breakpoint; replaces the reading-order reflow in `model/layouts.ts`.
- [ ] Widget registry, grown from `components/widgets/widgetKinds.tsx`.
- [ ] `DataFrame`, plus `local-json` and `mock` datasources.
- [ ] Time-range picker.
- [ ] Table widget (virtualized rows, see section 2).

## 5. Phase 3: dashboard edit

- [ ] Tile drag and resize following grid rules 5–7: config as module constants, save the layout on `onDragStop` / `onResizeStop` with undo (`zundo`), no saving in `onLayoutChange`.
- [ ] Style the drag placeholder and resize handles (react-grid-layout's defaults are red and black).
- [ ] Measure tile drag and resize like the panel toggles.

## 6. Settings

- [ ] Reduced-motion option in Settings › Appearance (system or reduce). Ships the `data-motion` attribute on `<html>` and an app `useReducedMotion()` for chart animation and grid transitions.

## Housekeeping

- [ ] Prettier: four shell files from the sidebar work are unformatted (`pnpm exec prettier --check src/features/shell`).
- [ ] `RouteError` is the one component the React Compiler skips (`try`/`finally` without `catch`); restructure it if it ever matters.
