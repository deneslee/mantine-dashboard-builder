# 01 Shell polish, performance and bundle size

Status: done (Sep 24, 2026) · Cross-cutting · The three open measurements moved to the backlog in [tasks.md](../../tasks.md) on Sep 27.

## Objective

Finish the Phase 1 performance work: get react-grid-layout out of the entry chunk, stop charts reflowing on every frame of a window resize, keep far off-screen tiles from reacting to width changes, and add a reduced-motion setting.

## Scope

### 1. Bundle: get react-grid-layout out of the entry chunk

- **Measured (Sep 24):** `index-*.js` is 620.48 kB (192 kB gzip) and contains react-draggable and react-resizable.
- **Cause:** the `/dashboards/$id` loader imports `dashboardQuery` from `@/features/dashboards` (the barrel). The barrel re-exports `DashboardView` → `DashboardGrid`, which imports `react-grid-layout/css/styles.css`. A CSS import is a side effect, so the bundler keeps the grid module even though the loader never uses it.
- **Not the fix:** wrapping `DashboardView` in `React.lazy`. `autoCodeSplitting: true` (vite.config.ts) already splits the route component.
- **Fix, in this order:**
  1. Add `"sideEffects": ["**/*.css"]` to `package.json` so unused JS re-exports can be dropped. Build and check.
  2. If the grid is still in the entry chunk, have the route loaders import from `features/dashboards/api/queries` directly (Plan 02 makes this the rule).
- **Goal:** the entry chunk contains no `react-draggable` or `react-resizable`. The grid code is about 50–60 kB minified, so this alone won't bring the chunk under 500 kB. If the warning still matters after that:
  - lazy-load Spotlight search on first open (⌘K or a click), and/or
  - split vendor code into its own chunk with `build.rolldownOptions.output.codeSplitting`.

  Otherwise raise `chunkSizeWarningLimit` and write down why.

### 2. Hold `<main>` during a window resize

- Extend `useMainLock` with a `resize` listener: pin `<main>` at its current content width and release it 150 ms after the last width change.
- Use Mantine hooks rather than hand-written listeners and timers: `useWindowEvent('resize', …)` for the listener and `useDebouncedCallback(release, 150)` for the release.
- **Edge cases (each needs a test in `useMainLock.test.ts`):**
  - **Width-only:** pin only when the **width** changes. On mobile, the address bar showing or hiding fires `resize` with only the height changing.
  - **Shared state:** `generation`/`timer` are shared with `holdFor`. If the panels start moving during a window resize, the later hold wins, and a stale timeout must not release it.
  - **What the user sees:** while shrinking, the content is clipped (`[data-moving]` already sets `overflow-x: hidden`). While growing, there is empty space on the right until release. This is accepted.
  - **Reduced motion:** no change. The pin is a performance measure, not an animation.
- **Alternative considered:** debouncing only `useContainerWidth` in the grid. Rejected because charts outside the grid (for example, in the context bar) would still reflow.

### 3. Far off-screen tiles in `<Activity>` (measure before building)

- **What React does (react.dev):** a hidden `<Activity>` sets `display: none`, **cleans up effects** (so ResizeObservers disconnect), and **still re-renders on new props**, at low priority. The benefit is that hidden charts stop reacting to width changes because their observers are gone. It does not stop re-renders.
- **What it costs:** when a tile becomes visible again, its effects re-run and the chart measures and renders once, while the user is scrolling.
- **Rules:**
  - **Hysteresis:** hide only when the tile is more than about 2 viewport heights away. Keep the 200 px margin for the first mount (`seen`). Use a separate `useIntersection` with the large margin, so tiles near the edge don't flip back and forth.
  - **Skeleton:** while hidden, render the kind's skeleton next to the hidden content, so a fast scroll never shows an empty tile.
  - **Existing measures:** the latch that mounts content once and keeps it, and `content-visibility: auto`, both stay.
- **Go/no-go:** on the production build of `/dashboards/perf`, compare the scripting time of one width change with and without it. Ship only if it drops clearly (target ≥ 40%) and scrolling shows no long task over 50 ms.

### 4. Reduced-motion setting

- **Setting:** `motion: 'system' | 'reduce'` in Settings › Appearance.
- **Where it's stored:** ~~in `shell.v1`~~ **changed during implementation:** its own key `motion.v1`, through Mantine's `useLocalStorage` (`src/shared/hooks/useMotion.ts`). `MantineProvider` sits above `ShellProvider`, and it needs the value to swap themes, so the setting can't live in the shell store.
- **`useAppearanceForm`:** generalize the `dirty` check (compare the keys of `values`) instead of adding another `||` clause.
- **Hook name:** `useMotion()` → `{ reduced: boolean }`, combining Mantine's `useReducedMotion()` (OS setting) with the user preference. It is **not** named `useReducedMotion`, which Mantine already exports.
- **`data-motion` on `<html>`:** set to `reduce` when the result is reduced. `global.css` gets `[data-motion='reduce']` rules that mirror the existing `prefers-reduced-motion` block.
- **Spike: Mantine transitions.** `theme.respectReducedMotion` only reads the OS setting. Check whether the CSS override is enough for Mantine `Transition` (duration set from JS). If it isn't, override `transitionProps.duration` through `theme.components`.
  - **Result from the source:** Mantine 9.6 `useTransition` reads the OS media query directly and has no way to take a user setting. The CSS override alone makes overlays invisible at once, but they stay mounted for their JS duration (about 180 ms). `Providers` therefore swaps in `reducedMotionTheme`: 0 ms `transitionProps` for Drawer, Modal, Popover, Menu, Combobox, Tooltip, HoverCard and Spotlight, a 0 ms Collapse, and `transitionDuration={0}` for Notifications. A visual check in the browser is still to do.
