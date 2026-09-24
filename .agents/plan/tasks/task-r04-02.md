# Tasks: Composable Page Header & Control Bar

Sep 24, 2026 · v1.1.0 · Reference: [plan-04.md](../plan-04.md)

- [ ] **Read the Mantine 9.6.2 docs for `Breadcrumbs`, `OverflowList` and `Menu`.** Write down the Styles API selectors and how `OverflowList` handles items that don't fit. Done when a short note on the chosen overflow approach is added to [research-page-header-composition.md](../research/research-page-header-composition.md).
- [ ] **Split `Page` into named parts.** `PageRoot`, `PageHeader`, `PageBreadcrumbs`, `PageTitleRow`, `PageHeading`, `PageTitle`, `PageDescription`, `PageActions`, `PageControlBar` and `PageBody`, each exported by name and through `Page`. Done when Fast Refresh keeps state on edit and `pnpm lint` passes.
- [ ] **Container queries on `Page.Root`.** `container-type: inline-size`, with the layout rules in `Page.module.css` written as `@container` (no viewport media queries). Done when the narrow-container story wraps correctly at 375, 768 and 1280 px.
- [ ] **`Page.Actions` with `OverflowList`.** Actions that don't fit move into a Menu; icon buttons use `ActionIcon` + `Tooltip` + `aria-label`. Done when a test covers opening the overflow Menu with the keyboard.
- [ ] **`Page.Breadcrumbs` and `useBreadcrumbs()`.** Crumbs come from `useMatches()` and `staticData.crumb`, render as `Anchor` + `<Link>` via `renderRoot`, and the last crumb has `aria-current="page"`. Done when the tests check the `<a href>` values and `aria-current`.
- [ ] **`Page.ControlBar`.** A wrapping ribbon with token gaps that takes children only. Done when the "full" story shows placeholder controls wrapping on a narrow container.
- [ ] **Migrate all 6 callers.** `DashboardList`, `DashboardView`, `DebugPage`, `SettingsPage`, `routes/-placeholder.tsx` and `Shell.stories.tsx`. Done when no call to `Page.Header title=` remains and tests pass.
- [ ] **Stories and tests.** Stories: minimal, standard, full, narrow container. Tests: one `h1`, breadcrumb landmark, keyboard access. Done when these run in `pnpm test` and Storybook a11y reports no new violations.
