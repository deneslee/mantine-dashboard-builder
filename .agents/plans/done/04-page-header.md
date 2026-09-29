# 04 Page header

Status: done (Sep 27, 2026) · Phase 2 · Depends on: 02 (done) · Blocks: 05's pickers (`TimeRangePicker` sits in `Page.ControlBar`) · Research: [page-header-composition](research/page-header-composition.md)

## Goal

Replace the fixed `title / description / actions` props of `Page.Header` with compound parts. Breadcrumbs, title, description, actions and a control bar each get their own slot, in the style of Grafana's `PageToolbar` and Metabase's parameter bar, without boolean props.

## Design

### 1. Parts

```
Page.Root              container-type: inline-size
├── Page.Header        CSS grid with named areas; the parts place themselves
│   ├── Page.Breadcrumbs   area "crumbs": <nav aria-label="Breadcrumb">, content comes from RouteBreadcrumbs
│   ├── Page.Title         area "title": <h1> (Title order=1), wraps, never clipped
│   ├── Page.Description   area "desc": dimmed text
│   ├── Page.Actions       area "actions": wrapping Group
│   └── Page.ControlBar    area "controls": wrapping ribbon (time range, refresh, filters), children only
└── Page.Body
```

```css
.header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'crumbs   crumbs'
    'title    actions'
    'desc     actions'
    'controls controls';
}

@container (max-width: 40em) {
  .header {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'crumbs' 'title' 'desc' 'actions' 'controls';
  }
}
```

- **Reading order:** parts are written in reading order (crumbs, title, description, actions, controls). The grid only places them, so keyboard and screen-reader order match what's on screen.
- **Spacing:** the parts space themselves with margins, not `row-gap`. An empty grid row still gets its gap, so a page without breadcrumbs would start with a blank line.
- **Named exports:** `PageRoot`, `PageHeader`, `PageBreadcrumbs`, `PageTitle`, `PageDescription`, `PageActions`, `PageControlBar` and `PageBody`, each exported by name and through the `Page` object. `Page` is already allowed in `react/only-export-components`.
- **No feature or router imports:** the design system only lays out the children it gets.
- **Actions don't overflow.** Every page has at most one action today, and one of them is a `SegmentedControl`, which a Menu can't hold. Revisit when a page has more than three actions.
- **No editable title yet.** Editing is phase 3. It will be a separate part (`Page.EditableTitle`), not a boolean prop.
- **Control bar not sticky yet.** If it's needed later, it becomes a separate part (`Page.StickyControlBar`).

### 2. Breadcrumbs

- **Source:** `useMatches()`, one crumb per match that has `staticData.crumb`.
  - `crumb` is a string, or a function of the match's loader data (the dashboard title from the `$id` loader).
  - Typing: add `crumb` to a `StaticDataRouteOption` augmentation next to the hook. The shell's augmentation for `contextTabs` is the model.
- **Hook:** `useBreadcrumbs()` in `src/hooks/useBreadcrumbs.ts`. The pages that show crumbs (DashboardView, SettingsPage, DebugPage, the integrations pages) are features and can't import `app/`; the hook only reads the router, so the shared layer is its place.
- **Rendering:** `src/components/navigation/RouteBreadcrumbs.tsx` calls the hook and renders Mantine `Breadcrumbs` inside `Page.Breadcrumbs`.
  - Each link is an `Anchor` with `renderRoot={(p) => <Link to=… {...p} />}` (AGENTS.md rule 4).
  - The last crumb is plain text with `aria-current="page"`.
  - Callers write `<RouteBreadcrumbs />` inside `Page.Header`.
- **No collapse:** routes are at most two levels deep (`/dashboards/$id`, `/integrations/sentry`).

### 3. Responsiveness (container queries)

- **Why not screen breakpoints:** `<main>`'s width depends on whether the sidebar and context bar are open, so viewport breakpoints (`visibleFrom`, `mantine-hidden-from-*`) are the wrong signal inside the page.
- **Mechanism:** `Page.Root` sets `container-type: inline-size`; `Page.module.css` has one `@container` rule that stacks the areas into a single column. postcss-preset-mantine supports `rem()` and `em()` inside it.

### 4. Migration

Update all 8 callers of `Page.Header` in one change, with no compatibility wrapper:

- `DashboardList`
- `DashboardView`
- `DebugPage`
- `SettingsPage`
- `routes/-placeholder.tsx`
- `Shell.stories.tsx`
- `IntegrationsCatalog`
- `SentryPage`: its hand-built `Breadcrumbs` becomes `RouteBreadcrumbs`

## Out of scope

Editable title, a sticky control bar, action overflow, crumb collapse, and the actual `TimeRangePicker`, refresh picker and filter controls (05).

## Risks

- **Container queries and portals:** container queries don't reach content in portals (Menus). That is expected.
- **Empty areas:** see "Spacing" in §1; the full and minimal stories check both.

## Tasks

