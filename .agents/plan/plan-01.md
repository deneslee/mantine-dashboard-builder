# Plan 01: Shell Polish, Performance & Bundle Optimization

Sep 24, 2026 · v1.0.0 · Tasks: [task-r01-01.md](./tasks/task-r01-01.md)

## Objective
Finalize Phase 1 chrome polish, optimize production bundle chunk sizes, ensure smooth canvas resize containment, and add motion preference controls.

## Scope & Architectural Strategy

### 1. Bundle Code-Splitting
* Currently, `dist/assets/index-*.js` is **620 kB** because `src/features/dashboards/index.ts` statically re-exports `DashboardView`, which pulls `react-grid-layout` (~120 kB) into the top-level bundle.
* **Resolution**:
  * Decouple the query loaders and lightweight types from `DashboardView`.
  * Dynamically load `DashboardView` via `React.lazy()` in `src/routes/dashboards/$id.tsx` or create a lazy entry.
  * Reduce primary bundle chunk size below 500 kB.

### 2. Window Resize Reflow Lock
* Canvas resize follows browser window dragging live on every frame, causing expensive chart reflows ($150-250\text{ ms}$ for 12 charts per frame).
* **Resolution**:
  * Extend [`useMainLock`](file:///c:/Users/leede/Documents/Projects/CDSS/PROJECT/mantine-dashboard-builder/src/features/shell/hooks/useMainLock.ts) to listen to browser `window.addEventListener('resize')`.
  * Pin `<main>` at its current content width during window resize and release it with a $150\text{ ms}$ debounce after resizing ceases.

### 3. Off-Screen Tile Activity Pause
* On large dashboards (e.g. 20+ charts), tiles far outside the viewport consume memory and trigger unneeded re-renders on breakpoint shifts.
* **Resolution**:
  * Enhance [`WidgetTile`](file:///c:/Users/leede/Documents/Projects/CDSS/PROJECT/mantine-dashboard-builder/src/features/dashboards/components/grid/WidgetTile.tsx) to mount visible content inside React 19 `<Activity mode={inFarViewport ? 'visible' : 'hidden'}>`.

### 4. Reduced-Motion Support in Settings
* Add reduced-motion option in Settings › Appearance (`system` | `reduce`).
* Set `data-motion` attribute on `<html>` and create a shared `useReducedMotion()` hook that combines the OS setting with the user preference for chart animations and grid transitions.

### 5. Formatting & Linting Maintenance
* Run Prettier on the four unformatted shell files:
  * `src/features/shell/navbar/Search.tsx`
  * `src/features/shell/Shell.test.tsx`
  * `src/features/shell/sidebar/Sidebar.test.tsx`
  * `src/features/shell/sidebar/SidebarNav.tsx`

## Verification Plan
* Run `pnpm lint` and `pnpm exec prettier --check src/features/shell`.
* Run `pnpm test` (all tests passing).
* Run `pnpm build` to verify the primary chunk drops under 500 kB.
* Profile `/dashboards/perf` in production build to verify window resize does not freeze frames.
