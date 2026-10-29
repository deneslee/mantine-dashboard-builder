# Split view

Status: open (component and stories done Oct 28; docked side pane next) · Step P1 (Docked side pane) · Depends on: none · Research: [p1-ui-reference](../research/p1-ui-reference.md)

## Goal

One `ui/` component for resizable panes, used wherever content sits side by side:

- **Dashboard editor:** the grid plus a docked side pane (palette, widget editor, Inspect), which is P1.1.
- **Inside a widget:** chart | table, or text | image, left/right or top/bottom.
- **Page layouts:** for example a therapy planner with plan list | exercise grid | body map, the outer two collapsible.

It does only layout: sizes, min and max, collapse, compact, close and the narrow fallback. What goes in a pane is the caller's business.

## Mantine today (9.7.4, checked against mantine-mcp Oct 28)

- **Two layers.** `Splitter` / `Splitter.Pane` sit on the `useSplitter` hook; [Shell.tsx](../../../src/shell/Shell.tsx) already uses them.
- **Units.**
  - `defaultSize`, `min` and `max` take a number or `%` (flexible: the pane shares leftover space) or `px` / `rem` (fixed: the pane keeps its size when the container resizes).
  - `sizes` and `onSizeChange` report sizes in the unit each pane was declared with.
  - When fixed panes don't fit the container, they shrink proportionally.
- **Collapse.**
  - Set with `collapsible` on a pane; `collapseThreshold` sets when it snaps shut and defaults to `min`.
  - A collapsed pane is 0 wide.
  - The imperative API through `splitterRef` has `collapse`, `expand`, `toggleCollapse`, `setSizes`, `collapsed[]` and `pixelMode`.
  - `onCollapseChange(index, collapsed)` reports collapse changes.
- **Keyboard** (WAI-ARIA window splitter): Arrow keys move by `step`, Shift+Arrow by `shiftStep`, Home/End jump to min/max, Enter toggles the collapse of the smaller collapsible neighbour.
- **Other props:** `redistribute: 'nearest' | 'equal' | fn` for three or more panes; `resetOnDoubleClick`; `withHandle`, `lineSize` and `handleIcon`; Styles API selectors `root`, `pane`, `handle`, `thumb`.
- **Constraint:** `Splitter.Pane` must be a direct child of `Splitter`; a wrapped pane is not recognised.

### Other Mantine pieces to build with

All checked in mantine-mcp Oct 28 and installed in 9.7.4. Shell's current code was left out of the comparison on purpose.

| Need                                            | Use                                                                                                                                       | Instead of                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Panes, drag, keyboard, collapse                 | `Splitter` (on `useSplitter`); drop to the hook only if `Splitter` can't host the compact rail                                            | a custom drag handler            |
| Pane state, controlled or not                   | `useUncontrolled({ value, defaultValue, onChange })` per pane                                                                             | our own `state`/`onState` wiring |
| Container width for the Drawer fallback         | `useElementSize` on the root                                                                                                              | `useMediaQuery` (viewport)       |
| Narrow fallback                                 | `Drawer`                                                                                                                                  | –                                |
| Focus back to the opener on close               | `useFocusReturn({ opened })`                                                                                                              | storing the trigger element      |
| Escape closes the pane                          | `getHotkeyHandler([['Escape', close]])` on the pane's `onKeyDown` (scoped, not document-wide `useHotkeys`)                                | a keydown listener               |
| Compact icon list, keyboard-navigable           | `Toolbar orientation="vertical"` (`role="toolbar"`, roving tabindex, `aria-orientation`) with `ActionIcon` + `Tooltip` in `Tooltip.Group` | `useRovingIndex` by hand         |
| Persisting sizes                                | `useLocalStorage` with a key from `storageKey(name)`, done by the caller                                                                  | –                                |
| Size animation on open/compact/close            | CSS transition on the pane; `useReducedMotion` (or the CSS media query) turns it off                                                      | JS animation                     |
| Pane content that adapts as the pane is dragged | `@container` queries in the pane's CSS module                                                                                             | JS width checks                  |

Seen and not used:

