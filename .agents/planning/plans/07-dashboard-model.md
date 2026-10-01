# 07 Dashboard model

Status: open · Stages 1–2 built (Sep 30); their browser acceptance runs as [08](08-structure-cleanup.md) step 2, the drag and resize measurement after 08 · Phase 3: stages 1–3; phase 4: stage 4 · Order: stages 1 and 2 (the edit MVP), then 08, then stage 3, before 06 Sentry and the Integrations foundation · Depends on: 05 (done). Stage 4's integration datasources need the Integrations foundation. · Reference: [dashboard.md](../../../docs/dashboard/dashboard.md), [grid-and-charts.md](../../../docs/dashboard/grid-and-charts.md)

## Goal

Decide how a dashboard works for the people who view it and the people who edit it: where each kind of state lives, how time range, refresh and variables pass from the dashboard down to one widget, what a widget shows and offers, which modes exist, how layout, variables and data flow work, and where dashboards sit in the navigation. The design was settled step by step on Sep 29 and revised on Sep 30 after a review; this file is the handoff for building it.

## Design

### 1. State and scopes

**Layers.** Each kind of state has one home:

| Layer        | What's in it                                                                                                                            | Where                                                                          | Why                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------- |
| Document     | Widgets, layout blocks, saved overrides, variable definitions, defaults                                                                 | Dashboard store (zustand + immer + zundo), saved through `dashboardApi` (08)   | Edited, undone, saved                 |
| View state   | Dashboard time range, refresh and time zone, variable values, viewers' widget overrides, the open tab of each tabs block, the mode (§3) | URL search params, validated with zod                                          | Shareable, back/forward               |
| UI state     | Selection, the hovered widget (for hover sync), open menus, rows opened or closed this session                                          | Component state or a small store                                               | Not shared, not undone                |
| Server state | Query results, one entry per datasource query                                                                                           | TanStack Query, keyed by the datasource, its spec and the context it uses (§6) | Cache and refetch                     |
| Static       | Widget, datasource and integration registries                                                                                           | Context, built once in `app/`                                                  | Never changes at runtime              |
| Personal     | Density (§2), time zone preference                                                                                                      | The persisted settings store, next to theme and reduced motion                 | Follows the viewer, not the dashboard |

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

**Time zone.** Relative ranges such as `now/d` need one. Precedence: the URL (`tz`), the dashboard's saved time zone, the viewer's personal setting, the browser's. It is part of the query context (§6).

**One `now` per refresh.** The dashboard takes one `now` when the range changes or a refresh fires, and every widget resolves its range against it, so all widgets cover the same window and Inspect shows the exact times.

**URL.**

```text
?from=now-24h&to=now&refresh=1m&tz=Europe/Budapest    dashboard range, refresh, time zone
&var-region=eu                                         variable values (§5)
&wt={ <widgetId>: override }                           viewers' widget overrides, only where they differ from the saved value
&tabs={ <tabsBlockId>: <tabId> }                       the open tab of each tabs block (§4)
&view=<id> | &inspect=<id>&inspectTab=data | &mode=edit[&widget=<id>]    modes (§3)
```

- Defaults are removed with the router's `stripSearchParams`, so a plain dashboard link stays short.
- Arrays and objects use the router's default JSON encoding. Grafana-style repeated keys (`var-x=a&var-x=b`) would need a custom serializer; not now.

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

**Registry and document additions.** Datasource additions are in §6.

