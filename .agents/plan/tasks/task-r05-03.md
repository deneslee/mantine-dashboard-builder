# Tasks: Phase 2 Dashboard Read Core

Sep 24, 2026 · v1.2.0 · Reference: [plan-05.md](../plan-05.md)

- [ ] **Dashboard DTO schema and mapper.** `DashboardDocV1` in `api/dto.ts` as a `discriminatedUnion('version')`, and `api/mapper.ts` mapping it to domain types in `model/`. Done when tests cover valid and invalid documents, rejection of an unknown version, and the mapper output.
- [ ] **Write the demo dashboards as JSON.** Create `public/data/dashboards/<id>.json` for sales, ops, infra and perf, with explicit `lg`/`md`/`sm` layouts; `client.ts` loads them. Done when every file passes the schema in a test and `api/demo.ts` is deleted.
- [ ] **Remove the reading-order reflow.** Delete the derived layouts in `model/layouts.ts` once every document has explicit layouts. Done when `layouts.test.ts` is replaced by schema tests.
- [ ] **DataFrame and `toRows`.** Columnar `DataFrame` in `src/types/dataframe.ts`, plus `toRows(frame)`. Done when unit tests cover the field types and an empty frame.
- [ ] **Widget and datasource contracts.** `WidgetDefinition` and `DatasourceDefinition` types in the shared layer. Done when they typecheck with the four existing kinds migrated.
- [ ] **Registry in the app layer.** `app/registry.ts` builds `widgets` and `datasources` maps with `satisfies`, and `DashboardRegistryProvider` passes them to the grid. Done when `features/dashboards` imports nothing from `features/widgets` or `features/datasources` (lint rule from Plan 02).
- [ ] **Migrate `widgetKinds.tsx` to definitions.** `kpi` and `chart` (area, line, bar), with `broken` moved to a story or test fixture. Done when every existing dashboard renders the same as before.
- [ ] **`local-json` and `mock` datasources.** They return `DataFrame`, honour the `AbortSignal`, and the mock is seeded by range. Done when their unit tests pass.
- [ ] **Time range in the URL.** `validateSearch` (zod) for `from`/`to`/`refresh` with defaults from the document, raw strings in query keys, conversion to absolute times in `queryFn`, and `refetchInterval` from `refresh`. Done when the integration test passes: changing the range refetches, the grid stays mounted and previous data is shown meanwhile.
- [ ] **`TimeRangePicker` and `RefreshPicker`.** Built from Combobox with presets, a `@mantine/dates` range picker and a Select, placed in `Page.ControlBar`. Done when there are stories and keyboard tests.
- [ ] **Install `@tanstack/react-table` v9 and `@tanstack/react-virtual`.** Create a shared `useAppTable` with `createTableHook`, with sorting, column visibility and column sizing enabled, and Mantine cell renderers. Done when a unit test sorts a `DataFrame`-backed table and checks that the build contains no filtering or grouping code.
- [ ] **Build the table widget.** Columns come from `DataFrame.fields`; rendered with Mantine `Table` (`stickyHeader`, `TableScrollContainer`); virtualized rows inside `ScrollArea` (`viewportRef`); sortable headers are keyboard-accessible with `aria-sort`. Done when 10k rows scroll with no long task over 50 ms in the production build, and it works under the React Compiler (no stale sort state).
- [ ] **Paginate the dashboard list past 50 items.** Mantine `Pagination` / `usePagination`. Done when a story with 500 items renders one page, and the page number is kept in the URL.
