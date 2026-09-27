# Tasks: Phase 2 Dashboard Read Core

Sep 27, 2026 · v1.3.0 · Reference: [plan-05.md](../plan-05.md)

- [ ] **Dashboard DTO schema and mapper.** `DashboardDocV1` in `api/dto.ts` as a `discriminatedUnion('version')`, with `layouts.lg` required and `md` / `sm` optional; `api/mapper.ts` maps it to domain types in `model/`. Done when tests cover valid and invalid documents, rejection of an unknown version, a widget id missing from an authored layout, and the mapper output.
- [ ] **One JSON file per dashboard.**
  - Create `public/data/dashboards/<id>.json` for sales, ops, infra and perf with `lg` layouts; add `md` / `sm` only where the reflow gets it wrong.
  - `getDashboard(id)` fetches `<id>.json`, and a 404 becomes `AppError('not_found')`.
  - `broken.json` fails the schema, and the `id === 'broken'` check in `client.ts` goes.
  - Done when every file (except `broken`) passes the schema in a test, `widget_count` in `index.json` matches each document, and `demoWidgets()` is gone.
- [ ] **`toLayouts` fills only the missing breakpoints.** Keep authored `md` / `sm` and reflow the rest. Done when `layouts.test.ts` covers an authored breakpoint and a reflowed one.
- [ ] **DataFrame and `toRows`.** Columnar `DataFrame` in `src/types/dataframe.ts`, plus `toRows(frame)`. Done when unit tests cover the field types and an empty frame.
- [ ] **Widget and datasource contracts.** `WidgetDefinition` and `DatasourceDefinition` types in the shared layer. Done when they typecheck against the four existing kinds.
- [ ] **`local-json` and `mock` datasources.** They return `DataFrame`, honour the `AbortSignal` (through `utils/wait.ts`), and the mock is seeded by range. Done when their unit tests pass and `api/demo.ts` is deleted.
- [ ] **Install `@tanstack/react-table` v9 and `@tanstack/react-virtual`.** A shared `useAppTable` from `createTableHook`, with sorting, column visibility and column sizing, and Mantine cell renderers. Done when a unit test sorts a `DataFrame`-backed table.
- [ ] **Build the table widget.**
  - Columns come from `DataFrame.fields`.
  - Rendered with Mantine `Table` (`stickyHeader`, `TableScrollContainer`), with rows virtualized inside `ScrollArea` (`viewportRef`).
  - Sortable headers are keyboard-accessible, with `aria-sort`.
  - Done when a Chrome Performance trace of scrolling 10k rows on `pnpm preview` shows no long task over 50 ms (summary in the PR), and a test sorts twice under the React Compiler without stale sort state.
- [ ] **Registry in the app layer; retire `widgetKinds.tsx`.**
  - `app/registry.ts` builds the `widgets` (`kpi`, `chart` with area / line / bar, and `table`, which replaces `regions`) and `datasources` maps with `satisfies`.
  - `DashboardRegistryProvider` passes them to the grid.
  - `broken` moves to a story or test fixture.
  - Done when a test renders `DashboardGrid` with a fake registry, every demo dashboard renders as before, and `widgetKinds.tsx` is deleted.
- [ ] **Time range in the URL.** `validateSearch` (zod) for `from` / `to` / `refresh` with defaults from the document, raw strings in the query keys, and conversion to absolute times in `queryFn`. Done when the integration test passes: changing the range refetches, the grid stays mounted and the previous data shows meanwhile.
- [ ] **Auto-refresh with one timer.** `useInterval` in the dashboard view invalidates `['ds']` every `refresh` and skips ticks while `useDocumentVisibility()` is `hidden`; the Refresh button makes the same call. Done when a fake-timer test shows one invalidation per tick, none while hidden, and none with `refresh=off`.
- [ ] **`TimeRangePicker` and `RefreshPicker`.** Built from `Combobox` with presets, a `@mantine/dates` range picker and a `Select`, placed in `Page.ControlBar` (needs Plan 04). Done when there are stories and keyboard tests.
