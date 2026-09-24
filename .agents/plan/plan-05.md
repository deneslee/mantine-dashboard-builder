# Plan 05: Phase 2 Dashboard Read Core

Sep 24, 2026 · v1.2.0 · Tasks: [task-r05-03.md](./tasks/task-r05-03.md) · Research: [research-dashboard-architectures.md](./research/research-dashboard-architectures.md), [research-r05-table-library.md](./research/research-r05-table-library.md)

**v1.2 changes:** the table widget uses TanStack Table v9 (headless, only the features it uses) for table logic, rendered with Mantine `Table` and virtualized with `@tanstack/react-virtual`. The dashboard list paginates with Mantine `Pagination`.

**Order:** 5 of 5 · **Depends on:** Plan 04 (`Page.ControlBar`), Plan 03 (surface and layer tokens for widgets), Plan 02 (layer rules: the app layer fills the registries) · **Blocks:** phase 3 (editing)

**v1.1 changes:**

- **Time range:** kept in the URL and resolved at fetch time.
- **Registries:** static maps filled in by the app layer (this removes the widgets ↔ dashboards cycle).
- **DataFrame:** one columnar shape, plus `toRows()` for Mantine charts.
- **Validation:** zod lives in `api/dto.ts`.
- **Cut:** the migration engine and LTTB.
- **`container`:** is now a layout section instead of a widget.
- **Tasks added:** dependency install and dashboard-list virtualization.

## Objective

Replace the hard-coded demo tiles with a versioned dashboard document, pluggable widgets and datasources, a time range kept in the URL, and a virtualized table widget.

## Design

### 1. Dashboard document (the DTO) → domain

- **Wire shape:** `api/dto.ts` holds the zod schema for the stored document, `DashboardDocV1`, following Perses: panel specs separate from their positions.
  - `version: 1`, `id`, `title`, `description`
  - `timeRange: { from: string; to: string }`: raw strings, for example `now-24h`
  - `refresh?: string`: `off`, `30s`, `1m`, and so on
  - `variables: VariableDef[]`
  - `widgets: Record<string, { type; title; options; queries }>`
  - `layouts: Record<'lg' | 'md' | 'sm', { i; x; y; w; h }[]>`: the breakpoints match `tokens.grid.breakpoints`
- **Mapping:** `api/mapper.ts` turns it into the domain types in `model/`, so the UI never sees the DTO (AGENTS.md).
- **Versions:** `z.discriminatedUnion('version', [V1])`. No migration engine until there is a v2.
- **Replaces:** the reading-order reflow in `model/layouts.ts`, which is removed once every demo dashboard has explicit per-breakpoint layouts.
- **Row sections:** Perses's `PanelGroup` would be a layout concern, not a widget. RGL can't nest grids. Deferred.

### 2. DataFrame

- **Location:** `src/types/dataframe.ts` (the shared layer after Plan 02).
- **Shape:** one columnar shape, following Grafana: `{ name?; length; fields: { name; type: 'time'|'number'|'string'|'boolean'; values: unknown[]; config? }[] }`.
- **Charts:** Mantine charts take row objects. `toRows(frame)` converts; widgets call it through a memoized selector, once per frame change.
- **Tables:** read the columns directly (the virtualizer reads index `i` of each field).
- **Deferred:** LTTB downsampling, until a real datasource returns more than about 5k points.

### 3. Registries (static maps filled in by the app layer)

- **Contracts** (types only, shared layer):
  - `WidgetDefinition<TOptions>`: `{ type, name, icon, defaultSize, optionsSchema, component: LazyExoticComponent, skeleton }`
  - `DatasourceDefinition`: `{ type, name, query(spec, ctx, signal): Promise<DataFrame>, test?(config) }`
