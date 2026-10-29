I reviewed 150+ results across Kibana/EUI, Grafana, Superset, Metabase, Cloudscape, OpenSearch Dashboards, and layout-focused React projects. The clearest conclusion is that your current direction is already converging on what the stronger systems have moved toward: **serializable composition documents + small capability-based widgets + data/query runtime outside the layout + narrowly scoped UI/editor state**.

The best references are not all from one project. I would borrow **Grafana Scenes for runtime composition/data inheritance**, **Kibana for widget/embeddable contracts and action capabilities**, **Cloudscape/EUI for shell splitters/editor UX**, and some **Superset/Metabase ideas for tabs/filter scope**.

## 1. Widgets: Kibana has probably the best contract to copy

Kibana's current Embeddable system is much more relevant to your `WidgetPlugin` idea than older dashboard code.

An embeddable is essentially:

```ts
type EmbeddableDefinition = {
  type: string;
  buildEmbeddable(...): Promise<{
    Component: React.ComponentType;
    api: EmbeddableApi;
  }>;
};
```

The important architectural rule is that **the dashboard doesn't know the internal state of every widget type**. Each embeddable manages its own runtime state; the parent only owns/persists its serialized state. The component exposes a deliberately small imperative API. [GitHub](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/embeddable/README.md?utm_source=chatgpt.com)

Even better is Kibana's capability/interface model. Panels don't have one enormous interface with:

```ts
canInspect
canExport
canEdit
canDrilldown
canSetTimeRange
canFullscreen
...
```

Instead the API can implement capabilities like:

```text
HasSerializableState
HasEditCapabilities
HasInspectorAdapters
HasDrilldowns
PublishesDataLoading
PublishesTimeRange
PublishesTitle
PublishesBlockingError
...
```

Actions ask whether an embeddable supports the interface before appearing in the panel menu. [GitHub](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/embeddable/README.md?utm_source=chatgpt.com)

That maps exceptionally well to your plugin model.

I would evolve your `WidgetPlugin` roughly toward:

```ts
interface WidgetDefinition<TOptions, TApi = WidgetApi> {
  type: string;
  name: string;

  optionsSchema: Schema<TOptions>;

  defaultSize: Size;
  minSize?: Size;

  component: LazyComponent;
  editor?: LazyComponent;

  createRuntime?: (instance: WidgetInstance<TOptions>) => TApi;

  capabilities: readonly WidgetCapability[];
}
```

Then actions become separately registered:

```ts
interface WidgetAction {
  id: string;
  isCompatible(api: WidgetApi): boolean;
  run(api: WidgetApi): void | Promise<void>;
}
```

That is considerably better than teaching `WidgetTile` what a chart/table/node/markdown/etc. can do.

Your planned plugin contributions—widgets, editors, exporters, actions, context views—fit this directly. [GitHub](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/embeddable/README.md?utm_source=chatgpt.com)

---

# 2. Grafana Scenes is the strongest reference for your overall runtime

Grafana's newer architecture is probably the single most valuable codebase for you to study.

The older dashboard architecture accumulated a lot of coupled model/React/state logic. Grafana created **Scenes** specifically to support:

- nested composition
- multiple layouts
- variables at different levels
- query runners at different levels
- runtime state outside React
- efficient granular updates
- URL synchronization
- conditional rendering
- programmatic dashboards

The current model is effectively:

```text
Scene
│
├─ $timeRange
├─ $variables
├─ $data
├─ controls
│
└─ body
    └─ Layout
       ├─ Panel
       ├─ Panel
       └─ Nested layout
```

A child resolves data from itself or the nearest ancestor `SceneDataProvider`. So you can put a query runner on:

```text
Dashboard
    $data
    ├─ Chart
    └─ Table
```

and both consume it, or override it lower down:

```text
Dashboard
    $data A
    │
    ├─ Section
    │    $data B
    │    ├─ Chart
    │    └─ Table
    │
    └─ Chart   ← gets A
```