```ts
WidgetPlugin { …, capabilities: { time: boolean; inspect: boolean; export: ('csv' | 'json')[]; hoverSync: boolean } }
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

| Mode                   | URL                          | Behaviour                                                                                                                                                                                                      |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| View                   | none                         | The default. Viewers' time and variable changes go in the URL (§1).                                                                                                                                            |
| One widget full screen | `?view=<id>`                 | The widget fills the main pane; the chrome stays. The grid stays mounted inside `Activity` to keep its state, and the hidden tiles' `dataActive` is false, so they make no requests (§6). Esc or Back returns. |
| Inspect                | `?inspect=<id>&inspectTab=…` | A right-side drawer (below). Works together with full screen: the widget large, its data beside it.                                                                                                            |
| Edit                   | `?mode=edit`                 | Save, Discard, Undo and Redo in the page header's control bar (Editing, below).                                                                                                                                |
| Edit one widget        | `?mode=edit&widget=<id>`     | Where the options and the query editor live is open decision 1.                                                                                                                                                |

**The context bar is for help, general information and notifications,** not for every tool. Working tools such as Inspect open in right-side drawers instead.

**Inspect drawer.**

- Opens from the right edge inside the main pane, so a docked context bar stays visible. Non-modal: the dashboard stays usable. Width is resizable, with sizes from shell tokens.
- Focus moves into the drawer when it opens and back to the menu button when it closes; Esc closes it.
- Four tabs, each per query when a widget has several:
  - **Data:** the frames as a table, with CSV and JSON download.
  - **Query:** the datasource, spec, resolved time range, time zone, variables used, and request and response.
  - **JSON:** the widget's JSON and the frames' JSON.
  - **Stats:** duration, row count, whether it came from cache, when it was fetched.

**Editing.**

- **Undo steps follow user actions,** not store updates. zundo keeps up to 50 steps of the document, without the time range and selection.

  | Action                                    | Undo steps                              |
  | ----------------------------------------- | --------------------------------------- |
  | Drag, resize                              | One, committed on stop (grid rules 5–7) |
  | Move to…, Resize…, Duplicate, Remove, Add | One each                                |
  | Typing in a title, description or option  | One per field, committed on blur        |
  | Applying a query change                   | One per apply                           |

  Text fields keep their own state and write the document on blur. Anything else that needs grouping uses zundo's `pause()` and `resume()`.

- **Save** makes the current document the new baseline, and `dirty` becomes false. Undo after Save is allowed and makes the dashboard dirty again.
- **Discard** restores the baseline and clears the undo history and the draft.
- **Draft:** kept in localStorage per dashboard id, so a reload stays in edit mode with the changes. Leaving with unsaved changes asks first.
- **Adding a widget** places it at the end of the chosen grid. Dragging from the palette (react-grid-layout's `dropConfig`) comes later.
- **Reading order:** after each commit, tiles render in the reading order of the `lg` layout (by row, then column), so keyboard and screen-reader order follow what's on screen. Export writes items in the same order. The order isn't stored separately.

### 4. Layout

Layout is separate from widgets, as in Perses and Grafana's schema v2. The dashboard body is an ordered list of blocks:

```text
Block = { kind: 'grid', id, layouts: { lg, md?, sm? } }
      | { kind: 'row',  id, title, defaultCollapsed?, time?, refresh?, variables?, grid: { layouts } }
      | { kind: 'tabs', id, tabs: { id, title, time?, refresh?, variables?, body: (grid | row)[] }[] }
