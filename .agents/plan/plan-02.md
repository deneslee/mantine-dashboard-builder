# Plan 02: Composable Page Header & Control Bar

Sep 24, 2026 · v1.1.0 · Tasks: [task-r02-02.md](./tasks/task-r02-02.md) · Research: [research-page-header-composition.md](./research/research-page-header-composition.md)

**Order:** 4 of 5 · **Depends on:** Plan 04 (spacing, surface and radius tokens), Plan 05 (final file locations, no barrels) · **Blocks:** Plan 03 (`TimeRangePicker` sits in `Page.ControlBar`)

**v1.1 changes:**
- **Structure:** `Page.Heading` groups Title and Description, next to Actions.
- **Overflow:** Mantine `OverflowList` handles actions that don't fit, instead of a custom menu.
- **Responsiveness:** container queries replace viewport breakpoints.
- **Breadcrumbs:** come from router matches and render as `<Link>`.
- **Cut:** the editable title (it's phase 3).
- **Sticky control bar:** decided (not in v1).
- **Migration:** covers all 6 current callers.

## Objective
Replace the fixed `title / description / actions` props of `Page.Header` with compound parts. That gives breadcrumbs, a title block, actions and a control bar their own slots, in the style of Grafana's `PageToolbar` and Metabase's parameter bar, without adding boolean props.

## Design

### 1. Parts
```
Page.Root            container-type: inline-size (responds to container width, not screen size)
├── Page.Header
│   ├── Page.Breadcrumbs   <nav aria-label="Breadcrumb">, Mantine Breadcrumbs, items rendered as <Link>
│   ├── Page.TitleRow      flex row, wraps via @container
│   │   ├── Page.Heading   stack: Title + Description
│   │   │   ├── Page.Title         <h1> (Title order=1), truncates
│   │   │   └── Page.Description   dimmed text
│   │   └── Page.Actions   Mantine OverflowList → items that don't fit move to a Menu
│   └── Page.ControlBar    wrapping ribbon; only accepts children (time range, refresh, filters)
└── Page.Body
```
* **Named exports:** every part is exported by name (`PageRoot` … `PageBody`) and through the `Page` object, as AGENTS.md requires. `Page` is already allowed in the `only-export-components` rule.
* **No feature imports:** the design system never imports feature code. `ControlBar` only lays out whatever children it gets.
* **No editable title in v1.** Editing is phase 3. It will be a separate part (`Page.EditableTitle`), not a boolean prop.
* **Control bar not sticky in v1.** If it's needed later, it becomes a separate part (`Page.StickyControlBar`), not a boolean prop.

### 2. Breadcrumbs
* **Source:** `useMatches()`, one crumb per match that has `staticData.crumb` (a string, or a function of loader data).
* **Where it lives:** a small `useBreadcrumbs()` hook in the app layer (Plan 05). `Page.Breadcrumbs` only renders the items it's given.
* **Links:** each item is Mantine `Anchor` with `renderRoot={(p) => <Link to=… {...p} />}` (AGENTS.md rule 4). The last item is plain text with `aria-current="page"`.
* **Narrow containers:** on narrow containers, the middle crumbs collapse into a Menu ("…").

### 3. Responsiveness (container queries)
* **Why not screen breakpoints:** `<main>`'s width depends on whether the sidebar and context bar are open, so viewport breakpoints (`visibleFrom`, `mantine-hidden-from-*`) are the wrong signal inside the page.
* **Mechanism:** `Page.Root` sets `container-type: inline-size`, and `Page.module.css` uses `@container` rules. postcss-preset-mantine supports `rem()` and `em()` inside them.
* **Wide container:** Heading and Actions sit on one row, with the ControlBar below.
* **Narrow container:** Actions wrap under the Heading, `OverflowList` moves secondary actions into a Menu, and titles wrap without being clipped.

### 4. Migration
* Update the six callers of `Page.Header` in one change:
  - `DashboardList`
  - `DashboardView`
  - `DebugPage`
  - `SettingsPage`
  - `routes/-placeholder.tsx`
  - `Shell.stories.tsx`
* No compatibility wrapper, because there are few callers.

## Out of scope
Editable title, a sticky control bar, and the actual `TimeRangePicker`, refresh picker and filter controls (Plan 03).

## Risks
* **`OverflowList` API:** its behaviour in Mantine 9.6.2 has to be checked in the docs before building. If it can't host a Menu fallback, use a `Menu` shown below a container-query breakpoint.
* **Container queries and portals:** container queries don't reach content in portals (Menus). That is expected.

## Verification
* **Stories** in `Page.stories.tsx`:
  - minimal (title only)
  - standard (breadcrumbs, title, description, actions)
  - full (control bar with placeholder controls)
  - narrow container (the story wraps `Page.Root` in 375 / 768 / 1280 px boxes, not the viewport)
* **Tests** in `Page.test.tsx`:
  - exactly one `<h1>`
  - `nav[aria-label="Breadcrumb"]`
  - the last crumb has `aria-current="page"`
  - crumbs are real `<a href>`
  - the overflow Menu opens with the keyboard and its items can be reached
* **Regression checks:** the six migrated screens render the same (Storybook a11y addon, no new violations).
