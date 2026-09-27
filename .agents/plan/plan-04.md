# Plan 04: Composable Page Header & Control Bar

Sep 27, 2026 · v1.2.0 · Tasks: [task-r04-03.md](./tasks/task-r04-03.md) · Research: [research-page-header-composition.md](./research/research-page-header-composition.md)

**v1.2 changes:**

- **Actions:** no `OverflowList`. It takes data (`data`, `renderItem`, `renderOverflow`), not children, and no page has more than one action.
- **Parts:** `Page.TitleRow` and `Page.Heading` are gone. `Page.Header` is a CSS grid with named areas, so callers write flat children.
- **Breadcrumbs:** the hook moves to shared `hooks/`, because the pages that show crumbs are features and can't import `app/`. A shared `RouteBreadcrumbs` renders the router links, so the design system stays router-free.
- **Crumbs:** the middle-crumb collapse is cut; routes are at most two levels deep.
- **Migration:** covers all 8 callers, including the two integrations pages, unless Plan 06 removes them first.

**Earlier:** v1.1 added container queries and router-driven breadcrumbs, and cut the editable title and the sticky control bar.

**Order:** 4 of 6 · **Depends on:** Plan 02 (done); Plan 03 only for spacing variables that already exist, so it can run alongside Plan 03's lint rollout; **Plan 06 decision 3** before the migration task (it decides whether the two integrations pages get migrated or deleted) · **Blocks:** Plan 05's pickers (`TimeRangePicker` sits in `Page.ControlBar`)

## Objective

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
- **Actions don't overflow.**
  - Every page has at most one action today, and one of them is a `SegmentedControl`, which a Menu can't hold.
  - Mantine `OverflowList` renders from `data` + `renderItem` + `renderOverflow`, so actions would have to become data, not children.
  - Revisit when a page has more than three actions.
- **No editable title in v1.** Editing is phase 3. It will be a separate part (`Page.EditableTitle`), not a boolean prop.
- **Control bar not sticky in v1.** If it's needed later, it becomes a separate part (`Page.StickyControlBar`).

### 2. Breadcrumbs

- **Source:** `useMatches()`, one crumb per match that has `staticData.crumb`.
  - `crumb` is a string, or a function of the match's loader data (the dashboard title from the `$id` loader).
  - Typing: add `crumb` to a `StaticDataRouteOption` augmentation next to the hook. The shell's augmentation for `contextTabs` is the model.
- **Hook:** `useBreadcrumbs()` in `src/hooks/useBreadcrumbs.ts`. The pages that show crumbs (DashboardView, SettingsPage, DebugPage) are features and can't import `app/`; the hook only reads the router, so the shared layer is its place.
- **Rendering:** `src/components/navigation/RouteBreadcrumbs.tsx` calls the hook and renders Mantine `Breadcrumbs` inside `Page.Breadcrumbs`.
  - Each link is an `Anchor` with `renderRoot={(p) => <Link to=… {...p} />}` (AGENTS.md rule 4).
  - The last crumb is plain text with `aria-current="page"`.
  - Callers write `<RouteBreadcrumbs />` inside `Page.Header`.
- **No collapse:** routes are at most two levels deep (`/dashboards/$id`).

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
- `IntegrationsCatalog`, only if Plan 06 keeps Integrations as a product feature
- `SentryPage`, same condition; its hand-built `Breadcrumbs` becomes `RouteBreadcrumbs`

## Out of scope

Editable title, a sticky control bar, action overflow, crumb collapse, and the actual `TimeRangePicker`, refresh picker and filter controls (Plan 05).

## Risks

- **Container queries and portals:** container queries don't reach content in portals (Menus). That is expected.
- **Empty areas:** see "Spacing" in §1; the full and minimal stories check both.

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
