# Plan 03: Phase 2 Dashboard Read Core

Sep 24, 2026 · v1.0.0 · Tasks: [task-r03-01.md](./tasks/task-r03-01.md) · Research: [research-dashboard-architectures.md](./research/research-dashboard-architectures.md)

## Objective
Establish the formal data contracts, registries, schemas, and virtualization for Phase 2: transition from hardcoded demo tiles to a fully declarative, versioned dashboard read engine supporting pluggable widgets and datasources.

## Architectural Design

### 1. Versioned Dashboard Schema (Zod)
Follow the **Perses decoupled model** separating panel specifications from layout placements:
* `src/features/dashboards/model/schema.ts`:
  * `DashboardDocSchemaV1`:
    * `version: 1`
    * `id: string`, `title: string`, `description: string`
    * `timeRange: { from: string, to: string, refresh?: number }`
    * `variables: VariableDefinition[]`
    * `layouts: Record<'lg' | 'md' | 'sm', LayoutItem[]>` (coordinates `{ id, x, y, w, h }`)
    * `widgets: Record<string, WidgetDefinition>` (specification `{ id, type, title, options, queries }`)
* Migration engine (`src/features/dashboards/model/migrations.ts`) to validate and migrate older document versions.

### 2. Standardized `DataFrame` Interface
* `src/shared/data/dataframe.ts`:
  * Columnar field definitions (`time`, `number`, `string`, `boolean`).
  * Vectorized representation allowing $O(1)$ series access for `@mantine/charts` and streaming transformations (e.g. LTTB downsampling).
  * Mappers to convert tabular JSON responses into `DataFrame`.

### 3. Pluggable Registries
* **Widget Registry** (`src/features/widgets/registry.ts`):
  * `registerWidget({ type, name, icon, defaultSize, optionsSchema, component: lazy, skeleton })`
  * Core read widgets: `chart` (Area, Line, Bar), `table` (virtualized rows), `kpi` (stat numbers), `markdown` (formatted text), `container` (row section).
* **Datasource Registry** (`src/features/datasources/registry.ts`):
  * `registerDatasource({ type, name, query(spec, ctx, signal) => Promise<DataFrame>, test(config) })`
  * Initial adapters: `local-json` (loading from `/data/*.json`) and `mock` (procedurally generated time-series).

### 4. Time-Range Engine
* Global `TimeRange` context and state slice.
* Keyed into React Query hooks: `['ds', datasourceId, queryHash, timeRange]`.
* Dedicated `TimeRangePicker` component with relative intervals (`15m`, `1h`, `24h`, `7d`) and auto-refresh intervals.

### 5. Table & List Virtualization
* Implement `@tanstack/react-virtual` alongside Mantine `ScrollArea`.
* Virtualize Table widget rows for datasets $>50$ rows.
* Virtualize Dashboard list view when repository grows past 50 dashboards.

## Verification Plan
* Validate schema against sample dashboard documents in `public/data/dashboards/*.json`.
* Unit tests for schema validation, document migration, and `DataFrame` transformations.
* Integration test verifying that changing the `TimeRangePicker` refetches widget queries without tearing down the grid canvas.
* Verify virtualized Table widget performance with 1,000+ data points.