Item  = { i: widgetId, x, y, w, h }
```

- Tabs may contain rows; nothing nests deeper. Rows come first, tabs after.
- Every grid is its own react-grid-layout instance, stacked vertically, so no grid is nested inside another. Dragging works within one grid; moving to another section uses the menu's "Move to…", which is also the WCAG alternative to dragging. Cross-section drag is left out: Kibana had to build its own layout engine for it.
- **Rows:** `defaultCollapsed` is saved with the dashboard. Opening or closing a row is UI state for the session and doesn't make the dashboard dirty.
- **Tabs:** the open tab is in the URL (`tabs`); the first tab is the default.
- Collapsed rows and never-opened tabs don't mount their widgets, as in Kibana. A visited tab stays inside `Activity` to keep its state, with `dataActive` false while hidden.
- Rows and tabs are the section level of the scope chain (§1).
- The `container` widget type, including its nested sub-dashboard grid, is dropped.
- An empty dashboard shows "Add widget" and "Start from a template".

**Checks after parsing.** zod checks each object's shape. A domain check then rejects a document where a layout item points at a missing widget, a widget appears twice in the body, a block or tab id repeats, or a widget isn't placed anywhere, with an error that names the id.

**Document versions.** `version` stays the schema version. Optional widget fields (`description`, `time`, `syncGroup`) are added to v1; old documents still parse. Replacing `layouts` with `body` is v2, and its migration wraps a v1 document's layouts in one `grid` block; this is the first real migration. Phase 5 adds a separate `revision` field for the stored copy, used for conflict checks; it is never folded into `version`.

### 5. Variables and filters

- Definitions live in the document, values in the URL (`?var-region=eu`). Scope is the dashboard or a section (§1).
- Types: custom list, query (values from a datasource), text, interval, and datasource (switch between configured connections of one type). Multi-select and "All" are supported.
- A variable's query can use another variable. Variables are evaluated in dependency order, and a cycle is rejected.
- **Which queries use a variable:** each datasource type implements `getVariableRefs(spec)`; the dashboard never searches query text itself. The result drives evaluation order, cycle detection, which widgets a change affects, Inspect's variable list, and the query key.
- **Values** are bound parameters, never pasted into query text. ClickHouse's HTTP interface supports this with `{name:Type}` placeholders and `param_<name>` values.
- **Identifiers** (a table, a column, a function) can't be ordinary parameters in most SQL databases. Where the datasource supports identifier parameters (ClickHouse's `{name:Identifier}`) it uses them; otherwise the variable offers an allow-listed set of choices. Each datasource declares which (`identifierParams`).
- The filter bar sits in the page header's control bar, next to the time picker.
- **Variables and filters are separate.** A variable is an input the author defines. A filter is a constraint a viewer adds, kept in view state. A cross-filter is a filter created by clicking a chart. Filters and cross-filtering come later and won't be modeled as variables; Grafana 13.1 also keeps "Filter and Group by" apart from its variable types.

**Chosen: scope by reference.** A widget is affected by a variable when its query uses it, as in Grafana. Nothing extra is stored; Inspect lists which variables a widget uses.

**Alternative: explicit wiring,** as in Metabase and Superset. Each filter is connected to chosen widgets, and to a field in each.

- Gains: it works for widgets whose queries have no text to reference, such as a visual query builder, and one filter can map to differently named fields in different widgets.
- Costs: more UI, and wiring to maintain whenever a widget is added or copied.
- Switch, or add it next to references, if a visual query builder arrives.

### 6. Data flow

The pipeline is integration → datasource (a configured connection) → query → adapter → `DataFrame[]` → transforms → widget.

```ts
QueryContext {
  range: { from: number; to: number; raw: { from: string; to: string } }   // epoch ms, resolved against the shared `now`
  timezone: string
  variables: ResolvedVariables
  resolution: { maxDataPoints: number; intervalMs: number; minIntervalMs?: number }
}
DatasourcePlugin { …,
  query(spec, ctx: QueryContext, signal): Promise<DataFrame[]>
  getVariableRefs(spec): VariableRef[]
  timeAware: boolean; usesResolution: boolean; identifierParams: boolean
  runsOn: 'browser' | 'server'; maxConcurrency: number
}
```

- **Where a query runs:** built-ins (`local-json`, `mock`, `csv`) run in the browser; integrations that hold secrets run through the backend (`runsOn`).
- **One cache entry per datasource query.** The key is the datasource, its spec, and the parts of the context it uses: the raw range and time zone if it's time-aware, the variables `getVariableRefs` returns, and the resolution bucket if `usesResolution`. Identical queries in two widgets share one entry, and each query can fail, retry, be cancelled and be inspected on its own. Queries stay embedded in widgets in the document; only the cache unit changes.
- **`useWidgetData(widgetId)`** runs the widget's queries with `useQueries` and `combine`, applies transforms, and returns the frames, each query's status, and a warning when only some succeeded. `useQueries` doesn't pass previous data to `placeholderData`, so the hook keeps the last complete result itself while new keys load. Widgets never handle raw query results. `keepPreviousData` leaves the `QueryClient` defaults: a route component isn't remounted when only its params change, so a global default would show one dashboard's data under another's URL.
- **Gating:** each tile has `dataActive`, false while it's hidden (another widget full screen, a tab not showing). Its queries pass `enabled: dataActive`, so nothing is fetched or refetched while hidden. `Activity` only keeps hidden UI state; it isn't what stops requests.
- **Resolution** comes from the committed layout: the widget's column span at the current breakpoint times a nominal column width, rounded into a few buckets. It never comes from live pixel width, so panel toggles, window resizes and drags don't refetch. Full screen uses a higher bucket. Only datasources with `usesResolution` include it in the key.
- **Aggregation and drawing are separate.** Datasources aggregate using `intervalMs` (SQL time buckets, a Prometheus step); that is part of what the query means. Reducing points for drawing (LTTB) happens only after transforms, so totals and reducers use the real data.
- **`DataFrame` contract:** every field in a frame has the same length; values may be `null`; time values are epoch milliseconds; field `config` holds unit, display name and labels; `meta` keeps the query id and request stats; nothing in a frame is a class instance (`Date`, `Map`), so frames serialize for Inspect and export. Transforms are pure `DataFrame[] → DataFrame[]`, and nothing datasource-specific leaves the adapter.
- **Concurrency:** each datasource adapter limits parallel requests to `maxConcurrency`; TanStack Query has no limit of its own. Visible widgets fetch first, since tiles mount only near the viewport.
- **Refresh** follows the scope chain, takes a new shared `now`, and pauses while the browser tab is hidden.
- **Errors:** a failed query shows inline in its widget; `QueryCache.onError` reports it once per failed request ([06](06-sentry.md)). When two or more widgets fail on the same datasource, one banner says so ("Datadog unavailable, 12 widgets affected, Retry all") and the tiles show a compact state, following Primer's degraded-experience pattern.
- **Stats:** each query keeps its timing, row count, cache hit and request metadata for Inspect.
- **Large data:** row limits in the datasource; Arrow later for ClickHouse.

### 7. Navigation

Using Horizon's levels:

- **Level 0, the navbar:** search, the area picker, the context button, theme and user. The area picker stays; it may become a workspace or tenant switcher.
- **Level 1, the sidebar:** Dashboards, Data sources, Integrations and Settings, plus a Favorites and Recent group.
- **Level 2:** breadcrumbs (Dashboards › Dashboard), from 04.
- App-level tabs for several open dashboards come later, not now.
- Dashboards are organized with tags, search and favorites; folders come later, with permissions.
- Search covers dashboards, widget titles and actions ("Edit dashboard", "Last 24 hours").

### 8. Backend, persistence, integrations

- Persistence goes through one module, `dashboardApi` (list, get, save), with versioned documents (`schemaVersion`) and migrations ([08](08-structure-cleanup.md)). An interface arrives with a second implementation.
- The backend (TanStack Start in SPA mode, or a separate API), auth (Better Auth, Clerk or WorkOS) and the phase order are open, to decide later (open decisions 2–4).
- The Integrations foundation follows its [research](../research/integrations.md): lightweight manifests with a `category`, and config, runtime and setup code in chunks loaded only for enabled entries. `dependsOn` and `conflicts` wait until an integration needs them. The vocabulary is integration → datasource → query.

## Open decisions

1. **Where the palette and the widget editor live.** Stage 2 uses the proposed right-side non-modal drawer inside the main pane for the palette, title, description and display options; "Edit queries" opens a main-pane editor with a live preview. Display options and queries use schema-validated JSON fields for this MVP. Time overrides and sync groups stay with their later stages. Sharing the drawer with Inspect remains for stage 3.
2. **Backend:** TanStack Start in SPA mode or a separate API. Decide later.
3. **Auth:** Better Auth, Clerk or WorkOS. Decide later.
4. **Phase order:** whether the backend and auth move into phase 5, ahead of real datasources in phase 6. Decide later. Real datasources can't ship without auth either way.

## Out of scope

Kiosk mode. Later, not scheduled: app-level tabs, folders, filters and cross-filtering, a reusable saved-query library, dragging between sections, dragging from the palette, explicit variable wiring.

## Tasks

Build order: stage 1, stage 2 (together the edit MVP), stage 3; then 06 Sentry and the Integrations foundation; then stage 4.

Checkpoint Sep 30: completed implementation parts are ticked below. Parent tasks remain open where their browser acceptance criteria have not yet been verified.

### Stage 1: foundation (phase 3)

- [ ] **State layers and `DashboardProvider`.** A store per dashboard id holding the document, the saved baseline and `dirty`; view state in zod-validated search params with defaults stripped; `keepPreviousData` removed from the `QueryClient` defaults. Done when switching between two dashboards never shows the first one's data under the second's URL.
  - [x] Per-dashboard provider/store, saved baseline, dirty comparison and isolated document selectors implemented; store isolation covered by a passing test.
  - [x] Zod search validation, default view-mode stripping and removal of global previous-data placeholders implemented.
  - [ ] Complete the browser check for dashboard switching during loading.
- [ ] **Widget header and menu.** Title, info icon, status, and the menu's visibility rules (hover, focus inside, edit mode, touch); `capabilities` on `WidgetPlugin` (08 removed the unused ones), and the menu built from them. Done when a keyboard-only user reaches every header control and each widget type's story shows the right items.
  - [x] Header, description tooltip, fetching/error status, visibility rules and registry capabilities implemented; grid stories include all three built-in widget types and edit mode.
  - [ ] Finish keyboard/focus acceptance for every header control.

### Stage 2: edit MVP (phase 3)

- [ ] **Edit mode** (`?mode=edit`): Save, Discard, Undo and Redo in the page header, the draft in localStorage, the leave guard, Save and Discard as in §3. Done when a reload keeps the draft, Undo after Save makes the dashboard dirty, and Discard restores the saved document with an empty history.
  - [x] Controls, per-dashboard draft storage/recovery, navigation blocker and native unload guard implemented.
  - [x] Save retains undo; Undo after Save becomes dirty; Discard restores the saved baseline and clears history/draft. Passing store tests cover these cases, pending-save edits and failed saves. Browser checks reached Save/Undo, draft reload and Discard successfully.
  - [ ] Finish the complete leave-guard and back/forward browser run.
- [ ] **Drag and resize** following grid rules 5–7: the header as handle, the `se` handle, `constraints` for minimum sizes, commit on stop and never in `onLayoutChange`; the drag placeholder and handles styled with tokens (react-grid-layout's defaults are red and black). Done when one drag and one resize each add exactly one undo step.
  - [x] RGL v2 handles, plugin minimum sizes, token styling and stop-only commits implemented; store tests cover one history step per committed layout action.
  - [ ] Verify actual pointer drag and resize each need exactly one Undo in the browser.
- [ ] **Menu actions:** Move to…, Resize…, Duplicate and Remove, with live-region announcements and focus back on the menu button. Done when every action works without a pointer and adds one undo step.
  - [x] Actions, placement dialogs, live region and focus-return handlers implemented; duplicate/remove history covered by store tests.
  - [ ] Finish keyboard-only action/focus verification and check announcement wording.
- [ ] **Add widget** at the end of the chosen grid, and reading order from the `lg` layout after each commit. Done when keyboard order follows the layout after a drag, and export writes items in reading order.
  - [x] Palette adds at the bottom; tile order and JSON export derive from the `lg` reading order. Store tests cover placement and export order.
  - [ ] Verify DOM/keyboard order after an actual browser drag.
- [ ] **Widget editor and palette** once open decision 1 is settled; text fields commit on blur, one undo step per field.
  - [x] Main-pane drawer, palette, title/description/display editing and query editor with preview/Apply implemented; editor states have stories.
  - [x] Field no-op handling and schema validation implemented. Browser investigation found and fixed disabled Save during typing and an empty-description undo step.
  - [ ] Finish acceptance for field blur grouping, query Apply/Undo and the latest non-modal drawer focus changes.
- [-] **Browser tests** for drag, resize, undo, and "edit, undo, export, import identical". Moved to [08](08-structure-cleanup.md) step 2 (Sep 30): Storybook's Vitest addon runs the stories in Chromium, and play functions port the flows of the Playwright CLI script, which 08 deletes. The acceptance items above that those play functions prove get ticked when they pass.
  - Sep 30, passing in Chromium: blur commits one undo step; Save, then Undo is dirty, then Redo is clean; Discard restores the saved document with an empty history; a draft is restored on load in edit mode; Duplicate, Remove and Add each undo in one step, and Add places the widget last; Move and Resize dialogs return focus to the menu button and announce the change; export, edit, undo, export and import give identical JSON; the leave guard keeps the page on "Keep editing".
  - Still manual: pointer drag and resize (one undo each), keyboard-only runs, back and forward, switching dashboards while one loads, and query Apply and Undo.
- [ ] **Measure** drag and resize on `/dashboards/perf` in a production build: chart resizes per interaction and long tasks. Done when the numbers are in grid-and-charts.md. Runs after 08; `scripts/dashboard-perf.browser.js` was a draft and is deleted in 08, so the measurement is a manual Performance trace or a play function.

### Stage 3: viewing (phase 3)

- [ ] **One cache entry per datasource query.** Datasources return `DataFrame[]` under the contract in §6; `useWidgetData(widgetId)`; `dataActive` gating. Done when two widgets with the same query make one request, one failed query leaves the widget's other results showing, and a hidden widget makes no request.
- [ ] **Scope resolver** with time zone and the shared `now`: `useEffectiveTimeRange(widgetId)` over the URL (`from`, `to`, `tz`, `wt`) and the store, with the precedence in §1. Done when unit tests cover every precedence level, shift over shift, and `now/d` in two time zones, and one widget's override re-renders only that tile.
- [ ] **Time range per widget:** the menu's Time range…, the clock, and the saved override in edit mode (one undo step).
- [ ] **Full-screen view** (`?view`). Done when the hidden tiles' `dataActive` is false and no request is made while they're hidden.
- [ ] **Inspect drawer** (`?inspect`, `inspectTab`) with its four tabs, per query. Done when every tab has a story and a test, and focus returns to the menu button on close.
- [ ] **Density.** Tokens, the Settings › Appearance option, `data-density`, the react-grid-layout constant. Done when switching density lays the grid out once and changes no layout units.
- [ ] **Shortcuts** `v`, `i`, `t` and the `?` list. Done when no shortcut fires while typing in a field.

### Stage 4: layout, variables, data (phase 4)

Integration datasources in the datasource manager need the Integrations foundation.

- [ ] **Document v2:** `body` blocks, the v1 → v2 migration, and the domain check after parsing. Done when every v1 fixture loads unchanged and each broken-reference case is rejected with an error naming the id.
- [ ] **Rows** with `defaultCollapsed`, collapsed ones not mounted, and section scopes; then **tabs**, with the open tab in the URL.
- [ ] **Resolution** from the committed layout, in buckets, for datasources with `usesResolution`. Done when a panel toggle refetches nothing and full screen fetches once at the higher bucket.
- [ ] **Hover sync groups** with the timestamp `syncMethod`. Done when the measurement on `/dashboards/perf` is in grid-and-charts.md.
- [ ] **Variables** by reference through `getVariableRefs`, with dependency order, bound parameters, identifier handling per datasource, and the filter bar.
- [ ] **Grouped datasource errors** and **per-datasource concurrency.**

## Decisions

- **Sep 30: 08 before the rest of 07.** After the review, 08's gate fixes and browser tests come first. They close stage 2's acceptance items, and stage 3 is built on the new folder layout.
- **Sep 30: stage 2 editor placement.** Use the proposed drawer inside the main pane for palette/options and a separate main-pane query editor with preview. JSON fields are validated against the installed widget/datasource schemas.
- **Sep 30: local persistence for the edit MVP.** Static JSON remains the initial read source; Save writes a separate browser-local saved document, drafts use a separate per-dashboard key, and Export produces portable JSON. Save does not attempt to overwrite a static public file.

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
- **Sep 30: build order.** The edit MVP (stages 1 and 2) comes first, then viewing (stage 3). 06 Sentry and the Integrations foundation follow; stage 4 is phase 4.
- **Sep 30: one cache entry per datasource query,** combined by `useWidgetData`, which keeps the last complete result while new keys load.
- **Sep 30: the time model has a time zone and one shared `now` per refresh.**
- **Sep 30: `dataActive` gates requests;** `Activity` only keeps hidden UI state.
- **Sep 30: undo steps follow user actions.** Undo after Save is allowed; Discard clears the history and the draft. Adding a widget places it at the end of a grid; palette drag comes later.
- **Sep 30: rows save `defaultCollapsed`, not their current state; the open tab is in the URL.**
- **Sep 30: reading order comes from the `lg` layout,** not a separate list; a domain check after zod rejects broken references.
- **Sep 30: `version` stays the schema version;** phase 5 adds `revision`.
- **Sep 30: resolution comes from the committed layout, in buckets.** Datasources aggregate; only drawing downsamples.
- **Sep 30: variables go through `getVariableRefs`.** Identifiers are parameters only where the datasource supports it, otherwise allow-listed; filters stay separate from variables.

## Verification

### Sep 30 implementation checkpoint

- `pnpm test`: **38 files, 166 tests passed**.
- `pnpm build`: passed with the current implementation.
- `pnpm lint`: **not passing**; remaining errors are unused expressions in the new story/browser scripts and an unbound-method reference in the browser script.
- Full browser acceptance, Storybook runtime verification and drag/resize performance measurements remain pending.

### Sep 30 review of the edit MVP

Checked in the dev server at 1440, 667 and 375 px. Every item is fixed or tracked in [08](08-structure-cleanup.md) or [tasks.md › Edit UI polish](../tasks.md#edit-ui-polish-not-planned-yet).

- **The edit drawer is invisible.** Mantine's `max-height: 100%` on `Drawer.Content` resolves against the 0px-tall sticky `.tools` wrapper, so the palette and widget editor render 0px tall, and clicks land on the tiles underneath. Fixed in 08 step 1.
- **The React Compiler skips 10 components.** `@babel/core` 8 with `babel-plugin-react-compiler` 1.0 silently skips any component with a destructured default (`DashboardProvider`, `ShellProvider`, `ErrorState`, `TimeSeriesChart`, …). Pinning `@babel/core` 7 fixes it (08 step 1). `DashboardView` and the editor forms are also skipped because of `throw` and `?.` inside `try` (08 splits them).
- **One corrupt saved copy breaks `/dashboards`.** `readSaved` throws inside `listDashboards`. Fixed in 08 step 1.
- **Two definitions of "wide".** The edit toolbar checks the viewport width and the grid checks its own width, so at 667 px the toolbar shows but dragging is off. Tracked in Edit UI polish.
- **Accessibility.** The widget menu trigger has no `aria-haspopup` or `aria-expanded` under its Tooltip; the live region doesn't repeat an identical message; the remove toast's Undo undoes whatever came last. Tracked in Edit UI polish.

- Reload, back/forward and a shared link keep the dashboard range, time zone, widget overrides, variable values, open tabs and mode.
- A keyboard-only run reaches every widget action: view, inspect, time, and in edit mode move, resize, duplicate and remove.
- A drag, a resize and each menu action add exactly one undo step; Discard restores the saved document.
- A hidden widget (another one full screen, a tab not showing) makes no request; a collapsed row doesn't mount its widgets.
- Panel toggles and window resizes cause no refetch.
- Every v1 dashboard fixture loads through the v2 migration and renders the same.

Sources: [Grafana dynamic dashboards](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/create-dynamic-dashboard/), [Grafana query options](https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/), [Grafana dashboard URL variables](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/create-dashboard-url-variables/), [Grafana variable types](https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/), [Grafana panel inspector](https://grafana.com/docs/grafana/latest/panels-visualizations/panel-inspector/), [Grafana Scenes](https://grafana.com/developers/scenes/core-concepts), [Kibana collapsible sections](https://www.elastic.co/search-labs/blog/kibana-dashboard-build-layout), [Kibana time badge](https://github.com/elastic/kibana/issues/178279), [Perses dashboard spec](https://perses.dev/perses/docs/api/dashboard/), [Metabase dashboards](https://www.metabase.com/docs/latest/dashboards/introduction), [Superset native filters](https://deepwiki.com/apache/superset/3.4-native-filters), [Horizon navigation](https://horizon.servicenow.com/workspace/patterns/navigation/navigation-pattern), [Primer degraded experiences](https://primer.style/product/ui-patterns/degraded-experiences/), [Atlassian drag-and-drop accessibility](https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines), [Recharts synchronized charts](https://recharts.github.io/en-US/examples/SynchronizedAreaChart/), [React Activity](https://react.dev/reference/react/Activity), [TanStack Query useQueries](https://tanstack.com/query/latest/docs/framework/react/reference/useQueries), [TanStack Router search params](https://tanstack.com/router/latest/docs/framework/react/guide/search-params), [zundo](https://github.com/charkour/zundo), [ClickHouse query parameters](https://clickhouse.com/docs/sql-reference/syntax#defining-and-using-query-parameters), [WCAG 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), [WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).