- **Consumers:** chart `animationDuration` and the shell's pane transition.

### 5. Formatting and housekeeping

- Run Prettier on the four unformatted shell files: `Search.tsx`, `Shell.test.tsx`, `Sidebar.test.tsx`, `SidebarNav.tsx`.
- **Formatting check:** add `"format:check": "prettier --check ."` and run it in CI. `pnpm lint` doesn't include Prettier, which is how these four files slipped through.
- **Duplicate task list:** `docs/tasks.md` duplicates the archived task list. Replace it with a pointer to `.agents/plan/`, so there is only one source.

### 6. Measurements (restored from the archived task list)

- **Panel slide:** trace it on the production build (`/dashboards/perf`, app window in front) and confirm no long task falls inside the 180 ms slide.
- **Breakpoint crossing:** check whether a toggle that crosses a grid breakpoint (context bar opening) still resizes each chart twice.
- **Record results:** fill in the "Measured" column in `docs/grid-and-charts.md`.

## Out of scope

- Reducing total JS size (vendor-level work) beyond the Spotlight lazy-load.
- The `RouteError` restructure that React Compiler skips (still noted in `docs/grid-and-charts.md`, low priority).

## Risks

- `sideEffects` is wrong if some module relies on import-time side effects (for example, the notifications store registering itself). Mitigation: run the full test suite and a Storybook smoke test after the change.
- `<Activity>` may cost more on scroll than it saves on resize. That is why the go/no-go measurement comes first.

## Verification

- `pnpm lint`, `pnpm exec prettier --check .`, `pnpm test`, `pnpm build`.
- Entry-chunk check: `grep -c react-draggable dist/assets/index-*.js` → `0`.
- Performance traces as described in sections 3 and 6, with the numbers recorded in `docs/grid-and-charts.md`.

## Tasks

- [x] **Run Prettier on the unformatted shell files.** `pnpm exec prettier --write src/features/shell`. Done when `prettier --check src/features/shell` passes.
- [x] **Add a Prettier check to CI.** Add a `format:check` script and a CI step ([§5](#5-formatting-and-housekeeping)). Done when CI fails on an unformatted file.
- [x] **Get react-grid-layout out of the entry chunk.** Add `"sideEffects": ["**/*.css"]` to `package.json`. If the grid is still in the entry chunk, have the route loaders import from `api/queries` directly. No `React.lazy` ([§1](#1-bundle-get-react-grid-layout-out-of-the-entry-chunk)). Done when `dist/assets/index-*.js` contains no `react-draggable`, and tests and Storybook still pass.
- [x] **Decide on the chunk-size warning.** Record the new entry size. If it's still over 500 kB, lazy-load Spotlight or split vendor code, or raise `chunkSizeWarningLimit` with a comment. Done when the build has no warning, or the warning is documented.
- [x] **Hold `<main>` during a window resize.** Add a resize listener to `useMainLock` using Mantine `useWindowEvent('resize')` and `useDebouncedCallback(release, 150)`. It reacts to width changes only and shares `generation` with `holdFor`. Done when `useMainLock.test.ts` covers: height-only resize (no pin), a resize while a panel is moving, and release after the debounce.
- [-] **Measure `<Activity>` for far tiles before building it.** Prototype a hide margin of about 2 viewport heights with the skeleton shown next to the hidden content, and compare one width change on `/dashboards/perf` ([§3](#3-far-off-screen-tiles-in-activity-measure-before-building)). Done when the numbers are in `docs/grid-and-charts.md` and the go/no-go decision is written down. _(Sep 27: moved to the backlog in `docs/tasks.md`.)_
- [x] **Add the reduced-motion setting.** Add a `motion: 'system' | 'reduce'` field (defaults to `system` through the store's `merge`), generalize the `dirty` check in `useAppearanceForm`, add a `useMotion()` hook built on Mantine's `useReducedMotion`, and set `data-motion` on `<html>`. Done when the tests cover the setting, the hook and the attribute, and charts and pane transitions respect it.
- [-] **Spike: force Mantine transitions off.** Check whether `[data-motion='reduce']` CSS is enough for Mantine `Transition`. If not, set `transitionProps.duration` through the theme. Done when a Drawer opens instantly with the setting on and the OS setting off. _(Sep 27: moved to the backlog in `docs/tasks.md`.)_
- [-] **Trace the panel slide and breakpoint crossing.** Production build, `/dashboards/perf`. Done when the "Measured" column in `docs/grid-and-charts.md` is filled in: no long task inside the 180 ms slide, and the number of chart resizes when a toggle crosses a breakpoint. _(Sep 27: moved to the backlog in `docs/tasks.md`.)_
- [x] **Replace `docs/tasks.md` with a pointer.** A one-line link to `.agents/plan/`. Done when there is only one task list.
