# Plan 05: Phase 2 Dashboard Read Core

Sep 27, 2026 · v1.3.0 · Tasks: [task-r05-04.md](./tasks/task-r05-04.md) · Research: [research-dashboard-architectures.md](./research/research-dashboard-architectures.md), [research-r05-table-library.md](./research/research-r05-table-library.md)

**v1.3 changes:**

- **Layouts:** `md` / `sm` layouts are optional, and the existing reading-order reflow fills in the missing ones instead of being deleted.
- **One file per dashboard:** `getDashboard` fetches its own document instead of the whole list.
- **The `broken` dashboard:** a document that fails the schema, instead of an id check in `client.ts`.
- **Auto-refresh:** one timer invalidates the datasource queries, instead of `refetchInterval` on every query.
- **`regions`:** becomes the table widget, so the table comes before the registry switch-over.
- **Registry check:** a test with a fake registry replaces a lint check that couldn't fail.
- **Cut:** dashboard-list pagination. Unverifiable checks are replaced.

**Earlier:** v1.1 put the time range in the URL, filled registries in the app layer, added `DataFrame` and zod in `api/dto.ts`, and made `container` a layout section. v1.2 chose TanStack Table v9 + Mantine `Table` + `@tanstack/react-virtual`.

**Order:** 5 of 6 · **Depends on:** Plan 02 (done); Plan 04 (`Page.ControlBar`) for the pickers only. The document, DataFrame, contract, datasource, table and registry tasks can start any time. It needs nothing from Plan 03 beyond `--app-layer-surface`, which exists. · **Blocks:** phase 3 (editing)

## Objective

Replace the hard-coded demo tiles with a versioned dashboard document, pluggable widgets and datasources, a time range kept in the URL, and a virtualized table widget.

## Design

### 1. Dashboard document (the DTO) → domain

- **Wire shape:** `api/dto.ts` holds the zod schema for the stored document, `DashboardDocV1`. It follows Perses: panel specs are separate from their positions.
  - `version: 1`, `id`, `title`, `description`
  - `timeRange: { from: string; to: string }`: raw strings, for example `now-24h`
  - `refresh?: string`: `off`, `30s`, `1m`, and so on
  - `variables: VariableDef[]` (reserved; no UI yet)
  - `widgets: Record<string, { type; title; options; queries }>`
  - `layouts: { lg: Item[]; md?: Item[]; sm?: Item[] }` with `Item = { i; x; y; w; h }`; the breakpoints match `tokens.grid.breakpoints`
- **Layouts:** `lg` is required.
  - `toLayouts` (`model/layouts.ts`, already tested) keeps any authored `md` / `sm` and fills in a missing one with the reading-order reflow.
  - Authors only write `md` / `sm` where the reflow gets it wrong. The phase 3 editor will save all three.
  - Deleting the reflow would mean writing about 70 layout entries by hand across the four demo dashboards (40 of them for `perf`).
- **Mapping:** `api/mapper.ts` turns the document into the domain types in `model/`, so the UI never sees the DTO (AGENTS.md).
- **Versions:** `z.discriminatedUnion('version', [V1])`. No migration engine until there is a v2.
- **Files:**
  - `public/data/dashboards/index.json` stays the list of summaries; each dashboard is `<id>.json`.
  - `getDashboard(id)` fetches `<id>.json`. A 404 becomes `AppError('not_found')`, which the route already turns into `notFound()`.
  - A test checks that every summary's `widget_count` matches its document. Today's `index.json` says 9, 12 and 7 widgets for dashboards that show 5.
  - `broken.json` is a document that fails the schema, so the route-error demo goes through the real `validation` path. The `id === 'broken'` check in `client.ts` goes.
- **Row sections:** Perses's `PanelGroup` would be a layout concern, not a widget. RGL can't nest grids. Deferred.

### 2. DataFrame

- **Location:** `src/types/dataframe.ts` (shared layer).
- **Shape:** one columnar shape, following Grafana: `{ name?; length; fields: { name; type: 'time'|'number'|'string'|'boolean'; values: unknown[]; config? }[] }`.
- **Charts:** Mantine charts take row objects. `toRows(frame)` converts, and widgets call it through a memoized selector, once per frame change.
- **Tables:** read the columns directly (the virtualizer reads index `i` of each field).
- **Deferred:** LTTB downsampling, until a real datasource returns more than about 5k points.

### 3. Registries (static maps filled in by the app layer)

- **Contracts** (types only, shared layer):
  - `WidgetDefinition<TOptions>`: `{ type, name, icon, defaultSize, optionsSchema, component: LazyExoticComponent, skeleton }`
  - `DatasourceDefinition`: `{ type, name, query(spec, ctx, signal): Promise<DataFrame>, test?(config) }`
