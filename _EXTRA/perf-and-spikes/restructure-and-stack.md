# mantine-dashboard-builder: restructure and stack

Oct 29, 2026 · Written for the RHB-CDSS docs (`DOCS-FINAL/mantine-dashboard-builder/`); this copy is on the `review/perf-spikes` branch with the files it measured with · Research for P1 and the stack in the project plan

Why the last two commits feel laggy, what to restructure, which library does which job, and how to keep it measured. This is research with open decisions, not a plan yet. Once the [decisions](#decisions) are made, the restructure becomes a plan in the repo (`.agents/planning/plans/`), and the stack changes go into the project's `plan.md` and `3-resources.md`, the capability catalog and, for the data layer, the roadmap's P3, P4 and P7.

- **Inputs:** the three files in the repo's [`docs/REVIEW/`](https://github.com/deneslee/mantine-dashboard-builder/tree/c7c56e1/docs/REVIEW) (R1 as updated in [c7c56e1](https://github.com/deneslee/mantine-dashboard-builder/commit/c7c56e1)); OpenAI's [Build Web Data Visualization](https://github.com/openai/plugins/tree/main/plugins/build-web-data-visualization) plugin (0.1.21); `main` at [5bd5ced](https://github.com/deneslee/mantine-dashboard-builder/commit/5bd5ced); measurements and three spikes on Oct 29 ([below](#whats-wrong-measured)).
- **R1 covers data and caching;** what it changes is in [Data layer](#data-layer). R2 covers widgets, context and waterfalls, R3 animations and visualization libraries.
- **On this branch:** the measurement scripts, raw results and screenshots in [`perf/`](perf/README.md), and the three spikes as one commit each ([which commit is which](perf/README.md#the-branch)). The numbers below are from Oct 29; the Nov 6 re-run on the branch agrees ([results](perf/README.md#results)).
- **Words:** a _panel_ is a resizable region (the sidebar, the context bar, the side panel next to the grid). The repo still says "pane" (`SplitView`, `Splitter.Pane`); the restructure renames it.

## In short

- **The lag is the new side panel, and it's measured.** `SplitView` slides the Inspect and editor panel by animating the grid's width, with nothing holding the grid still. Each chart lays out up to 7 times per open or close: about 0.4 s of long frames. The context bar lays every chart out twice, because its separator appears 1 px wide in the same commit, just before the shell's lock measures `<main>`.
- **Two CSS lines take most of it away today:** no width animation on the side panel, and a separator that keeps its 1 px. Measured: 0.4 s → 0.07–0.17 s, without the slide. They don't depend on any decision below.
- **Panels: react-resizable-panels 4 is the library to use.** It already does what the shell and the side panel need: fixed-pixel side panels, a collapsed size for the rail, drags that commit on release, keyboard resizing and saved layouts. In a spike with the side panel on it, the panel still slides, and each chart lays out once, after the slide (63–85 ms); a drag lays nothing out until release.
- **Charts: no decision needed yet.** Mantine charts 9.7 has nearly every chart type a dashboard needs. ECharts' advantage is cost: in the same shell its charts showed no long frames in most runs, and after an hour of styling it looks the same ([screenshot](perf/screenshots/charts-side-by-side.png)). Build the renderer layer first (needed either way), add ECharts next to Mantine charts, and pick the dashboard default with both measured.
- **Animation: Motion and View Transitions** (decided Oct 29).
- **Data: R1's split holds.** TanStack Query keeps chart data and dashboard documents, the Zustand store keeps the dashboard being edited, the StorageProvider decides where data is saved, and TanStack DB (1.0 release candidate since Oct 29) takes the records in P4. Two overlaps to avoid: one persistence path, not TanStack DB's own browser storage next to the StorageProvider; and no second filter engine (mingo, @ucast, sift) beside DB's live queries.
- **No foundation changes.** React, Mantine, TanStack, Zustand, react-grid-layout and React Flow stay. Each library you liked gets one job or none ([table](#libraries-one-per-job)).

## What's wrong, measured

**How:** a production build of `main` (5bd5ced) served by `vp preview`; headless Chromium 1600 × 1000, device-pixel ratio 1; `/dashboards/perf` with 9 charts mounted near the viewport. A `ResizeObserver` on every chart counted layouts, a minimal DevTools hook counted React commits, and the browser reported long animation frames (frames over 50 ms). Each interaction was watched for 1.5 s, three runs each; counts are medians, long frames the range over the runs.

| Interaction                       | Chart layouts (9 charts) | Most per chart | First → last (ms)    | React commits | Long frames (ms) |
| --------------------------------- | ------------------------ | -------------- | -------------------- | ------------- | ---------------- |
| Sidebar collapse (`Ctrl+B`)       | 9                        | 1              | 259, after the slide | 11            | 111–135          |
| Sidebar expand                    | 9                        | 1              | 255, after the slide | 10            | 87–98            |
| Context bar open (`Ctrl+.`)       | 18 (18–27)               | 2–3            | 82 → 255             | 19            | 172–270          |
| Context bar close                 | 14                       | 2              | 47 → 229             | 15            | 74–157           |
| Inspect panel open (`SplitView`)  | 59 (50–63)               | 7              | 111 → 586            | 39            | 360–458          |
| Inspect panel close               | 50 (50–59)               | 6              | 57 → 419             | 35            | 364–457          |
| Add widget panel open (edit mode) | 45 (45–59)               | 5              | 107 → 432            | 20            | 353–463          |
| Window 1600 → 1400 px             | 9                        | 1              | 45                   | 4             | 69–78            |

The side panel, today and in the three variants tried:

| Variant                                                                                                                                | Inspect open                 | Inspect close     | Add widget        | Still slides |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------- | ----------------- | ------------ |
| Today                                                                                                                                  | 50–63 layouts, 360–458 ms    | 50–59, 364–457 ms | 45–59, 353–463 ms | Yes          |
| Quick fix: no width animation, separator kept at 1 px ([commit](https://github.com/deneslee/mantine-dashboard-builder/commit/d5578f1)) | 9–18, 91–170 ms              | 9, 72–132 ms      | 9, 74–104 ms      | No           |
| react-resizable-panels 4, freeze around the slide ([spike](../../src/ui/components/Panels/SidePanelSplit.tsx))                         | 9, after the slide, 68–82 ms | 9, 63–71 ms       | 9, 78–85 ms       | Yes          |
| Reduced motion (no slide; what any working freeze costs)                                                                               | 9, 75–88 ms                  | 9, 84–90 ms       | 9, 76–99 ms       | No           |

- **A drag on the react-resizable-panels spike** (20 pointer steps on the separator) laid out no chart until release, then each once, with one 54–63 ms frame.
- **The quick fix also cures the context bar:** 9 layouts after the slide (one run of three still had 18).
- **ECharts spike, same shell and same bugs:** no long frames in 19 of 24 runs, the worst 104 ms; with reduced motion, none in 22 of 24, the worst 58 ms. Page load until 9 charts are drawn: Recharts 1.42–1.53 s with 459–628 ms of long frames, ECharts 1.35–1.52 s with 306–391 ms. Its chart chunk is 176 kB gzipped against 122 kB for today's (line, bar, grid, tooltip and the canvas renderer only).
- Headless Chromium rasterizes in software, so times on a real GPU will differ; the counts won't.

**What the numbers say:**

1. **The side panel is the regression.** `SplitView` ([bd93a5e](https://github.com/deneslee/mantine-dashboard-builder/commit/bd93a5e), on the dashboard since [5bd5ced](https://github.com/deneslee/mantine-dashboard-builder/commit/5bd5ced)) slides the panel with a `flex-basis` transition, and nothing holds the grid while it moves. react-grid-layout and every chart lay out on each frame, and since each layout takes about 100 ms, a 180 ms slide stretches to about half a second. The shell had solved this for the sidebar; the side panel repeats the problem one level down.
2. **The shell's lock leaks by one pixel.** While the context bar is closed, its separator is hidden with `flex-basis: 0`. Opening it shows the separator (1 px) in the same commit, so when [`useMainLock`](https://github.com/deneslee/mantine-dashboard-builder/blob/5bd5ced/src/shell/useMainLock.ts) measures `<main>` it's already 1 px narrower: it pins 1338 px where the content had 1339. The grid's width goes 1291 → 1290, tiles change (420 → 419 px) and every chart lays out mid-slide, then again after it. The sidebar's separator stays 1 px in all its states, which is why the sidebar doesn't leak. The rule that follows: freeze first, then change anything.
3. **Recharts makes each layout expensive.** One layout of 9 charts is one 63–135 ms task. Recharts 3 keeps chart state in an internal Redux store read through `useSyncExternalStore`, so React can't split the work across frames ([grid-and-charts.md](https://github.com/deneslee/mantine-dashboard-builder/blob/5bd5ced/docs/dashboard/grid-and-charts.md#density-switch)). With a working freeze that's still a ~70–100 ms hitch after each slide, growing with the number of charts. ECharts redraws its canvas without React, so the same layout costs almost nothing.
4. **Two systems own each boundary.**
   - Shell: Mantine `Splitter` (sizes, a `flex-basis` transition) plus `useMainLock` (pinning, `getAnimations()`, timers, the window-resize lock, generation counters).
   - Side panel: `Splitter` plus `useElementSize`, which re-renders the split on every width change to decide one thing (Drawer or not), plus a layout-effect sync back into the splitter.
   - Mantine's splitter keeps the drag in React state: `useSplitter` calls `setState` on every animation frame of a drag, so AGENTS.md's rule "drag and resize values stay out of React state" can't be met from outside it.
5. **Also confirmed in the code** (R3 §3–5):
   - `Shell` reads `activeTab` through `useContextBar()`, so switching a context tab re-renders the shell.
   - `WidgetTile` renders the widget's lazy component only after data has arrived, so the chart chunk starts loading after the query: a data → code waterfall.
   - The widget type _is_ the Recharts implementation, so changing the chart library would change documents.

R3 suggested bisecting the Mantine 9.7.3 → 9.7.4 bump first. It isn't needed: the sidebar still behaves as [grid-and-charts.md](https://github.com/deneslee/mantine-dashboard-builder/blob/5bd5ced/docs/dashboard/grid-and-charts.md#the-cost-to-avoid) records (one layout per chart, after the slide), and the new code explains the new lag.

## Quick fixes, before any decision

Two CSS changes, measured above ([commit](https://github.com/deneslee/mantine-dashboard-builder/commit/d5578f1)). They can land today and are replaced by the restructure later.

| File                                           | Change                                              | Effect                                                                                             |
| ---------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `ui/components/SplitView/SplitView.module.css` | Remove the `flex-basis` transition on `.pane`       | The side panel appears without sliding; the grid lays out once instead of on every frame           |
| `shell/Shell.module.css`                       | Drop `flex-basis: 0` from the hidden separator rule | The separator keeps its 1 px while hidden, so `useMainLock` pins the width the content already has |

## The rules

From R3, now backed by the measurements. They go into AGENTS.md and the docs when the plan lands.

- **One owner per moving boundary.** The shell's panels, a page's side panel and the full-screen widget all use one panel system. It owns sizes, drag, keyboard, collapse, the animation and the freeze. Nothing else measures or pins.
- **Freeze first, then change.** Before a panel slides, the content beside it is held at its current width in whole pixels; only then does any size, separator or class that affects layout change. It's released once, when the animation ends. A drag moves a separator preview and commits on release.
- **React holds committed state; the DOM holds frames.** Stores and React state get open, compact, and the width after release. Values that change every frame live in CSS, the Web Animations API or Motion values.
- **Widget = what, renderer = how.** A widget stores options that mean something to the user (form, fields, stacking). A renderer draws them with one library and resizes without React re-rendering its marks.
- **Code and data load together.** When a tile comes within 200 px of the viewport, its renderer's import and its queries start at the same time.
- **No `layout` animations on anything that holds a grid or a chart.** Motion's layout animations measure on every render and scale content with transforms.
- **Performance is checked by tests:** counts fail CI, timings are reported.

## Panels

What the panel system has to do, in the shell now and in pages and the workspace later:

- the shell: a sidebar that's expanded, a 56 px rail or closed; a context bar that's open or closed; both with fixed pixel widths while the main area takes the rest, and both as drawers below `md`
- pages: the grid with a side panel (Inspect, the widget editor); chart | table inside a widget; the planner's columns in rhb-cdss
- later, maybe: open records side by side, tabs dragged into splits, floating or popped-out windows
- for performance: drags that commit on release, and a freeze around animated open and close
- keyboard resizing (the WAI-ARIA window splitter), saved layouts, and styling from the tokens

### The options

| Option                                                 | What it is                                                                                               | Fits                                                                                                                                                                                                                                                                                                                                                                                  | Misses                                                                                                                                                                                | Size (min + gzip) |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **react-resizable-panels 4.15** (MIT, no dependencies) | `Group`, `Panel`, `Separator`, and a 2D `Grid`; the splits behind shadcn/ui's Resizable                  | px, %, rem sizes; `groupResizeBehavior: "preserve-pixel-size"` keeps side panels fixed while the centre flexes; `collapsible` with `collapsedSize` (the 56 px rail); `resizePreviewMode: "separator"` commits drags on release; WAI-ARIA separator with arrows, Home, End, Enter to collapse, F6; `useDefaultLayout` saves layouts; `collapse()`, `expand()` and `resize()` from code | No animation of its own (a CSS transition on `flex-grow` plus the freeze, as in the spike); arrow keys step 5 %, so 8 px and 40 px steps need a small key handler; no tabs or docking | 21 kB             |
| **Mantine `Splitter`** (today)                         | Splits on `useSplitter`                                                                                  | Mantine-native; px or %, collapse, keyboard                                                                                                                                                                                                                                                                                                                                           | The drag lives in React state on every frame; no preview mode; no rail state; the freeze stays ours to write                                                                          | In Mantine        |
| **Mantine AppShell, resizable** (9.7)                  | The app frame's navbar, aside, header and footer with resize handles                                     | Mantine-native; keyboard; double-click reset                                                                                                                                                                                                                                                                                                                                          | The root frame only; `onResize` fires on every pointer move; collapsing animates `<main>`'s padding, so the freeze is still needed; no rail                                           | In Mantine        |
| **allotment 1.20**                                     | VS Code's split view for React                                                                           | Fixed-size side panels through priorities; snap to close                                                                                                                                                                                                                                                                                                                              | No keyboard resizing; resizes live                                                                                                                                                    | 10 kB             |
| **FlexLayout 0.11**                                    | A docking layout: tabsets, border panels, popouts, sublayouts, a JSON model with actions                 | Real docking; keyboard (tabs, splitter arrows), ARIA roles; `realtimeResize={false}` commits splitter drags on release                                                                                                                                                                                                                                                                | Its own tab look to restyle; heavy for the shell; 0.x                                                                                                                                 | 50 kB             |
| **dockview 8.8** (`dockview-react`)                    | A docking layout: tabs, groups, floating groups, popout windows, edge groups; split, grid and pane views | Real docking; keyboard navigation between tabs and groups (opt-in) and screen-reader announcements; serialization                                                                                                                                                                                                                                                                     | Resizes live; no keyboard resizing of its separators found in the docs or the code; its own tab look; heaviest                                                                        | 97 kB             |
| **Our own component**                                  | CSS grid and Pointer Events                                                                              | Exactly what's needed                                                                                                                                                                                                                                                                                                                                                                 | All of it to write, test and keep accessible                                                                                                                                          | –                 |

**Recommended: react-resizable-panels 4, for the shell and for pages.** The spike moved the dashboard's side panel onto it in about 120 lines; the numbers are in the table above. It keeps the slide, lays the grid out once, and drags cost nothing until release. The shell hasn't been tried yet: the rail maps to `collapsedSize="56px"`, and "closed" needs either a second collapsed size or the panel unmounted; step 3 checks that first.

**Docking waits for P5.** If "patients C319 and C305 open side by side" (the project plan's workspace example) turns out to mean real docking (splitting the workspace, dragging tabs into splits, popping windows out), FlexLayout or dockview would own the workspace area only, and the shell stays on react-resizable-panels. P5's plan is record tabs, which need neither.

**Names.** `ui/panels/`: `PanelGroup`, `Panel` and `PanelSeparator` wrap the library's three parts and add the tokens, the freeze and the animation. Today's `shell/Panel.tsx` (the header, body and footer inside the sidebar and the context bar) needs another name then, for example `PanelFrame`. Context-bar content keeps its `*Panel` suffix (`InboxPanel`).

## Charts

**What Mantine charts covers.** `@mantine/charts` 9.7 has area, bar, line, composite, donut, pie, radar, scatter, bubble, radial bar, funnel, gauge, heatmap, sankey, sunburst, treemap, waffle, candlestick, bullet, sparkline and more, all on Recharts 3. Chart types alone don't argue for a second library.

**What ECharts adds.** Cost and scale: it draws on a canvas, so a resize or a theme change never re-renders React components per mark. In the spike, the long frames that Recharts produces on every panel change mostly disappeared. It also handles long series (`sampling: 'lttb'`, large mode), where Recharts slows past about 10k points (the plan's open question). And after an hour of styling from the Mantine variables, it looks the same in both schemes ([screenshot](perf/screenshots/charts-side-by-side.png)).

|                    | Mantine charts (Recharts 3)       | ECharts 6.1                                                                                   |
| ------------------ | --------------------------------- | --------------------------------------------------------------------------------------------- |
| Resize of 9 charts | One 63–135 ms task                | No long frame in most runs                                                                    |
| Long series        | Slows past about 10k points       | Sampling and large mode                                                                       |
| Look               | Mantine's, built in               | The same after token theming (`setTheme()` follows the colour scheme)                         |
| API                | React components                  | An option object behind our renderer                                                          |
| Accessibility      | SVG with Recharts' keyboard layer | A canvas with an `aria` description; Inspect's Data tab and the table widget give the numbers |
| Chunk              | 122 kB gzipped                    | 176 kB gzipped for the same widget                                                            |
| Licence            | MIT                               | Apache-2.0                                                                                    |

**Recommended path: decide at the end of step 5.** The renderer layer is needed whichever wins. Step 4 builds it with today's charts as the `mantine` renderer; step 5 adds the ECharts renderer next to it; then the perf suite and the two side by side on real dashboards decide the default. Mantine charts stays for small charts in pages and forms either way. If you want a lean now: ECharts for dashboards, because a dashboard is where many charts change size at once.

## Data layer

R1 read the data code at e25254d, and its picture of today matches the code (checked Oct 29): Query's defaults (30 s stale time, 5 min garbage collection, no refetch on focus, offline-first, one retry for retryable errors), widget data cached per datasource query (`['ds', datasource, revision, spec, time]`, with time only for time-aware datasources), the editor store with drafts in localStorage, and Save writing the whole document to localStorage.

**What it recommends, and what holds:**

| Data                                                                             | Owner                       |
| -------------------------------------------------------------------------------- | --------------------------- |
| Chart and table query results (`DataFrame`s)                                     | TanStack Query, as today    |
| Dashboard documents, as fetched                                                  | TanStack Query              |
| The dashboard being edited, its draft and undo                                   | The Zustand store, as today |
| Records: patients, exercises, plans, assessments, schemas, collections, bindings | TanStack DB (P4)            |
| Where durable data lives: this browser, files, Convex                            | The StorageProvider (P3)    |
| Navigable and shareable state                                                    | TanStack Router             |

- **Chart data stays out of TanStack DB.** A time window is a subset, and a query collection in its default (eager) mode treats each result as the collection's complete state, deleting what's missing. Nothing would be gained.
- **The dashboard editor stays out of it too.** Drafts, undo and Save are a document editor's job; DB's manual transactions could hold a draft, but undo would still be ours.

**What has changed or is missing since R1:**

1. **TanStack DB reached 1.0.0-rc.1 on Oct 29** (0.15.2 a week earlier). The roadmap's "still pre-1.0" is out of date, so the P4 spike can become an adoption check: TanStack DB for records unless one of these fails.
   - A patients collection on the browser provider survives a reload.
   - A live query with a join (a patient with assessments) updates when either side changes.
   - An optimistic edit rolls back when the save fails.
   - The table widget reads a live query with search, filters, sorting and paging.
   - The REHAROB scores, stored as text, sort as numbers. DB compares values as stored, so this may need the normalised fields rhb-cdss plans for R3.
   - Convex works as the source. It has its own live client, so check whether a query collection over it is enough.
2. **One persistence path.** TanStack DB ships its own IndexedDB, localStorage and SQLite (wa-sqlite) collections. Using them for records next to the StorageProvider would give two ways to save, and "Where to save", "Copy to…" and export would have to cover both. Keep the StorageProvider as the only one and build the DB collections on it: they sync from `list` and write through `save` and `remove`. The browser provider then needs only a key-value store: idb-keyval (0.5 kB gzipped) rather than Dexie (33 kB), whose indexes and `liveQuery` repeat what DB does.
3. **One filter engine.** P7 planned a helper to run `ListQuery` filters in the browser: mingo, @ucast or sift. DB's live queries already filter, sort and page in the browser, so those three drop out; react-querybuilder stays an option only for its filter-building UI.
4. **`ListQuery` is DB's subset request.** In on-demand mode, DB hands the loader `where`, `orderBy`, `limit` and `offset` (`ctx.meta.loadSubsetOptions`, with `extractSimpleComparisons` for AND-ed comparisons). Design P3's `ListQuery` as the provider-side form of exactly that, so every provider answers DB's requests directly.
5. **Search stays its own capability.** DB has `like` and `ilike`, not typo-tolerant search; the in-browser index (Orama, MiniSearch and the others) is still decided in P4.
6. **Size:** the core with its React bindings is about 84 kB gzipped. It loads with record pages, not with dashboards.

**A small fix now, in P1.** The cache update after Save lives in a component: `EditToolbar`'s mutation calls `setQueryData` and invalidates the list. The planned "Done → Save" would have to repeat it. Move it into one `saveDashboard` mutation in `features/dashboards/data/`, which P3 then points at the StorageProvider.

## The target structure

```text
ui/panels/               one panel system, on react-resizable-panels
  PanelGroup             tokens; the freeze; Motion for open, compact and close
  Panel                  px or %; open | compact | closed; a Drawer when narrow
  PanelSeparator         preview drag, commit on release; 8 px and 40 px key steps

shell/Shell              Sidebar | Main | ContextBar on PanelGroup
shell store and hooks    layout (modes, open, widths) apart from content (active tab, drawers)

features/dashboards      DashboardPage: grid | side panel on PanelGroup

plugins/
  WidgetPlugin           what: options schema, sizes, capabilities, renderer family
  RendererPlugin         how: id, family, load(), capabilities
  renderers/mantine      @mantine/charts (Recharts): today's TimeSeriesChart
  renderers/echarts      ECharts 6, a lazy chunk

grid/WidgetTile          near the viewport → renderer.load() and the queries together

perf/                    Playwright checks: shell, panels, grid, loading, renderers
```

**What goes away:** `useMainLock` and its test; the `Splitter` code in `Shell.tsx`; `SplitView` (`SplitViewRoot`, its `useElementSize` and its layout-effect sync). The narrow check becomes a container query, or a threshold that sets state only when crossed. The window-resize lock goes once dashboards draw on canvas; until then the freeze keeps a debounced version.

### Who owns what

| Owner                                               | Holds                                                                    | Never holds                            |
| --------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------- |
| URL (TanStack Router)                               | Shareable view state: range, mode, `inspect`, `view`                     | Panel widths, animation state          |
| TanStack Query                                      | Requests, the cache, `DataFrame`s                                        | Editor state                           |
| Dashboard store                                     | The document being edited, undo                                          | Fetched data                           |
| Shell store                                         | Committed layout: modes, open, widths                                    | Sizes during a drag or a slide         |
| TanStack DB (P4)                                    | Record collections, live queries over them, optimistic edits             | Chart data; the dashboard being edited |
| StorageProvider (P3)                                | Where durable data lives: this browser, files, Convex; export and import | Anything only on screen                |
| The panel system                                    | Sizes during a drag or a slide; the freeze                               | Anything saved                         |
| Widget                                              | What to show                                                             | A chart library's option object        |
| Renderer                                            | Drawing, its own resize, hit testing                                     | App state, saving                      |
| Motion, View Transitions                            | DOM and SVG transitions; route and tab changes                           | Data; chart layout                     |
| The 3D render loop (React Three Fiber's `useFrame`) | 3D frames                                                                | React state per frame                  |

### How a panel opens

```text
1 freeze     the content beside it: width = its width now, in whole px     before any size changes
2 change     store: contextBar.isOpen = true → the panel's size changes   one React commit
3 animate    the panel 0 → 360 px, 180 ms, the token easing               nothing lays out beside it
             (reduced motion: 0 ms)
4 release    when the animation ends: unfreeze → one layout → each chart resizes once
5 interrupt  toggling again mid-slide animates from the current width; still one release
```

A drag is the same with the pointer: the separator's preview follows the pointer, nothing else moves, and the size commits on release. Keyboard steps commit right away, one layout each. The spike does steps 1–4 with a CSS transition on `flex-grow`; with Motion chosen, step 3 can run through Motion instead.

## The visualization seam

R3's seam, sized to what the builder needs now. Today's `chart` widget is the first user; the body map, big graphs and 3D use the same contract later.

```ts
// What: lives in the dashboard document; no library options
export interface WidgetPlugin<Options> {
  type: string; // 'chart', 'table', 'kpi'
  name: string;
  optionsSchema: z.ZodType<Options>; // form, fields, stacking: meaning, not a library's option object
  family?: RendererFamily; // which renderers can draw it
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  isTimeAware: boolean;
  skeleton: ReactNode;
}

// How: one per library, loaded only when used
export type RendererFamily = 'chart' | 'graph' | 'body2d' | 'body3d';

export interface RendererPlugin<Spec = unknown> {
  id: string; // 'mantine', 'echarts', 'd3-svg', 'sigma', 'three'
  family: RendererFamily;
  load(): Promise<{ View: ComponentType<RendererProps<Spec>> }>; // import() today; loadRemote() if ever
  capabilities: { canvas?: boolean; svg?: boolean; webgl?: boolean; exportImage?: boolean };
}

export interface RendererProps<Spec> {
  frames: DataFrame[];
  spec: Spec;
  timeZone: string;
  theme: ChartTheme; // from the semantic tokens; follows the colour scheme
  isReducedMotion: boolean;
}
```

- **Stored:** `{ "type": "chart", "options": { "form": "line", "x": "time", "y": ["value"], "renderer": "auto" } }`. `auto` means the app's default for the family. A widget names a renderer only when it needs something just that renderer does, and that need becomes a widget option with a capability check, never a library field. Today's `form` option migrates as is.
- **Theme:** one `ChartTheme` built from the `--app-*` tokens. Mantine charts keeps using the Mantine theme; ECharts gets the same values through `setTheme()`, new in ECharts 6, which also switches dark mode without re-creating the chart.
- **Loading:** `WidgetTile` calls `load()` when the tile comes near the viewport, next to its queries, which ends the waterfall. A hover over a renderer picker can preload the same way.
- **Module federation:** not now. `load()` is where it would go (`loadRemote()`), so callers won't change. React and Mantine would have to be shared singletons, and remote code in a clinical app is a trust question before it's a bundling one.
- **One contract test per renderer:** it mounts, reports ready, resizes once per size change, follows a theme change, honours reduced motion, reports a selection, and unmounts without leaving observers or animation frames. WebGL renderers also handle context loss and stop their loop when hidden.

## Libraries: one per job

react-grid-layout and React Flow keep their own drag inside their surfaces. Each other job gets one library, and the "instead of" column is the overlap this avoids. Versions and licences from npm on Oct 29, 2026; sizes are minified and gzipped, measured with esbuild.

| Job                                                                                 | Use                                                                                                                                                                                                                                | Status                               | Instead of                                                                   | Why                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Components and small transitions                                                    | Mantine 9.7 (`Transition`, `Collapse`) and CSS                                                                                                                                                                                     | Fixed                                | –                                                                            | Already there                                                                                                                                                                                                                                    |
| App motion: panels, enter and exit, list and tab layout changes, number tweens, SVG | Motion 14.8 (MIT): `motion/react` with `LazyMotion` and `m` (5 kB first; by Motion's docs, the `domAnimation` features add 24 kB and `domMax` 38 kB with layout and drag); `motion/mini`'s `animate()` (3 kB) for the panel system | Decided (Oct 29)                     | GSAP, react-spring, AutoAnimate                                              | React-first, and Motion values change without re-renders. GSAP's no-charge licence forbids use in "tools that allow users to build visual animations without code" and isn't open source; react-spring and AutoAnimate do the same job as Motion |
| Route, page and tab changes                                                         | React 19.3 `<ViewTransition>` (stable since Sep 9, 2026) and CSS                                                                                                                                                                   | Decided (Oct 29)                     | Motion for these                                                             | Native, nothing to bundle. It animates snapshots, so it's not for drags or live resizing                                                                                                                                                         |
| Grid drag and resize                                                                | react-grid-layout 2.2                                                                                                                                                                                                              | Fixed                                | –                                                                            | –                                                                                                                                                                                                                                                |
| Node canvas                                                                         | React Flow 12.12 (`@xyflow/react`)                                                                                                                                                                                                 | Default                              | GoJS, JointJS                                                                | –                                                                                                                                                                                                                                                |
| Panels: splits, the shell's sidebar and context bar, side panels                    | react-resizable-panels 4.15 (MIT), 21 kB                                                                                                                                                                                           | Proposed                             | Mantine `Splitter` and AppShell's resizing, allotment, our own component     | Covered [above](#panels); measured in the spike                                                                                                                                                                                                  |
| Docking windows                                                                     | FlexLayout 0.11 or dockview 8.8                                                                                                                                                                                                    | Later, only if P5 wants real docking | –                                                                            | Would own the workspace area only; R2 §10                                                                                                                                                                                                        |
| Lists, tabs, the planner                                                            | `@dnd-kit/react` 0.5 (MIT, pre-1.0) or Pragmatic drag and drop 4.0 (Apache-2.0)                                                                                                                                                    | Open (P5)                            | The other one                                                                | The only drag-and-drop library. dnd-kit has keyboard dragging and sortable lists built in; Pragmatic uses native drag events (files, other windows) and leaves keyboard and animation to you                                                     |
| Record collections, live queries, optimistic edits                                  | TanStack DB 1.0 RC (`@tanstack/react-db`, MIT), about 84 kB                                                                                                                                                                        | Proposed for P4                      | Dexie's `liveQuery`, RxDB, hand-built Query keys and selectors               | Covered in [Data layer](#data-layer); built on the StorageProvider                                                                                                                                                                               |
| The browser provider's storage                                                      | idb-keyval 6.3 (Apache-2.0), 0.5 kB                                                                                                                                                                                                | Proposed for P3                      | Dexie 4.4, TanStack DB's own IndexedDB collection                            | One persistence path                                                                                                                                                                                                                             |
| Filters run in the browser                                                          | TanStack DB's live queries                                                                                                                                                                                                         | With P4                              | mingo, @ucast, sift                                                          | react-querybuilder only if its filter-building UI is wanted                                                                                                                                                                                      |
| Chart maths, custom SVG                                                             | D3 modules (ISC): `d3-scale`, `d3-shape`, `d3-array`, `d3-hierarchy`, `d3-force`                                                                                                                                                   | Proposed                             | visx (its XYChart pulls in react-spring), Nivo                               | Already in the bundle: Recharts brings `d3-scale` and `d3-shape` through `victory-vendor`, React Flow brings `d3-zoom` and `d3-drag`                                                                                                             |
| Dashboard charts                                                                    | Mantine charts now; ECharts 6.1 (Apache-2.0) as a second renderer                                                                                                                                                                  | Open (after step 5)                  | Plotly (too heavy), Highcharts (licence for commercial use), Chart.js, uPlot | Covered [above](#charts). With ECharts in, uPlot isn't needed as well: sampling and large mode cover long series                                                                                                                                 |
| Small charts in pages and forms                                                     | `@mantine/charts` (Recharts 3)                                                                                                                                                                                                     | Keep                                 | –                                                                            | Matches Mantine; fine for a handful of charts                                                                                                                                                                                                    |
| Chart grammars                                                                      | Vega-Lite, Observable Plot                                                                                                                                                                                                         | Not now                              | –                                                                            | A possible "spec" widget plugin later: a JSON spec is easy to store                                                                                                                                                                              |
| Big read-only graphs                                                                | sigma.js 4 with graphology (MIT)                                                                                                                                                                                                   | Later, as a plugin                   | Cytoscape.js                                                                 | WebGL, made for large networks; a second renderer for the same graph document                                                                                                                                                                    |
| 3D                                                                                  | three.js 0.186, React Three Fiber 9.8, drei 10.7 (MIT)                                                                                                                                                                             | Later (rhb-cdss body map)            | Babylon.js, luma.gl directly                                                 | One 3D stack. drei is R3F's helper set, not a second engine. R3F 9.8 accepts React 19.0–19.3                                                                                                                                                     |
| Maps and huge point layers                                                          | deck.gl 9.4 (MIT) with MapLibre                                                                                                                                                                                                    | Later, only with a Maps capability   | Raw luma.gl, regl, TWGL                                                      | luma.gl comes inside deck.gl                                                                                                                                                                                                                     |
| Graph layout                                                                        | dagre; `d3-hierarchy` for trees; elkjs (EPL-2.0) for port-aware layouts                                                                                                                                                            | Default                              | –                                                                            | The plugin's rule: a tree wants a tidy-tree layout, not a DAG layout. P6's two kinds (navigation, tree) are both trees                                                                                                                           |

### The libraries you liked

- **D3: yes, as the maths.** Scales, shapes, `d3-hierarchy` (tidy trees for the tree kind), `d3-force`, `d3-zoom`. React renders the SVG and D3 computes it. That's how the 2D body map should be drawn, and a `d3-svg` renderer can cover charts nothing else draws.
- **luma.gl: not directly.** It's a low-level WebGL2 and WebGPU toolkit for building renderers; deck.gl is built on it. three.js covers 3D, deck.gl covers maps and huge point layers, and each brings what it needs. luma.gl on its own is for custom shaders without a scene graph, which nothing here needs.
- **sigma.js: yes, later, as a plugin.** Version 4 draws large graphs with WebGL and adds a declarative style system; `@react-sigma/core` 6 binds it to React. It fits read-only exploration of thousands of nodes, such as a knowledge graph or exercise similarity, as a second renderer next to React Flow for the same graph document. It replaces Cytoscape.js in the list rather than joining it.
- **GoJS: no.** It's a full diagram editor, but commercial: $3,995 for one developer or $6,990 for up to three, free only for personal non-commercial use, with academic licences on request. It does what React Flow already does, and a platform meant to become a SaaS can't sit on a personal licence.

### What it means for rhb-cdss

- **Body map:** 2D as React SVG with D3 and Motion; 3D with three.js, React Three Fiber and drei in their own chunk, so pages without it never download three.js. One joint and region vocabulary drives both, as planned.
- **Planner:** its columns on the panel system; drag and drop with the library chosen in P5, and Motion for the drop animations.
- **Extra charts:** Mantine charts 9.7 already has heatmaps and radar charts (FMA-UE domains), so rhb-cdss needs no chart library of its own; it uses whichever renderer the builder ships.

## Performance checks

[perf/shell-perf.mjs](perf/shell-perf.mjs) already counts chart layouts, React commits and long frames per interaction, and on this branch also page load, separator drags and the context bar's lock. As a permanent check it becomes `perf/*.perf.ts`, Playwright against `vp build` and `vp preview`, with charts marked by a `data-chart` attribute instead of library class names.

| Kind | Checks                                                                                                                                                                                                                                                                                                                               | In CI                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| Hard | Per panel toggle, at most one layout per visible chart and none during the slide. A drag lays out nothing before release. A context-tab switch commits nothing in the shell or the grid. A tile's renderer import starts before its query resolves. Nothing is left running after unmount (observers, animation frames, WebGL loops) | Fail the build          |
| Soft | Long frames (count, longest), the longest gap between frames, commits per interaction                                                                                                                                                                                                                                                | Report and keep a trend |

- **Scenarios:** sidebar collapse and expand, context bar open and close, side panel open and close, separator drag, tile drag and resize, scrolling through 20 charts, a range change, a renderer switch, a window resize; later 2D → 3D on the body map.
- **Timings stay soft** until there's a dedicated runner: CI machines are noisy (R3 §10).
- **While developing:** React's Performance Tracks in Chrome DevTools show which components rendered and for how long (development builds; profiling builds show the Scheduler track). A `<Profiler>` around `Shell`, `DashboardGrid`, `ContextBar` and `WidgetTile` in a profiling build gives commit counts to tests.

## Order of work

This becomes the plan once the decisions are made. Steps 0–3 finish P1's "Docked panels"; steps 4–5 are new and can run before or alongside P2, since P2 moves whole folders.

| #   | Step                                                                                                                                                                                                                        | Done when                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 0   | **Quick fixes** (optional, today): the two CSS lines                                                                                                                                                                        | The side panel matches the "quick fix" row above                                                    |
| 1   | **Baseline.** The perf suite in the repo, with this page's numbers as its first record                                                                                                                                      | It reproduces the first table                                                                       |
| 2   | **The panel system** (`ui/panels/` on react-resizable-panels, with the freeze and the animation); the dashboard's side panel moves onto it; `SplitView` goes                                                                | Opening Inspect lays each chart out once, after the slide; a drag lays nothing out before release   |
| 3   | **The shell** moves onto it: the rail and closed states first; `useMainLock` and the splitter code go; the shell hooks split into layout and content                                                                        | The context bar matches the sidebar's numbers, and a context-tab switch doesn't re-render the shell |
| 4   | **The renderer seam:** `RendererPlugin`, semantic `chart` options with a schema migration, the `mantine` renderer as today's code, preloading next to the queries                                                           | The renderer import and the query start together, and old dashboards open unchanged                 |
| 5   | **The ECharts renderer:** the token theme, dark mode through `setTheme()`, tooltips like today's, `aria` descriptions. Then the dashboard default is chosen with both measured                                              | The decision is written down with the perf suite's numbers                                          |
| 6   | **Motion:** `MotionConfig` follows the app's motion setting; the panel system's slide; then panel content entering and leaving, and P5's tab strip                                                                          | Reduced motion turns every Motion animation off                                                     |
| 7   | **Docs:** shell.md, grid-and-charts.md, architecture.md, the AGENTS.md rules (including the panel library as an exception to "Mantine first"), the catalog (panels, charts, motion, drag and drop, graphs, 3D), 3-resources | `lint/docs.test.ts` passes                                                                          |

**Risks.**

- react-resizable-panels releases often (15 versions since Sep 20); pin it exactly and let the 24-hour release age and Renovate hold updates back.
- The shell's rail and closed states haven't been tried on it yet; step 3 starts there.
- If ECharts becomes the dashboard default, a canvas gives screen readers an `aria` description rather than marks, so Inspect's Data tab and the table widget stay the accessible view of the numbers.

## Decisions

| #   | Decision                      | Recommended                                                                                               | Alternatives                                                                                            |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | The panel library             | react-resizable-panels 4 for the shell and for pages                                                      | Keep Mantine `Splitter` with the quick fixes; a docking library (FlexLayout or dockview) for everything |
| 2   | The dashboard chart default   | Decide at the end of step 5, with both renderers measured; Mantine charts stays for small charts          | ECharts now; Mantine charts now                                                                         |
| 3   | Animation                     | Motion for app motion, View Transitions for route and tab changes                                         | Decided Oct 29                                                                                          |
| 4   | Drag and drop                 | Pick one in P5, `@dnd-kit/react` or Pragmatic drag and drop, never both                                   | –                                                                                                       |
| 5   | Graph and GPU libraries       | sigma.js later as a plugin; GoJS not adopted; luma.gl only through deck.gl                                | –                                                                                                       |
| 6   | The quick fixes               | Land them now                                                                                             | Wait for step 2                                                                                         |
| 7   | The records layer             | TanStack DB from P4, built on the StorageProvider; the P4 spike becomes an adoption check                 | Keep the spike open-ended                                                                               |
| 8   | Browser storage and filtering | idb-keyval for the browser provider; DB's live queries filter in the browser, so no mingo, @ucast or sift | Dexie; a separate filter library                                                                        |

## Sources

- The reviews: [R1 (data, caching, TanStack DB)](https://github.com/deneslee/mantine-dashboard-builder/blob/c7c56e1/docs/REVIEW/R1-data-caching-tanstackdb.md), [R2 (widgets, context, waterfalls)](https://github.com/deneslee/mantine-dashboard-builder/blob/5bd5ced/docs/REVIEW/R2-widgets-context-waterfalls-patterns.md), [R3 (animations, visualization libraries)](https://github.com/deneslee/mantine-dashboard-builder/blob/5bd5ced/docs/REVIEW/R3-animations-datavis-libraries.md)
- TanStack DB: [overview](https://tanstack.com/db/latest/docs/overview), [installation and collection types](https://tanstack.com/db/latest/docs/installation), [query collection](https://tanstack.com/db/latest/docs/collections/query-collection), [live queries](https://tanstack.com/db/latest/docs/guides/live-queries)
- [OpenAI Build Web Data Visualization plugin](https://github.com/openai/plugins/tree/main/plugins/build-web-data-visualization): library selection, WebGL library selection, React integration, testing
- [React 19.3](https://react.dev/blog/2026/09/09/react-19-3): `<ViewTransition>` stable; [React Performance Tracks](https://react.dev/reference/dev-tools/react-performance-tracks)
- [Chrome: Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames)
- [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels), [Mantine AppShell](https://mantine.dev/core/app-shell/), [FlexLayout accessibility](https://github.com/caplin/FlexLayout/blob/master/docs/accessibility.md), [dockview accessibility](https://dockview.dev/docs/advanced/accessibility), [dockview v7](https://dockview.dev/docs/releases/whats-new/whats-new-v7)
- [Motion: reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size), [Motion changelog](https://motion.dev/changelog?lib=motion&type=major)
- [GSAP Standard "No Charge" License](https://gsap.com/community/standard-license/)
- [Apache ECharts 6 features](https://echarts.apache.org/handbook/en/basics/release-note/v6-feature), [Why Apache ECharts is the future of Apache Superset](https://preset.io/blog/2021-4-1-why-echarts/)
- [sigma.js: migrating from v3 to v4](https://www.sigmajs.org/how-to/technical/migration-v3-v4/)
- [GoJS pricing and licensing](https://gojs.net/latest/pricing)
- [dnd kit changelog](https://dndkit.com/changelog), [dnd-kit vs Pragmatic drag and drop](https://www.pkgpulse.com/guides/dnd-kit-vs-react-beautiful-dnd-vs-pragmatic-drag-drop-2026)
- npm, Oct 29, 2026: `@tanstack/db` and `@tanstack/react-db` 1.0.0-rc.1 (0.15.2 on Oct 21), `@tanstack/query-db-collection` 1.5.0, idb-keyval 6.3.0, dexie 4.4.7, motion 14.8.0, gsap 3.15.0, react-resizable-panels 4.15.1 (the spike used 4.15.0), allotment 1.20.6, flexlayout-react 0.11.1, dockview-react 8.8.0, `@dnd-kit/react` 0.5.1, `@atlaskit/pragmatic-drag-and-drop` 4.0.0, echarts 6.1.0, `@mantine/charts` 9.7.4, recharts 3.10.1 (depends on `@reduxjs/toolkit`, `react-redux` and `victory-vendor`), `@xyflow/react` 12.12.0, sigma 4.0.4, `@react-sigma/core` 6.0.0, graphology 0.26.0, cytoscape 3.34.4, gojs 4.0.5, three 0.186.1, `@react-three/fiber` 9.8.2, `@react-three/drei` 10.7.9, `@luma.gl/core` 9.4.2, deck.gl 9.4.1, `@visx/xychart` 4.0.0, elkjs 0.12.1, `@dagrejs/dagre` 3.1.3
