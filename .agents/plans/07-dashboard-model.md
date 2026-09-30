# 07 Dashboard model

Status: design agreed Sep 29, not started · Cross-cutting: stage A and B are phase 3, stage C is phase 4 · Depends on: 05 (done). The Integrations foundation comes before stage C's datasource work. · Reference: [dashboard.md](../../docs/dashboard/dashboard.md), [grid-and-charts.md](../../docs/dashboard/grid-and-charts.md)

## Goal

Decide how a dashboard works for the people who view it and the people who edit it: where each kind of state lives, how time range, refresh and variables pass from the dashboard down to one widget, what a widget shows and offers, which modes exist, how layout, variables and data flow work, and where dashboards sit in the navigation. The design was settled step by step on Sep 29; this file is the handoff for building it.

## Design

### 1. State and scopes

**Layers.** Each kind of state has one home:

| Layer        | What's in it                                                                                | Where                                                                          | Why                                   |
| ------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------- |
| Document     | Widgets, layout blocks, saved overrides, variable definitions, defaults                     | Dashboard store (zustand + immer + zundo), saved through `DashboardRepository` | Edited, undone, saved                 |
| View state   | Dashboard time range and refresh, variable values, viewers' widget overrides, the mode (§3) | URL search params, validated with zod                                          | Shareable, back/forward               |
| UI state     | Selection, the hovered widget (for hover sync), open menus, rows collapsed this session     | Component state or a small store                                               | Not shared, not undone                |
| Server state | Query results                                                                               | TanStack Query, keyed by each widget's resolved inputs                         | Cache and refetch                     |
| Static       | Widget, datasource and integration registries                                               | Context, built once in `app/`                                                  | Never changes at runtime              |
| Personal     | Density (§2)                                                                                | The persisted settings store, next to theme and reduced motion                 | Follows the viewer, not the dashboard |

**Providers.** The shell's pattern: one store per provider, hooks that select from it.

- `DashboardProvider` creates the store for one dashboard, keyed by its id, as `ShellProvider` does with `createShellStore`. Opening another dashboard gives a fresh store, so the previous one is never shown while the next loads.
- There is no React context per scope level. A time value in context would re-render every tile under it on each change. Each tile knows its widget id, and `useEffectiveTimeRange(widgetId)` (and the same for refresh and variables) resolves the chain from the URL and the store, so only the tiles whose result changed re-render.

**Scopes that inherit.** The chain is dashboard → section (a row or a tab, §4) → widget. Each level can set a time range and a refresh interval, or inherit them; variables are set at the dashboard or a section. This is the Grafana Scenes model: an object uses the nearest ancestor that has a value.

A widget's time has three modes:

- **Inherit:** the default; nothing is stored.
- **Own range**, for example `now/d → now` for a "Today" KPI. It always applies, including when the dashboard range is absolute.
- **Shift**, for example the parent's range one week earlier, to compare periods.

**Who changes it.** Anyone can change a widget's time from its menu; that change is temporary and lives in the URL. In edit mode the same control writes the document, and Save keeps it. Section overrides are set by authors only.

**Precedence**, highest first: the viewer's widget override (URL), the widget's saved override, the section's saved override, the dashboard range (URL), the document default. A shift applies to whatever its parent resolved to.

**Which widgets get it.** The widget type declares time support, and at least one of its queries uses a time-aware datasource. A markdown widget, a heading or a static `local-json` file gets no time option.

**URL.**

```text
?from=now-24h&to=now&refresh=1m      dashboard range and refresh
&var-region=eu                       variable values (§5)
&wt={ <widgetId>: override }         viewers' widget overrides; the router serializes the object
&view=<id> | &inspect=<id>&tab=data | &mode=edit[&widget=<id>]    modes (§3)
```

### 2. Widget

**Header.** One row:

| Part      | When it shows                                                                                    | Behaviour                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Title     | Always                                                                                           | Required in the schema. It is the tile's accessible name; long titles truncate, with the full text on hover. |
| Info icon | Only when the widget has a description                                                           | Hover or focus shows the description. It stays open while hovered and closes on Esc (WCAG 1.4.13).           |
| Clock     | Only when the widget's time differs from the dashboard's                                         | Icon only, the range on hover (Kibana found a full-text badge distracting). Click opens the time popover.    |
| Status    | While refetching, or with partial data or a warning                                              | The planned 2px bar under the header, and a warning icon.                                                    |
| Menu (…)  | On hover, on focus inside the tile, always in edit mode, always on touch screens (`hover: none`) | Hidden with opacity, never removed, so it stays in the tab order.                                            |

