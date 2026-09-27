# Tasks: Composable Page Header & Control Bar

Sep 27, 2026 · v1.2.0 · Reference: [plan-04.md](../plan-04.md)

- [x] **Check `OverflowList` before building on it.** Sep 27: in 9.6.2 it renders from `data` + `renderItem` + `renderOverflow`, so actions would have to be data, not children. Cut; the note is in [research-page-header-composition.md §4](../research/research-page-header-composition.md#4-decision-sep-27-2026).
- [ ] **Split `Page` into named parts.**
  - Parts: `PageRoot`, `PageHeader`, `PageBreadcrumbs`, `PageTitle`, `PageDescription`, `PageActions`, `PageControlBar` and `PageBody`, each exported by name and through `Page`.
  - `Page.Header` is a grid with named areas ([plan-04 §1](../plan-04.md#1-parts)).
  - The parts space themselves with margins, so a missing part leaves no gap.
  - `Page.ControlBar` is a wrapping group that takes children only.
  - Done when `pnpm lint` passes (`react/only-export-components` covers Fast Refresh) and the full story shows every area.
- [ ] **Container queries on `Page.Root`.** `container-type: inline-size`, and one `@container` rule in `Page.module.css` that stacks the areas into a single column; no viewport media queries. Done when the narrow-container story wraps correctly at 375, 768 and 1280 px.
- [ ] **`useBreadcrumbs()` and `RouteBreadcrumbs`.**
  - The hook goes in `src/hooks/useBreadcrumbs.ts` and reads `useMatches()` and `staticData.crumb`; the `crumb` typing sits next to it.
  - `src/components/navigation/RouteBreadcrumbs.tsx` renders Mantine `Breadcrumbs` inside `Page.Breadcrumbs`: links as `Anchor` + `<Link>` via `renderRoot`, and the last crumb with `aria-current="page"`.
  - Add `crumb` to the Dashboards, `$id` (the title from loader data), Settings and Debug routes.
  - Done when tests check the `<a href>` values and `aria-current`.
- [ ] **Migrate the callers.**
  - Always: `DashboardList`, `DashboardView`, `DebugPage`, `SettingsPage`, `routes/-placeholder.tsx` and `Shell.stories.tsx`.
  - If Plan 06 keeps Integrations: `IntegrationsCatalog` and `SentryPage`, whose hand-built `Breadcrumbs` becomes `RouteBreadcrumbs`.
  - Needs Plan 06 decision 3 first.
  - Done when no `Page.Header title=` remains and the tests pass.
- [ ] **Stories and tests.** Stories: minimal, standard, full (placeholder controls in the control bar), narrow container. Tests: one `h1`, the breadcrumb landmark, and actions and controls reached by keyboard in reading order. Done when these run in `pnpm test` and Storybook a11y reports no new violations.