- [x] **Check `OverflowList` before building on it.** Sep 27: in 9.6.2 it renders from `data` + `renderItem` + `renderOverflow`, so actions would have to be data, not children. Cut; the note is in [page-header-composition §4](research/page-header-composition.md#4-decision-sep-27-2026).
- [x] **Split `Page` into named parts.**
  - Parts: `PageRoot`, `PageHeader`, `PageBreadcrumbs`, `PageTitle`, `PageDescription`, `PageActions`, `PageControlBar` and `PageBody`, each exported by name and through `Page`.
  - `Page.Header` is a grid with named areas ([§1](#1-parts)).
  - The parts space themselves with margins, so a missing part leaves no gap.
  - `Page.ControlBar` is a wrapping group that takes children only.
  - Done when `pnpm lint` passes (`react/only-export-components` covers Fast Refresh) and the full story shows every area.
- [x] **Container queries on `Page.Root`.** `container-type: inline-size`, and one `@container` rule in `Page.module.css` that stacks the areas into a single column; no viewport media queries. Done when the narrow-container story wraps correctly at 375, 768 and 1280 px. *(Sep 27: measured in the app at 1400 and 560 px: two columns, then one with the actions under the description.)*
- [x] **`useBreadcrumbs()` and `RouteBreadcrumbs`.** *(Sep 27: `/dashboards` and `/integrations` got layout routes (`route.tsx`) so the parent crumb has a match; crumb links match exactly, or the router marks the parent `aria-current`.)*
  - The hook goes in `src/hooks/useBreadcrumbs.ts` and reads `useMatches()` and `staticData.crumb`; the `crumb` typing sits next to it.
  - `src/components/navigation/RouteBreadcrumbs.tsx` renders Mantine `Breadcrumbs` inside `Page.Breadcrumbs`: links as `Anchor` + `<Link>` via `renderRoot`, and the last crumb with `aria-current="page"`.
  - Add `crumb` to the Dashboards, `$id` (the title from loader data), Settings, Debug, Integrations and Sentry routes.
  - Done when tests check the `<a href>` values and `aria-current`.
- [x] **Migrate the callers.** All 8 in [§4](#4-migration), including `IntegrationsCatalog` and `SentryPage` (06 decision 3). Done when no `Page.Header title=` remains and the tests pass.
- [x] **Stories and tests.** Stories: minimal, standard, full (placeholder controls in the control bar), narrow container. Tests: one `h1`, the breadcrumb landmark, and actions and controls reached by keyboard in reading order. Done when these run in `pnpm test` and Storybook a11y reports no new violations. *(Sep 27: tests pass; the Storybook a11y check is still open, in `docs/tasks.md`, because Storybook wasn't running.)*

## Decisions

- **Sep 27: no `OverflowList` for actions.** It takes data (`data`, `renderItem`, `renderOverflow`), not children, and no page has more than one action.
- **Sep 27: no `Page.TitleRow` or `Page.Heading`.** `Page.Header` is a CSS grid with named areas, so callers write flat children.
- **Sep 27: the breadcrumb hook lives in shared `hooks/`.** The pages that show crumbs are features and can't import `app/`. A shared `RouteBreadcrumbs` renders the router links, so the design system stays router-free.
- **Sep 27: no middle-crumb collapse.** Routes are at most two levels deep.
- **Sep 27: both integrations pages are migrated.** Sentry stays a product feature ([06 decision 3](06-sentry.md#decisions)).
- **Sep 27: `RouteBreadcrumbs` renders nothing below two crumbs.** A top-level page's only crumb would repeat its title. Every page still includes it, so a page that gains a child route gets a trail without edits.
- **Sep 27: `Page.ControlBar` is a `role="group"`.** Its `aria-label` (e.g. "Dashboard controls") then names the set for screen readers; a plain `div` ignores the label.
- **Sep 27: layout routes for the parent crumbs.** `/dashboards/$id` and `/integrations/sentry` were siblings of their index routes, so "Dashboards" and "Integrations" had no match to hang a crumb on. `dashboards/route.tsx` and `integrations/route.tsx` have no component; they render their child.
- **Sep 24: container queries and router-driven breadcrumbs.** The editable title and the sticky control bar were cut from the first version.

## Verification

- **Stories** in `Page.stories.tsx`:
  - minimal (title only)
  - standard (breadcrumbs, title, description, actions)
  - full (control bar with placeholder controls)
  - narrow container (`Page.Root` inside 375 / 768 / 1280 px boxes, not the viewport)
- **Tests** in `Page.test.tsx` and `RouteBreadcrumbs.test.tsx`:
  - exactly one `<h1>`
  - `nav[aria-label="Breadcrumb"]`
  - the last crumb has `aria-current="page"`
  - crumbs are real `<a href>` with the right URLs
  - actions and controls are reached by keyboard in reading order
- **Regression checks:** the migrated screens render the same (Storybook a11y addon, no new violations).