- **Definitions:** each widget or datasource lives in its own feature (`features/widgets/*`, `features/datasources/*`) and exports its definition.
- **Registration:** `app/registry.ts` builds the maps, for example `const widgets = { chart, table, kpi } satisfies Record<string, WidgetDefinition>`.
  - It hands them to the dashboard grid through `DashboardRegistryProvider` (a context).
  - There are no import-time `registerWidget()` side effects, so tree-shaking and `sideEffects` keep working.
  - The Plan 02 lint rule already stops dashboards from importing widgets or datasources. The check here is a test that renders `DashboardGrid` with a fake registry.
- **Current widgets:** `widgetKinds.tsx` becomes the first definitions.
  - `kpis` → `kpi`
  - `trend` → `chart` (area, line, bar)
  - `regions` → `table`, so the table widget is built before `widgetKinds.tsx` is deleted
  - `broken` → a story or test fixture
- **Adapters:** `local-json` (`/data/…`) and `mock` (time series generated on the fly, seeded by range). The mock takes over the fetchers in `api/demo.ts`, which is then deleted.

### 4. Time range (in the URL)

- **Where it lives:** route search params, validated with zod in `validateSearch`: `?from=now-24h&to=now&refresh=1m`.
  - That makes the range shareable, lets back and forward work, and needs no context or store slice.
  - The dashboard document gives the defaults.
- **Query keys:** `['ds', datasourceId, queryHash, { from, to }]` with the **raw** strings, converted to absolute times inside `queryFn`. The key stays stable between renders; a refetch re-resolves "now".
- **Auto-refresh: one timer.**
  - Mantine `useInterval` in the dashboard view calls `queryClient.invalidateQueries({ queryKey: ['ds'] })` every `refresh`, and skips ticks while `useDocumentVisibility()` is `hidden`.
  - React Query refetches only active queries, so only the dashboard on screen reloads.
  - The Refresh button makes the same call; today it invalidates `['widget', id]`.
  - Why not `refetchInterval` per query: every widget gets its own timer, so widgets resolve "now" at different moments and refetch out of step.
- **Previous data:** `placeholderData: keepPreviousData` is already the global default in `app/queryClient.ts`, so changing the range never shows the skeleton again.
- **Pickers:**
  - `TimeRangePicker` is built from Mantine `Combobox` (relative presets `15m`, `1h`, `24h`, `7d`) plus a `@mantine/dates` range `DatePicker` for absolute ranges.
  - `RefreshPicker` is a `Select`.
  - Both sit in `Page.ControlBar`.

### 5. Table widget and virtualization

- **Dependencies:** `@tanstack/react-table` **v9** (stable; 9.2.4 on Sep 27) and `@tanstack/react-virtual`. See [research-r05-table-library.md](./research/research-r05-table-library.md) for why this pair, and not mantine-react-table or AG Grid.
- **Division of work:**
  - **TanStack Table** handles the table logic: column definitions, sorting, column visibility and sizing.
  - **Mantine `Table`** renders it: `Table.Thead`, `Table.Tr`, `Table.Td`, `TableScrollContainer`, `stickyHeader`.
  - **react-virtual** decides which rows are rendered, inside `ScrollArea` (`viewportRef` as the scroll element).
  - No styles come from a third-party table.
- **Features:** start with `tableFeatures({ rowSortingFeature, columnVisibilityFeature, columnSizingFeature })`. Filtering and grouping are added only when a widget needs them.
- **Columns:** built from `DataFrame.fields`, reading column values directly with no `toRows()` step. The widget options can override the label, format (`NumberFormatter`) and alignment per field.
- **React Compiler:** v9 is built on TanStack Store and documented as working under the React Compiler, which this repo has on. That is the main reason for v9 over v8.
- **Wrapper:** `createTableHook` gives a `useAppTable` with the feature set and Mantine cell renderers preset, so every table in the app behaves the same.

## Out of scope

Variables UI and interpolation (the schema only reserves the field), panel repeat, cross-filtering, LTTB, row sections, editing, and dashboard-list pagination. The list has five entries from a static file; when it comes from an API, it gets paginated on the server.

## Risks

- Mantine charts might be slow re-rendering large row arrays. The fix is to downsample in the datasource, not the widget.
- Relative ranges and the cache: two tabs on `now-1h` share one cache entry. That is intended (with a short `staleTime`, it just works).
- A hand-written `md` / `sm` layout can drift from `lg` when widgets are added. The layout schema test checks that every widget id appears in every authored layout.

## Verification

- **Unit tests:**
  - DTO schema: valid and invalid documents, unknown `version` rejected, and every widget id present in each authored layout
  - mapper
  - `toLayouts`: authored breakpoints kept, missing ones reflowed
  - `toRows`
  - relative-range resolution
  - `widget_count` in `index.json` matches each document
- **Integration test:** changing the range in the URL refetches widget queries, keeps the grid mounted (same DOM node) and shows the previous data while fetching.
- **Table:** a Chrome Performance trace of scrolling 10k rows on `pnpm preview` shows no long task over 50 ms. Record the trace summary in the PR.
- **Demo data:** every demo dashboard exists as `public/data/dashboards/<id>.json` and passes the schema, and `/dashboards/$id` renders it.
