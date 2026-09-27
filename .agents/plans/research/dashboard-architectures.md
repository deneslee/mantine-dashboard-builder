# Research: Industry Dashboard Architectures

Sep 24, 2026 · Reference: [plan-05.md](../plan-05.md)

This research evaluates state-of-the-art dashboard implementations—specifically **Grafana**, **Perses**, and **Metabase**—to inform the architectural decisions for Phase 2 and beyond in Dashboard Builder.

---

## 1. Grafana (`@grafana/ui` & Grafana Core)

### A. Component Decoupling: `PanelChrome` vs. Visualizations

In Grafana, the container of a panel is decoupled from the visualization plugin:

- **`PanelChrome`**: The host component for each tile.
  - Manages common chrome UI: Title, subtitle/description, drag handles, contextual actions menu (Inspect, Share, Edit, View Fullscreen, Duplicate, Remove), and status indicators (loading, error, time override).
  - Wraps the visualization in an isolated `ErrorBoundary` and handles loading states so individual panel crashes or network delays never disrupt the surrounding grid.
- **Visualization Plugins**: Standardized components (`TimeSeries`, `BarChart`, `Table`, `Stat`) that receive:
  - A normalized data contract (`DataFrame[]`).
  - Explicit container dimensions (`width`, `height`).
  - Pure options configuration derived from the panel schema.

### B. TimeRange & Auto-Refresh Engine

- Centralized `TimeRange` context feeds every query key:
  - Structure: `{ from: DateTime | string, to: DateTime | string, raw: { from, to } }`.
  - Presets: Quick relative intervals (`now-15m`, `now-1h`, `now-24h`, `now-7d`) alongside absolute calendar ranges.
  - Auto-refresh: Distinct interval selector (`off`, `5s`, `10s`, `1m`) with global pause/resume controls.
  - In React Query terms: `['ds', datasourceId, queryHash, timeRange]` ensures range shifts invalidate or keep previous data smoothly.

### C. Unified `DataFrame` Specification

Grafana abandoned arbitrary JSON arrays in favor of vectorized, column-oriented `DataFrame`s:

```typescript
interface Field<T = unknown> {
  name: string;
  type: 'time' | 'number' | 'string' | 'boolean' | 'other';
  values: T[];
  labels?: Record<string, string>;
  config?: FieldConfig;
}

interface DataFrame {
  name?: string;
  fields: Field[];
  length: number;
}
```

- **Performance Benefit**: Zero-copy conversions for chart series, columnar slicing for table virtualization, and streaming/downsampling operations (LTTB) execute in $O(N)$ with contiguous array access.

---

## 2. Perses (CNCF / Linux Foundation Standard)

### A. Spec Separation: Panels vs. Layouts

Perses strictly isolates **what** a panel is from **where** it is positioned on the grid:

```yaml
kind: 'Dashboard'
metadata:
  name: 'Production Overview'
spec:
  datasources:
    prom-default: { ... }
  variables:
    - kind: 'ListVariable'
      spec: { name: 'env', ... }
  panels:
    cpuUsage:
      kind: 'Panel'
      spec:
        display: { name: 'CPU Utilization', description: 'Node CPU percent' }
        plugin: { kind: 'TimeSeriesChart', spec: { ... } }
        queries: [...]
  layouts:
    - kind: 'Grid'
      spec:
        display: { title: 'Compute Row', collapse: { open: true } }
        items:
          - x: 0
            y: 0
            width: 6
            height: 4
            content: { '$ref': '#/spec/panels/cpuUsage' }
```

- **Key Advantages for Dashboard Builder**:
  1. Panels can be referenced across multiple breakpoint layouts without duplicating options or queries.
  2. The schema can easily support templating, row repetition, or panel cloning.
  3. Responsive layouts (`lg`, `md`, `sm`) only need to store coordinates `{ id, x, y, w, h }` referencing panel keys.

### B. `PanelGroup` (Row Containers)

- Panels are organized within `PanelGroup` sections (collapsible rows with titles and open/closed states).
- Perses enables collapsing an entire row to unmount or pause off-screen queries and canvas rendering.

### C. Variables & Repeat Model

- Variables are declared at the dashboard root and interpolated into datasource queries.
- **Panel-Level Repeat Variable**: Layout items can specify `repeatVariable: { name: "instance", maxPerRow: 3 }`, enabling one panel definition to dynamically replicate across all values of a multi-select variable.

---

## 3. Metabase (Embedded Analytics & Filter Hierarchy)

### A. Presentation Overrides vs. Core Question

- Metabase distinguishes the underlying saved question/query from its presentation on a dashboard card.
- A dashboard card can override card titles, series colors, axis visibility, and click interactions without modifying the saved question.

### B. Scoped Filter Hierarchy

Metabase establishes three distinct scopes for parameter widgets:

1. **Dashboard-Level Filters**:
   - Render in the top control bar; apply to all compatible cards across tabs.
2. **Heading/Section-Level Filters**:
   - Pinned to a section header; apply exclusively to cards below that heading on the current tab.
3. **Card-Level Filters**:
   - Direct interactive controls embedded within individual card headers.

### C. Cross-Filtering & Click Interactions

- Cards support configurable click behaviors:
  - **Drill-down**: Navigate to raw question or external URL passing clicked dimension as query parameter.
  - **Cross-filter**: Clicking a bar, pie slice, or table row sets a dashboard-level filter parameter and triggers re-fetch across other linked cards, automatically preserving focus on the clicked card.

---

## 4. Key Takeaways for Dashboard Builder Phase 2

1. **Adopt Perses-style Panel/Layout Decoupling**:
   - Store `widgets: Record<string, WidgetDoc>` and `layouts: Record<Breakpoint, LayoutItem[]>`.
2. **Standardize on Columnar `DataFrame`**:
   - Define `DataFrame { columns: ColumnDef[], rows: unknown[][] }` or `fields: Field[]`.
3. **Build a Composable `Page.Header` (Grafana `PageToolbar` style)**:
   - Provide breadcrumbs, editable titles, action groups, and an extensible `Page.ControlBar` slot for time-range pickers and variable filters.
4. **Implement Container/Visualization Isolation (`WidgetTile` as `PanelChrome`)**:
   - Maintain strict error boundaries, loading skeletons, lazy chunk loading, and action menus in `WidgetTile`, keeping widget visual components pure.