In edit mode the header is the drag handle. A `header` widget (a heading) has no tile header of its own.

**Menu.** Built from the widget type's capabilities and its queries:

| Group | Item                                  | Key | Shown when                                                         |
| ----- | ------------------------------------- | --- | ------------------------------------------------------------------ |
| View  | View (one widget, full screen)        | `v` | Always                                                             |
|       | Inspect                               | `i` | The widget has queries                                             |
|       | Time range…                           | `t` | Time support and a time-aware datasource (§1)                      |
|       | Refresh                               |     | The widget has queries                                             |
| Share | Copy link (this widget, current time) |     | Always                                                             |
|       | Export data (CSV, JSON)               |     | Phase 4                                                            |
| Edit  | Edit                                  | `e` | Edit mode                                                          |
|       | Hover sync group…                     |     | Time charts, edit mode                                             |
|       | Move to… and Resize…                  |     | Edit mode; the single-pointer alternative to dragging (WCAG 2.5.7) |
|       | Duplicate, Remove                     |     | Edit mode                                                          |

Single-letter keys work only while a tile is hovered or focused, and never while typing in a field. `?` lists the shortcuts. Move, resize, duplicate and remove announce the result in a live region, naming the widget and its old and new position, and focus returns to the menu button (Atlassian's drag-and-drop guidance).

**Registry additions.**

```ts
WidgetDefinition { …, capabilities: { time: boolean; inspect: boolean; export: ('csv' | 'json')[]; hoverSync: boolean } }
DatasourceDefinition { …, timeAware: boolean; runsOn: 'browser' | 'server'; maxConcurrency: number }
Widget (document) { type, title, description?, options, queries, time?: TimeOverride, syncGroup? }
TimeOverride = { mode: 'range'; from; to } | { mode: 'shift'; by }      absent = inherit
```

| Type                 | Time | Inspect | Export    | Hover sync                   |
| -------------------- | ---- | ------- | --------- | ---------------------------- |
| `chart`              | Yes  | Yes     | CSV, JSON | Yes, when the x-axis is time |
| `kpi`                | Yes  | Yes     | CSV, JSON | No                           |
| `table`              | Yes  | Yes     | CSV, JSON | No (row highlight later)     |
| `markdown`, `header` | No   | No      | No        | No                           |

**Hover sync.** Some charts are linked so hovering one shows the same moment on all of them.

- Charts with the same `syncGroup` are linked; none are by default.
- Recharts syncs charts that share a `syncId`; Mantine charts pass it through `lineChartProps` / `areaChartProps`.
- Match by timestamp with a custom `syncMethod`: the default matches array indexes (equal lengths only) and `value` needs identical x values. The custom function finds the nearest timestamp and subtracts a widget's shift, so a "last week" chart lines up with "this week".
- The chart under the pointer shows the full tooltip; the others show only the cursor line. The hovered widget id is UI state (§1).
- Each pointer move re-renders every chart in the group; Recharts limits this to once per frame. Measure a large group on `/dashboards/perf`.

**Spacing and density.**

- Two values, both tokens: the gap between widgets and the padding inside a widget. Row height stays fixed, so layouts keep their shape.
- Three density steps (compact, comfortable as the default, spacious), each picking values from the spacing scale: semantic `dashboard.gap` and `widget.padding`.
- CSS reads the variables. react-grid-layout needs numbers for `margin` and `containerPadding`, which come from a TS constant, like `iconSize`. Switching density flips a `data-density` attribute on the dashboard root, as the color scheme does, and the grid lays out once.
- Density is a personal setting in Settings › Appearance. Dashboards don't store it, and there is no per-widget spacing.

### 3. Modes

Every mode is in the URL, validated with zod, so reload, back/forward and shared links work.

| Mode                   | URL                      | Behaviour                                                                                                                                                                                                                       |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| View                   | none                     | The default. Viewers' time and variable changes go in the URL (§1).                                                                                                                                                             |
| One widget full screen | `?view=<id>`             | The widget fills the main pane; the chrome stays. The grid stays mounted inside `Activity` (hidden): its state is kept, its effects and query subscriptions are cleaned up, so hidden tiles don't refetch. Esc or Back returns. |
| Inspect                | `?inspect=<id>&tab=…`    | A right-side drawer (below). Works together with full screen: the widget large, its data beside it.                                                                                                                             |
| Edit                   | `?mode=edit`             | Save, Discard, Undo and Redo in the page header's control bar. The draft is kept in localStorage, so a reload stays in edit mode. Leaving with unsaved changes asks first.                                                      |
| Edit one widget        | `?mode=edit&widget=<id>` | Where the options and the query editor live is open decision 1.                                                                                                                                                                 |

**The context bar is for help, general information and notifications,** not for every tool. Working tools such as Inspect open in right-side drawers instead.

**Inspect drawer.**

- Opens from the right edge inside the main pane, so a docked context bar stays visible. Non-modal: the dashboard stays usable. Width is resizable, with sizes from shell tokens.
- Focus moves into the drawer when it opens and back to the menu button when it closes; Esc closes it.
- Four tabs:
  - **Data:** the `DataFrame` as a table, with CSV and JSON download.
  - **Query:** each query's datasource, spec, resolved time range, and request and response.
  - **JSON:** the widget's JSON and the `DataFrame` JSON.
  - **Stats:** duration, row count, whether it came from cache, when it was fetched.

### 4. Layout

Layout is separate from widgets, as in Perses and Grafana's schema v2. The dashboard body is an ordered list of blocks:

```text
Block = { kind: 'grid', id, layouts: { lg, md?, sm? } }
      | { kind: 'row',  id, title, collapsed, time?, refresh?, variables?, grid: { layouts } }
      | { kind: 'tabs', id, tabs: { id, title, time?, refresh?, variables?, body: (grid | row)[] }[] }
Item  = { i: widgetId, x, y, w, h }
```

- Tabs may contain rows; nothing nests deeper. Rows come first, tabs after.
- Every grid is its own react-grid-layout instance, stacked vertically, so no grid is nested inside another. Dragging works within one grid; moving to another section uses the menu's "Move to…", which is also the WCAG alternative to dragging. Cross-section drag is left out: Kibana had to build its own layout engine for it.
- Collapsed rows and never-opened tabs don't mount their widgets, as in Kibana. A visited tab stays inside `Activity`, so it keeps its state without refetching.
- Rows and tabs are the section level of the scope chain (§1).
- The `container` widget type, including its nested sub-dashboard grid, is dropped.
- An empty dashboard shows "Add widget" and "Start from a template".

**Document versions.** Optional widget fields (`description`, `time`, `syncGroup`) are added to v1; old documents still parse. Replacing `layouts` with `body` is v2, and its migration wraps a v1 document's layouts in one `grid` block. This is the first real migration.

### 5. Variables and filters

- Definitions live in the document, values in the URL (`?var-region=eu`). Scope is the dashboard or a section (§1).
- Types: custom list, query (values from a datasource), text, interval, and datasource (switch between configured connections of one type). Multi-select and "All" are supported.
- A variable's query can use another variable. Variables are evaluated in dependency order, and a cycle is rejected.
- SQL datasources get variables as bound parameters, never pasted into the query text. ClickHouse's HTTP interface supports this with `{name:Type}` placeholders and `param_<name>` values.
- The filter bar sits in the page header's control bar, next to the time picker.
- Cross-filtering (click a bar to set a filter) comes later, opt-in per widget.

**Chosen: scope by reference.** A widget is affected by a variable when its query uses it, as in Grafana. Nothing extra is stored; Inspect lists which variables a widget uses.

**Alternative: explicit wiring,** as in Metabase and Superset. Each filter is connected to chosen widgets, and to a field in each.

- Gains: it works for widgets whose queries have no text to reference, such as a visual query builder, and one filter can map to differently named fields in different widgets.
- Costs: more UI, and wiring to maintain whenever a widget is added or copied.
- Switch, or add it next to references, if a visual query builder arrives.

### 6. Data flow

The pipeline is integration → datasource (a configured connection) → query (per widget) → adapter → `DataFrame[]` → transforms → widget.

- **Where a query runs:** each datasource type declares `runsOn`. Built-ins (`local-json`, `mock`, `csv`) run in the browser; integrations that hold secrets run through the backend.
- **Query key:** the widget's resolved inputs: effective time range, variable values and interval. Identical queries share one cache entry.
- **Previous data:** `placeholderData: keepPreviousData` moves from the `QueryClient` defaults to widget queries. A route component isn't remounted when only its params change, so a global default would show one dashboard's data under another's URL.
- **Concurrency:** each datasource caps parallel requests (`maxConcurrency`). Visible widgets fetch first, since tiles mount only near the viewport.
- **Refresh** follows the scope chain and pauses while the browser tab is hidden, as today.
- **Errors grouped by datasource:** when two or more widgets fail on the same datasource, one banner says so ("Datadog unavailable, 12 widgets affected, Retry all") and the tiles show a compact state, following Primer's degraded-experience pattern. A widget with several queries shows what succeeded, with a warning.
- **Stats:** each result keeps its timing, row count and request metadata for Inspect.
- **Large data:** row limits and downsampling in the datasource; Arrow later for ClickHouse.

### 7. Navigation

Using Horizon's levels:

- **Level 0, the navbar:** search, the area picker, the context button, theme and user. The area picker stays; it may become a workspace or tenant switcher.
- **Level 1, the sidebar:** Dashboards, Data sources, Integrations and Settings, plus a Favorites and Recent group.
- **Level 2:** breadcrumbs (Dashboards › Dashboard), from 04.
- App-level tabs for several open dashboards come later, not now.
- Dashboards are organized with tags, search and favorites; folders come later, with permissions.
- Search covers dashboards, widget titles and actions ("Edit dashboard", "Last 24 hours").

### 8. Backend, persistence, integrations

- Persistence stays behind `DashboardRepository`, with versioned documents and migrations.
- The backend (TanStack Start in SPA mode, or a separate API), auth (Better Auth, Clerk or WorkOS) and the phase order are open, to decide later (open decisions 2–4).
- The Integrations foundation keeps its plan ([research](research/integrations.md)). Entries also get `category`, `dependsOn`, `conflicts` and described config fields, from TanStack's add-on manifest. The vocabulary is integration → datasource → query.

## Open decisions

1. **Where the palette and the widget editor live.** The context bar is no longer for tools. Proposal: in edit mode a right-side edit drawer (the same component as Inspect) holds the palette and the selected widget's options (title, description, time override, sync group, display); "Edit queries" opens a main-pane editor with a live preview above the queries, like Grafana's panel editor.
2. **Backend:** TanStack Start in SPA mode or a separate API. Decide later.
3. **Auth:** Better Auth, Clerk or WorkOS. Decide later.
4. **Phase order:** whether the backend and auth move into phase 5, ahead of real datasources in phase 6. Decide later. Real datasources can't ship without auth either way.

## Out of scope

Kiosk mode. Later, not scheduled: app-level tabs, folders, cross-filtering, a reusable saved-query library, dragging between sections, explicit variable wiring.

## Tasks

### Stage A: viewing (phase 3, before editing)

- [ ] **State layers and `DashboardProvider`.** A store per dashboard id; view state in zod-validated search params; `keepPreviousData` moved to widget queries. Done when switching between two dashboards never shows the first one's data under the second's URL.
- [ ] **Scope resolver.** `useEffectiveTimeRange(widgetId)` over the URL (`from`, `to`, `wt`) and the store, with the precedence in §1. Done when unit tests cover every level of the precedence and shift-over-shift, and one widget's override re-renders only that tile.
- [ ] **Widget header.** Title, info icon, clock, status, and the menu's visibility rules, including focus-within and touch. Done when a keyboard-only user reaches every header control.
- [ ] **Capabilities and the menu.** `capabilities` on `WidgetDefinition`, `timeAware` / `runsOn` / `maxConcurrency` on `DatasourceDefinition`; the View and Share groups. Done when each widget type's story shows the right items.
- [ ] **Full-screen view** (`?view`), with the grid hidden in `Activity`. Done when a hidden tile makes no request.
- [ ] **Inspect drawer** (`?inspect`, `&tab`) with its four tabs. Done when every tab has a story and a test, and focus returns to the menu button on close.
- [ ] **Density.** Tokens, the Settings › Appearance option, `data-density`, the react-grid-layout constant. Done when switching density lays the grid out once and changes no layout units.
- [ ] **Shortcuts** `v`, `i`, `t` and the `?` list. Done when no shortcut fires while typing in a field.

### Stage B: editing (phase 3)

- [ ] **Edit mode** (`?mode=edit`): draft in localStorage, Save, Discard, Undo and Redo, the leave guard.
- [ ] **Saved time override:** in edit mode the time control writes the document.
- [ ] **Move to…, Resize…, Duplicate, Remove** in the menu, with live-region announcements; drag and resize following grid rules 5–7.
- [ ] **Widget editor and palette** once open decision 1 is settled.
- [ ] **Browser tests** for drag, undo and "edit, undo, export, import identical" (Storybook's Vitest addon or Playwright).

### Stage C: layout, variables, data (phase 4)

- [ ] **Document v2:** `body` blocks and the v1 → v2 migration. Done when every v1 fixture loads unchanged.
- [ ] **Rows,** collapsed ones not mounted, with section scopes; then **tabs**.
- [ ] **Hover sync groups** with the timestamp `syncMethod`. Done when the measurement on `/dashboards/perf` is in grid-and-charts.md.
- [ ] **Variables** by reference, with dependencies, bound parameters and the filter bar.
- [ ] **Grouped datasource errors** and **per-datasource concurrency.**

## Decisions

- **Sep 29: scopes that inherit** (dashboard → section → widget), with the precedence in §1.
- **Sep 29: anyone can change a widget's time;** it stays in the URL until someone saves it in edit mode.
- **Sep 29: the widget header** has a title always, an info icon for the description, a clock for time overrides, and a menu shown on hover.
- **Sep 29: hover sync** links chosen charts through named groups.
- **Sep 29: spacing comes from tokens; density is a personal setting,** with no per-widget spacing.
- **Sep 29: the context bar is for help, general information and notifications;** Inspect is a right-side drawer, not a context-bar tab or a bottom drawer.
- **Sep 29: layout blocks** (grid, row, tabs); tabs may contain rows; the `container` widget is dropped; moving between sections uses the menu.
- **Sep 29: variables scope by reference;** explicit wiring is the recorded alternative.
- **Sep 29: queries stay embedded in widgets;** cross-filtering comes later.
- **Sep 29: navigation:** Favorites and Recent in the sidebar, tags now and folders later, app-level tabs in the future; the navbar area picker stays.
- **Sep 29: kiosk mode is out of scope.** Backend, auth and phase order are decided later.

## Verification

- Reload, back/forward and a shared link keep the dashboard range, widget overrides, variable values and mode.
- A keyboard-only run reaches every widget action: view, inspect, time, and in edit mode move, resize, duplicate and remove.
- A hidden tile (full screen, collapsed row, unvisited tab) makes no request.
- Every v1 dashboard fixture loads through the v2 migration and renders the same.

Sources: [Grafana dynamic dashboards](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/create-dynamic-dashboard/), [Grafana query options](https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/), [Grafana panel inspector](https://grafana.com/docs/grafana/latest/panels-visualizations/panel-inspector/), [Grafana Scenes](https://grafana.com/developers/scenes/core-concepts), [Kibana collapsible sections](https://www.elastic.co/search-labs/blog/kibana-dashboard-build-layout), [Kibana time badge](https://github.com/elastic/kibana/issues/178279), [Perses dashboard spec](https://perses.dev/perses/docs/api/dashboard/), [Metabase dashboards](https://www.metabase.com/docs/latest/dashboards/introduction), [Superset native filters](https://deepwiki.com/apache/superset/3.4-native-filters), [Horizon navigation](https://horizon.servicenow.com/workspace/patterns/navigation/navigation-pattern), [Primer degraded experiences](https://primer.style/product/ui-patterns/degraded-experiences/), [Atlassian drag-and-drop accessibility](https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines), [Recharts synchronized charts](https://recharts.github.io/en-US/examples/SynchronizedAreaChart/), [React Activity](https://react.dev/reference/react/Activity), [ClickHouse query parameters](https://clickhouse.com/docs/interfaces/http#cli-queries-with-parameters), [WCAG 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), [WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).