- `AppShell` collapses its navbar and aside by viewport, not by container, and only at the page edges.
- `FloatingWindow` / `useFloatingWindow` would give an undocked, floating pane; that's for later, along with Grafana-style undock.
- `ActionBar` is a fixed bottom bar for bulk actions; it's a candidate for P1.3.9 "Save stays reachable", not for panes.
- `use-collapse` animates height only.
- `use-drag` would mean rebuilding `useSplitter`.

## Design

`SplitView` in `src/ui/components/SplitView/`, compound like `Page.*`:

```tsx
<SplitView orientation="horizontal" onLayoutChange={…}>
  <SplitView.Pane id="grid" defaultSize={100} min="360px">…</SplitView.Pane>
  <SplitView.Pane id="editor" defaultSize="320px" min="240px" max="50%" collapsible fallback="drawer" label="Widget editor">
    <SplitView.Header title="Add widget" icon={IconPlus} />   {/* Back · title · Compact · Close; icon only when compact */}
    <WidgetCards />                                             {/* reads useSplitViewPane().isCompact */}
  </SplitView.Pane>
</SplitView>
```

- **Root maps children.** `SplitView` reads its direct `SplitView.Pane` children and renders a Mantine `Splitter.Pane` for each, so the direct-child rule holds. Callers never touch `Splitter`.
- **Pane states, one per pane:**
  - `open`;
  - `compact`: shrinks to a fixed rail width (the pane's `compactSize`, default from a `--app-*` token, about an `ActionIcon` plus padding). Min and max are pinned to that width, so the rail can't be dragged. The same content stays mounted and switches to icons:
    - the header shows only its icon, and clicking it expands the pane;
    - lists such as widget cards render icon-only, as a vertical `Toolbar` with `Tooltip` labels;
    - content reads `useSplitViewPane().isCompact`.

    No separate rail component.

  - `collapsed` (Mantine collapse: 0 wide, the handle stays and Enter reopens it);
  - `closed` (a 0px fixed pane with its content unmounted, as Shell does).

  Uncontrolled by default; `state` and `onStateChange` on the pane make it controlled, through `useUncontrolled`. Expanding from compact or collapsed goes back to the last open size.

- **Context, two hooks.**
  - `useSplitView()` returns `open(id)`, `close(id)`, `collapse(id)`, `compact(id)` and `state(id)`, for outside triggers such as an "Add widget" button.
  - `useSplitViewPane()` returns the current pane's `state`, `isCompact` and actions, for `SplitView.Header` and the pane's content.
- **Narrow fallback.** `fallback="drawer"`: when the root's own width (`useElementSize`, not the viewport, per AGENTS.md) is below `drawerBelow`, the pane renders in a Mantine `Drawer` instead of a column. Without a fallback, the pane just shrinks to its `min`.
- **Sizes are committed on release** (`onResizeEnd`, plus `onSizeChange` for keyboard steps), never per drag frame. `onLayoutChange(sizes)` lets the caller persist them, e.g. with `storageKey`. Same rule as Shell.
- **Accessibility.** A docked pane is a `role="region"` with `aria-label={label}`, not a dialog. Opening moves focus to the header title; Close returns focus to the element that opened it. Escape closes a pane that has a Close button. Drawer mode gets Mantine's dialog semantics.
- **Look.**
  - The handle is a 1px line with no thumb by default, like Shell; `variant="grip"` shows Mantine's thumb (in widgets, where the line is less obvious).
  - Theme in `ui/theme/components/SplitterTheme.ts`, tokens only.

### Inside the grid

One wrapper is enough. The tile drag starts only from `[data-widget-drag]` in the widget header ([DashboardGrid.tsx](../../../src/features/dashboards/grid/DashboardGrid.tsx)), so a split handle in the tile body never moves the tile. A tile resize changes the container width, and `Splitter` refits.

Inside widgets, use `%` mins: px mins would fight the tile's own minimum size. A split widget's sizes would belong in its options, but that's for the widget that needs it, not this plan.

### Not now

- Rebuilding Shell on `SplitView`. Shell has its own main-width lock; revisit once `SplitView` has settled.
- Per-mode widths and dock/undock (Grafana has both).
- Saving the layout inside the component.

## Tasks

- [x] **Component.** `SplitView.Root`, `.Pane` and `.Header` in [SplitViewRoot.tsx](../../../src/ui/components/SplitView/SplitViewRoot.tsx) and [SplitViewHeader.tsx](../../../src/ui/components/SplitView/SplitViewHeader.tsx), gathered in [SplitView.ts](../../../src/ui/components/SplitView/SplitView.ts); `useSplitView` and `useSplitViewPane` in [useSplitView.ts](../../../src/ui/components/SplitView/useSplitView.ts); the layout rules in [splitViewLayout.ts](../../../src/ui/components/SplitView/splitViewLayout.ts) with a unit test; the rail width and Drawer cutoff in `dimensions.pane`. Styles stay in `SplitView.module.css` (no theme file: only SplitView renders this Splitter). Done when the stories below render and lint passes.
- [x] **Stories, with controls.** `argTypes` for orientation, pane count (2/3), min and max, collapsible, closable, compact, fallback width and handle variant; actions as `fn()` args.
  - `Playground` (every control).
  - `EditorPane` (grid placeholder plus an "Add widget" side pane: header, then a list of widget cards).
  - `Compact` (the same pane as an icon rail: header icon, cards as a vertical `Toolbar` with tooltips; clicking the header icon expands it).
  - `ThreePanes` and `Vertical` (Playground presets).
  - `InWidget` and `InWidgetStacked` (chart | table in a tile-sized `Paper`, grip handle, collapsible `%` panes).
  - `Planner3Column` (plan timeline | searchable exercise grid | body map; outer panes compact).
  - `Narrow` (side pane as a Drawer).
  - `Keyboard` (play function: the trigger opens the pane with focus on its title, an arrow key resizes, Escape closes and focus returns to the trigger).

  Done when each story passes the a11y check (all 10 pass, Oct 28).

- [ ] **Docked side pane on it.** The dashboard page uses `SplitView` for the palette, widget editor and Inspect; `PaneDrawer` is deleted. Done when P1.1's parts in [current.json](../current.json) are ticked.

## Decisions

- Oct 28, P1.1: the dashboard page fills the main pane (`calc(100dvh - navbar)`); its header stays and the grid scrolls in its own SplitView pane, so the side pane stays in view beside a long grid (Grafana's `DashboardSidebarSplitter` model). The side pane is controlled by what already holds the state (palette in the store, `?widget` and `?inspect` in the URL); Close and Esc clear it.
- Oct 28, P1.1: opening a pane focuses its title after a frame and keeps trying for about a second, because a menu returns focus to its button after the click and lazy pane content arrives later.
- Oct 28: one `ui/` component on Mantine `Splitter`, not on `useSplitter` directly. It already has the Styles API, keyboard support and collapse; the hook is the fallback if `Splitter` can't render the rail.
- Oct 28: compact is our own state: the pane shrinks to a fixed width with min = max = that width, and the same content switches to icons. Mantine only collapses to 0. No separate rail component.
- Oct 28: built from Mantine parts, judged without regard to how Shell works today. `useElementSize` for the fallback, `useFocusReturn` for focus, `Toolbar` for the icon list (table above).
- Oct 28, while building: pane state lives in one map in `SplitView.Root`, not `useUncontrolled` per pane. `Splitter.Pane` must be a direct child, so panes cannot be components with their own hooks; the root applies the same controlled-or-not rule (`state` wins, else internal, else `defaultState`).
- Oct 28, while building: Escape is a pane `onKeyDown` that skips events already handled (`defaultPrevented`), not `getHotkeyHandler`, so Escape in a Select or Menu inside the pane does not close it.
- Oct 28: files live in `src/ui/components/SplitView/`. Component files export only components; the `SplitView` object has its own `SplitView.ts`, so Fast Refresh needs no lint exception.
- Oct 28, while building: opening a pane always moves focus to its title; compact and expand move it only when focus was in the pane, so an outside click keeps its focus.

## Open decisions

- **Name.** `SplitView`, or `Panes`?

## Verification

- Stories above, a11y on.
- A unit test for the state reducer (open → compact → collapsed → closed and back, focus target kept).
- `pnpm lint`; stories run once `@storybook/react-vite` installs again (it's missing from the current install).