Grafana exposes this through `sceneGraph.getData(model)`. [Grafana Labs](https://grafana.com/developers/scenes/advanced-data?utm_source=chatgpt.com)

That directly supports something you've already been planning:

```text
dashboard
→ section
→ widget

inherit:
time
variables
data context
resolution
```

### But I would NOT copy Scenes wholesale

Scenes has its own reactive object framework with `SceneObjectBase`, RxJS subscriptions and activation/deactivation semantics.

Your stack already has:

```text
TanStack Query
Zustand
TanStack Router
React
```

You don't need another reactive runtime yet.

Borrow the **hierarchical resolution model**, not necessarily the implementation.

Something like:

```ts
interface RuntimeContext {
  time?: EffectiveTime;
  variables?: Variables;
  data?: DataBinding[];
}

function resolveContext(node: LayoutNode, ancestors: LayoutNode[]): ResolvedContext;
```

would get most of the architectural benefit without inventing another state library.

---

# 3. Your DataFrame + datasource abstraction is very close to Grafana

Grafana standardizes wildly different datasource outputs into **DataFrames**. Panels consume DataFrames rather than Prometheus/SQL/Loki/etc.-specific objects. [Grafana Labs](https://grafana.com/docs/grafana/latest/developer-resources/developer-tools/?utm_source=chatgpt.com)

Its basic flow is:

```text
DataSourcePlugin
      ↓
query specification
      ↓
SceneQueryRunner
      ↓
DataFrame[]
      ↓
transformations
      ↓
Panel
```

That's almost exactly what you're doing.

Your:

```text
DatasourcePlugin.query(spec, ctx, signal)
      ↓
DataFrame[]
```

is a good boundary.

I would keep it.

Where Grafana gets particularly interesting is `SceneQueryRunner`: it owns things like datasource, queries, max datapoints, time range and cache hints. It can also execute secondary requests **in parallel** with the primary and uses `combineLatest` so intermediate results can arrive without waiting for everything. [GitHub](https://github.com/grafana/scenes/blob/main/packages/scenes/src/querying/SceneQueryRunner.ts?utm_source=chatgpt.com)

So I would evolve your architecture toward:

```text
Widget
   ↓ declares
QuerySpec[]
   ↓
QueryRuntime / QueryBroker
   ↓
DatasourcePlugin
   ↓
DataFrame[]
   ↓
Transform[]
   ↓
Widget
```

rather than allowing widget implementations themselves to become fetch orchestrators.

---

# 4. Your current query caching is good; Grafana suggests one improvement

Grafana server-side query caching builds identity from roughly:

```text
datasource instance
+ query
+ time range
```

and for time series it normalizes/rounds the range according to the query resolution/interval. Its interval is influenced by:

```text
time range / max datapoints
```

and max datapoints is related to panel width. [Grafana Labs](https://grafana.com/docs/grafana/latest/administration/data-source-management/?utm_source=chatgpt.com)

That confirms the direction already present in your plan.

I'd eventually make your key conceptually:

```ts
[
  'data',
  datasourceId,
  datasourceRevision,

  normalizedQuerySpec,

  resolvedVariables,

  timeBucket,

  resolution,
];
```

and specifically **not**:

```ts
widgetId;
```

unless the query genuinely depends on the widget.

Then:

```text
two widgets
same datasource
same query
same context

→ one cache entry
```

which you already have.

Your planned addition of datasource-aware `resolution` is very Grafana-like and worth keeping. [GitHub](https://github.com/grafana/scenes/blob/main/packages/scenes/src/querying/SceneQueryRunner.ts?utm_source=chatgpt.com)

---

# 5. React waterfalls: both Kibana and Grafana deliberately avoid parent-driven fetching

This was one of the more useful findings.

Kibana's embeddable renderer dynamically loads dependencies/factory/runtime pieces rather than requiring everything at page bootstrap. Embeddable definitions themselves can be async imports. [GitHub](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/embeddable/README.md?utm_source=chatgpt.com)

Inside data-driven embeddables, Kibana commonly uses an observable fetch pipeline where changing inputs:

```text
query/filter/time changes
       ↓
cancel old request
       ↓
start new request
       ↓
publish loading/data/error
```

rather than:

```text
Dashboard useEffect()
   await fetch A
   await fetch B
   await fetch C
   render widgets
```

Kibana's Lens team explicitly warns that a page with many independent embeddables can become expensive—roughly beyond ~20 is called out as a case where custom shared fetching may make sense—and recommends stable configuration references so panels don't unnecessarily reinitialize/refetch. [GitHub](https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/lens/readme.md?utm_source=chatgpt.com)

Grafana goes further. A `SceneQueryRunner` launches independent/secondary requests in parallel; secondary data isn't supposed to block the primary panel's first usable result. [GitHub](https://github.com/grafana/scenes/blob/main/packages/scenes/src/querying/SceneQueryRunner.ts?utm_source=chatgpt.com)

Grafana's grid also directly supports:

```ts
new SceneGridLayout({
  isLazy: true,
});
```

so offscreen objects don't initialize until needed. [Grafana Labs](https://grafana.com/developers/scenes/scene-layout?utm_source=chatgpt.com)

### For your app

Your current:

```text
tile approaches viewport
→ enable useWidgetData
→ datasource queries execute
```

is already the correct pattern.

I'd keep and extend it to:

```text
route loader
    dashboard document
         ↓
render layout immediately
         ↓
tiles independently activate
         ↓
plugin chunk + query start concurrently
```

rather than loaders pre-fetching every widget.

For expensive dashboards:

```text
IntersectionObserver
      ↓
preload plugin chunk
+
enable Query
```

with a margin before the panel enters the viewport.

And preserve your existing:

```text
last complete frames
```

during key transitions.

That's essentially the direction Grafana and Kibana have arrived at.

---

# 6. Split panes: EUI provides a very useful lesson about what NOT to do

EUI's `EuiResizableContainer` is quite nice from an accessibility perspective:

```text
ResizableContainer
├─ ResizablePanel
├─ ResizableButton
└─ ResizablePanel
```

It supports horizontal/vertical layouts, min/max constraints, collapsible/main panels, pointer resizing and keyboard arrow resizing. [Grafana Labs](https://grafana.com/developers/scenes/scene-layout?utm_source=chatgpt.com)

But there's a particularly relevant Elastic discussion about its limitations.

EUI historically treats panels largely proportionally. Elastic engineers explicitly noted that this is poor for the common:

```text
fixed-ish left sidebar
fluid center
fixed-ish right inspector
```

case, because resizing the browser should mainly resize the center—not proportionally change the side panels. Kibana ended up building additional resizable-layout machinery around this. [GitHub](https://github.com/elastic/eui/discussions/7290?utm_source=chatgpt.com)

That describes your shell almost exactly.

### Cloudscape's solution is closer to what you need

Cloudscape `AppLayout` treats the split panel as shell state:

```tsx
splitPanelOpen={...}
splitPanelSize={360}
onSplitPanelResize={...}
splitPanelPreferences={{ position: 'side' }}
```

Their configurable-dashboard demo persists the panel width independently of the dashboard layout. [GitHub](https://github.com/cloudscape-design/components/issues/2105?utm_source=chatgpt.com)

For your shell I'd therefore do:

```text
sidebar px | flexible main | context pane px
```

not percentages.

And critically:

```text
pointer move
→ update CSS/grid geometry directly

pointer up
→ commit width to store
```

rather than:

```text
pointer move
→ Zustand
→ React tree rerender
→ dashboard recalculates
→ charts rerender
```

EUI's current container-query guidance explicitly recommends using CSS container queries rather than JS resize observation where possible because JS-driven resize state causes React rerenders and can make applications feel sluggish. [eui.elastic.co](https://eui.elastic.co/docs/layout/page-components/?utm_source=chatgpt.com)

That is directly applicable to the width-performance issue you've seen.

---

# 7. For in-page splitters, Grafana's model is surprisingly simple

Scenes has a `SplitLayout`:

```text
SplitLayout
├─ primary
└─ secondary
```

with:

```ts
direction: 'row' | 'column';
```

and each child is another scene/layout/panel. [Grafana Labs](https://grafana.com/developers/scenes/scene-layout?utm_source=chatgpt.com)

This is the model I'd use for your **content-level** split views.

So distinguish:

```text
Shell panes
    persistent app chrome
    px width
    not part of page document

Page SplitLayout
    part of page/view composition
    serializable
```

That's an important boundary.

---

# 8. Dynamic tabs: Grafana 2026 is almost exactly your planned model

Grafana's Dynamic Dashboards became GA in April 2026.

The new model supports:

- tabs
- rows
- nested tabs inside rows
- rows inside tabs
- nesting up to three levels
- variables scoped to individual sections
- custom grid or auto-grid per section
- show/hide rules based on variables/data. [Grafana Labs](https://grafana.com/whats-new/2026-04-08-dynamic-dashboards-is-now-generally-available/?utm_source=chatgpt.com)

This is strong validation for your idea of something around:

```text
grid | row | tabs
```

rather than arbitrary HTML/page-builder containers.

I'd use a discriminated layout tree:

```ts
type LayoutNode = GridNode | RowNode | TabsNode;

interface TabsNode {
  kind: 'tabs';
  id: string;
  tabs: TabNode[];
}

interface TabNode {
  id: string;
  title: string;
  content: LayoutNode;
}

interface RowNode {
  kind: 'row';
  id: string;
  content: LayoutNode;
}
```

with panels themselves referenced by ID rather than embedded as arbitrary React children.

Something like:

```text
Dashboard
└─ Tabs
   ├─ Overview
   │   └─ Grid
   │       ├─ KPI
   │       └─ Chart
   │
   └─ Therapy
       └─ Row
           └─ Grid
               ├─ Table
               └─ Chart
```

is much closer to Grafana's current direction than a general page builder. [Grafana Labs](https://grafana.com/whats-new/2025-04-10-dynamic-dashboards/?utm_source=chatgpt.com)

And I would copy Grafana's **limited nesting**, not infinite arbitrary containers.

---

# 9. Dashboard tabs and workspace tabs should be separate concepts

This is important for your plan.

Grafana has `SceneAppPage` tabs where every tab is effectively another page/scene with its own lazy `getScene()`. It also explicitly recommends caching the root `SceneApp` so navigation doesn't destroy runtime/data state. [Grafana Labs](https://grafana.com/developers/scenes/scene-app?utm_source=chatgpt.com)

So:

### Dashboard/layout tabs

Persisted inside a dashboard:

```text
Overview
Analytics
Details
```

### Workspace/document tabs

User runtime:

```text
Patient A
Patient B
Exercise library
Therapy Plan 17
```

I would make those completely different models.

For workspace tabs:

```ts
interface WorkspaceTab {
  id: string;
  kind: 'patient' | 'exercise' | 'dashboard' | 'flow';
  resourceId: string;
  title: string;
  dirty?: boolean;
}
```

And use Router state for the active tab/resource.

Do **not** reuse your dashboard `TabsNode`.

---

# 10. If you eventually want VS-Code-style docking/windows, FlexLayout is the reference

I would not put this in your core yet, but it is useful research.

FlexLayout has a serializable model:

```text
row
├─ tabset
│  ├─ tab
│  └─ tab
└─ row
   └─ tabset
```

Every change is an explicit action:

```text
ADD_TAB
DELETE_TAB
SELECT_TAB
MOVE_NODE
ADJUST_WEIGHTS
MAXIMIZE
POPOUT_TAB
POPOUT_TABSET
```

and its JSON can represent sublayouts, floating panels and actual browser-window popouts. It also preserves component state while tabs move. This is a very good model to study if your future "windows" becomes true docking rather than simply document tabs.

But it is much more machinery than your current healthcare showcase needs.

So I would borrow the idea:

```text
serializable model
+
commands/actions
```

without adopting a docking runtime yet.

---

# 11. Cloudscape is an excellent reference for your widget palette/editor UX

Cloudscape separates:

```text
widget registry
layout records
rendered BoardItems
palette
```

Their configurable dashboard demo has essentially:

```ts
const allWidgets: Record<string, WidgetConfig>;
```

and independently stored placement data:

```text
id
columnSpan
columnOffset
rowSpan
```

The widget definition supplies default spans, while layout overrides them. That is exactly the separation you've been aiming for between:

```text
Widget
vs
LayoutItem
```

Their recommended editor is also interesting:

```text
Dashboard
+
"Add widget"
    ↓
discrete SplitPanel
    ↓
ItemsPalette
```

rather than permanently cramming a massive builder toolbar above the dashboard. [Cloudscape](https://cloudscape.design/components/board-components/?utm_source=chatgpt.com)

For your app I'd combine this with Grafana's new context-aware editor side pane:

```text
nothing selected
→ dashboard settings

widget selected
→ widget inspector

layout selected
→ row/tab/grid settings

Add widget
→ widget palette

datasource selected
→ query / provenance
```

This fits your planned right context bar extremely well.

---

# 12. Superset is valuable mainly as a warning

Current Superset represents dashboard layout as a normalized tree/map:

```ts
type LayoutItem = {
  id;
  type;
  children;
  parents;
  meta;
};
```

and separately maintains:

```text
charts
dashboardLayout
dashboardState
dataMask
nativeFilters
...
```

in Redux. [GitHub](https://github.com/apache/superset/blob/master/superset-frontend/src/dashboard/types.ts?utm_source=chatgpt.com)

That's interesting for normalized layout operations, but the more telling thing is that Superset is now proposing to move away from having Redux own both server and UI state.

SIP-207 proposes:

```text
Zustand       → browser/UI state
TanStack Query → server state
```

precisely because those concerns are fundamentally different. [GitHub](https://github.com/apache/superset/issues/39209?utm_source=chatgpt.com)

Even newer Superset work identifies another problem: native/cross filters currently go through central `dataMask` orchestration and the dashboard has to compute and push merged state down into every chart. The proposed Widget Framework explicitly calls this pipeline heavy and overly centralized. [GitHub](https://github.com/apache/superset/issues/44875?utm_source=chatgpt.com)

So **don't copy current Superset's state architecture**.

It actually validates your existing direction.

---

# 13. Filter/data scope: borrow Grafana + Metabase

Metabase now has a useful scope hierarchy:

```text
dashboard filter
header/section filter
card filter
```

Dashboard-level filters span tabs, while header/card widgets can be constrained to smaller scopes. [metabase.com](https://www.metabase.com/docs/latest/dashboards/filters?utm_source=chatgpt.com)

Grafana's Dynamic Dashboards similarly allows variables at section level, so one tab/row can have independent variables from another. [Grafana Labs](https://grafana.com/whats-new/2026-04-08-dynamic-dashboards-is-now-generally-available/?utm_source=chatgpt.com)

I would therefore make your eventual context inheritance:

```text
Workspace
  ↓
Page/Dashboard
  ↓
Section/Tab/Row
  ↓
Widget
```

with:

```text
time
variables
filters
datasource bindings
```

being overrideable at each level.

Not necessarily immediately—but design the schema so it can support it.

---

# What I would adopt for `mantine-dashboard-builder`

The resulting architecture I'd use is:

```text
Workspace document
│
├─ navigation
│
├─ open workspace tabs
│
└─ pages
    │
    └─ Dashboard
        │
        ├─ context
        │   ├─ time
        │   ├─ filters
        │   └─ variables
        │
        └─ LayoutNode
            ├─ Grid
            │   └─ WidgetInstance IDs
            │
            ├─ Row
            │   └─ LayoutNode
            │
            └─ Tabs
                └─ Tab
                    └─ LayoutNode
```

Runtime:

```text
WidgetInstance
      │
      ├────────────── WidgetDefinition registry
      │                   component
      │                   editor
      │                   schema
      │                   capabilities
      │
      ↓
resolved inherited context
      ↓
QuerySpec[]
      ↓
TanStack Query / QueryBroker
      ↓
DatasourcePlugin
      ↓
DataFrame[]
      ↓
Transform pipeline
      ↓
Widget component
```

Persistence remains separate:

```text
StorageProvider
├─ IndexedDB
├─ files
├─ Convex
└─ future backend
```

Records can later sit behind TanStack DB as we discussed.

UI/runtime state:

```text
TanStack Query    server/query results
TanStack DB       record collections, later
Zustand           editor/document runtime + shell
TanStack Router   navigable/shareable state
StorageProvider   durable documents/records
local component   transient interaction
```

## The parts I would explicitly copy

| Your requirement          | Best reference         | What I'd borrow                                            |
| ------------------------- | ---------------------- | ---------------------------------------------------------- |
| Widget architecture       | **Kibana**             | serializable widget + internal runtime + capability API    |
| Widget menus/actions      | **Kibana**             | action registry gated by capabilities                      |
| Data model                | **Grafana**            | datasource → query → DataFrame → transform → visualization |
| Context inheritance       | **Grafana Scenes**     | nearest parent data/time/variables                         |
| Query orchestration       | **Grafana**            | parallel independent queries, partial readiness            |
| Cache identity            | **Grafana**            | datasource + query + normalized time + resolution          |
| Avoid React waterfalls    | **Grafana + Kibana**   | lazy activation, cancellation, parallel load               |
| Dashboard layout          | **Grafana 2026**       | grid/row/tabs with intentionally limited nesting           |
| Widget palette            | **Cloudscape**         | registry + palette in side split panel                     |
| Persistent editor pane    | **Grafana/Cloudscape** | context-aware docked inspector                             |
| Shell splitter            | **Cloudscape/Kibana**  | px side panes + fluid center                               |
| Responsive widget content | **EUI**                | CSS container queries instead of React width state         |
| Dashboard filters         | **Grafana/Metabase**   | hierarchical scope                                         |
| Workspace tabs            | **Grafana SceneApp**   | distinct from dashboard tabs, preserve runtime             |
| Future docking/windows    | **FlexLayout**         | serializable tabset tree + command model                   |
| State ownership           | **Superset SIP-207**   | Query server state / Zustand UI state                      |

The **biggest change I'd make to your plan after this research** is not a new library. It's to formalize two concepts that are currently somewhat implicit:

1. a **hierarchical runtime context** (`time / variables / filters / bindings / dataActive`) inspired by Grafana Scenes, and
2. a **widget capability/action API** inspired by Kibana.

Those two pieces would make your later dashboard, record pages, flow/node views, inspectors, exports, contextual actions, and plugins fit together without turning the shell/dashboard component into a giant coordinator.