- **Definitions:** each widget or datasource lives in its own feature (`features/widgets/*`, `features/datasources/*`) and exports its definition.
- **Registration:** `app/registry.ts` builds the maps: `const widgets = { chart, table, kpi, markdown } satisfies Record<string, WidgetDefinition>`. It hands them to the dashboard grid through `DashboardRegistryProvider` (a context).
  - Dashboards never import the widgets feature, and widgets never import dashboards. The app layer composes them (bulletproof-react, Plan 02).
  - There are no import-time `registerWidget()` side effects, so tree-shaking and the `sideEffects` fix from Plan 01 keep working.
- **Current widgets:** the existing `widgetKinds.tsx` turns into the first definitions (`kpis → kpi`, `trend → chart`, `regions → chart`/`table`). `broken` stays as a story or test fixture.
- **Adapters:** `local-json` (`/data/…`) and `mock` (time series generated on the fly, seeded by range).

### 4. Time range (in the URL)

- **Where it lives:** route search params, validated with zod in `validateSearch`: `?from=now-24h&to=now&refresh=1m`. That makes it shareable, lets back and forward work, and needs no context or store slice. The dashboard document gives the defaults.
- **Query keys:** `['ds', datasourceId, queryHash, { from, to }]` with the **raw** strings, converted to absolute times inside `queryFn`. The key stays stable between renders; a refetch or the refresh interval re-resolves "now".
- **Auto-refresh:** `refetchInterval` from `refresh`, paused while the tab is hidden (React Query's default).
- **`keepPreviousData`:** on every datasource query, so changing the range never shows the skeleton again.
- **Picker:** `TimeRangePicker` is built from Mantine `Combobox` (relative presets `15m`, `1h`, `24h`, `7d`) plus a `@mantine/dates` range `DatePicker` for absolute ranges. `RefreshPicker` is a `Select`. Both sit in `Page.ControlBar`.

### 5. Table widget and virtualization

- **Dependencies:** `@tanstack/react-table` **v9** and `@tanstack/react-virtual`, neither installed yet. See [research-r05-table-library.md](./research/research-r05-table-library.md) for why this pair, and not mantine-react-table or AG Grid.
- **Division of work:**
  - **TanStack Table** handles the table logic: column definitions, sorting, column visibility and sizing.
  - **Mantine `Table`** renders it: `Table.Thead`, `Table.Tr`, `Table.Td`, `TableScrollContainer`, `stickyHeader`.
  - **react-virtual** decides which rows are rendered, inside `ScrollArea` (`viewportRef` as the scroll element).
  - No styles come from a third-party table.
- **Bundle size:** v9 only bundles the features the table declares. Start with `tableFeatures({ rowSortingFeature, columnVisibilityFeature, columnSizingFeature })`; filtering and grouping are added only when a widget needs them.
- **Columns:** built from `DataFrame.fields`, reading column values directly with no `toRows()` step. The widget options can override the label, format (`NumberFormatter`) and alignment per field.
- **React Compiler:** v9 is built on TanStack Store and documented as working under the React Compiler, which this repo has on. That is the main reason for v9 over v8.
- **Wrapper:** `createTableHook` (v9) gives a `useAppTable` with the feature set and Mantine cell renderers preset, so every table in the app behaves the same.
- **Dashboard list:** past 50 items, paginate with Mantine `Pagination` / `usePagination`. No virtualization needed there.

## Out of scope

Variables UI and interpolation (the schema only reserves the field), panel repeat, cross-filtering, LTTB, row sections, and editing.

## Risks

- Mantine charts might be slow re-rendering large row arrays. The fix is to downsample in the datasource, not the widget.
- Relative ranges and cache: two tabs on `now-1h` share one cache entry. That is intended (with a short `staleTime`, it just works).

## Verification

- **Unit tests:**
  - DTO schema: valid and invalid documents, unknown `version` rejected
  - mapper
  - `toRows`
  - relative-range resolution
- **Integration test:** changing the range in the URL refetches widget queries, keeps the grid mounted (same DOM node) and shows the previous data while fetching.
- **Table:** 10k rows scroll with no long task over 50 ms (production build).
- **Demo data:** every demo dashboard exists as `public/data/dashboards/<id>.json` and passes the schema, and `/dashboards/$id` renders it.
