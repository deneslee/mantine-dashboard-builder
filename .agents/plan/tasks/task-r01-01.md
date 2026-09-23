# Tasks: Shell Polish, Performance & Bundle Optimization

Sep 24, 2026 · v1.0.0 · Reference: [plan-01.md](../plan/plan-01.md)

- [ ] **Run Prettier on unformatted shell files.** Fix formatting in `src/features/shell/navbar/Search.tsx`, `Shell.test.tsx`, `Sidebar.test.tsx`, and `SidebarNav.tsx` (`pnpm exec prettier --write src/features/shell`).
- [ ] **Code-split DashboardView to shrink main bundle.** Lazy-load `DashboardView` in `src/routes/dashboards/$id.tsx` and avoid exporting it directly from `src/features/dashboards/index.ts` so `react-grid-layout` moves out of the 620 kB main chunk into the route chunk.
- [ ] **Lock main content during browser window resize.** Update `useMainLock` to attach a window resize listener that sets `--shell-main-width` and releases 150ms after resizing ends, preventing 60fps chart re-measuring.
- [ ] **Pause far off-screen tiles with React 19 Activity.** Wrap tile contents in `WidgetTile` in `<Activity mode={near ? 'visible' : 'hidden'}>` with a rootMargin threshold so off-screen widgets do not re-render on width adjustments.
- [ ] **Add reduced-motion option to Settings.** Add a `reducedMotion` field in `useAppearanceForm` and Settings › Appearance (`system` | `reduce`), set `data-motion` on `<html>`, and expose a `useReducedMotion()` hook.
- [ ] **Trace and measure panel slide performance.** Build production app (`pnpm build`), run `/dashboards/perf`, and verify that no long tasks fall inside the 180ms panel transition.
