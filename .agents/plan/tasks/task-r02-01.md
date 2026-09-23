# Tasks: Composable Page Header & Control Bar

Sep 24, 2026 · v1.0.0 · Reference: [plan-02.md](../plan/plan-02.md)

- [ ] **Refactor Page compound parts to named exports.** In `src/design-system/components/Page/Page.tsx`, export each part individually (`PageRoot`, `PageHeader`, `PageBody`) to ensure React Fast Refresh stability.
- [ ] **Implement Page.Breadcrumbs and Page.TitleRow.** Add `PageBreadcrumbs` with Mantine `Breadcrumbs` styling and `PageTitleRow` supporting responsive heading hierarchy, description, and status badges.
- [ ] **Implement Page.ControlBar ribbon.** Create `PageControlBar` compound subcomponent with CSS flex wrapping, designed to host the time-range picker, refresh selector, and variable filters.
- [ ] **Implement Page.Actions with responsive overflow.** Build `PageActions` accepting `ActionIcon` buttons and primary call-to-actions, with automatic mobile overflow menu wrapping.
- [ ] **Update existing routes to the new Page compound syntax.** Refactor `DashboardView`, `DashboardList`, `SettingsPage`, `DebugPage`, and placeholder routes to use the new compound `Page` structure without regressions.
- [ ] **Create Storybook stories for all Page header variants.** Add stories in `src/design-system/components/Page/Page.stories.tsx` covering all variants (minimal, standard, full control bar, and narrow viewports).
- [ ] **Add unit tests for Page component accessibility.** Test landmark roles, heading order, breadcrumb ARIA labels, and keyboard navigation in `src/design-system/components/Page/Page.test.tsx`.
