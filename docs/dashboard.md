# Dashboard

How a dashboard is stored, drawn and fed with data, from phase 2 (read) to phase 6 (real datasources). Phase 2 is detailed in [05-dashboard-read](../.agents/plans/05-dashboard-read.md); the canvas performance rules are in [grid-and-charts.md](grid-and-charts.md).

The dashboard is one versioned JSON document. Widgets and datasources are plugins registered by type, and `DataFrame` is the only contract between them.

## Model

```text
DashboardDocV1 { version: 1, id, title, description,
                 timeRange: { from, to },     raw strings, e.g. now-24h
                 refresh?,                    off, 30s, 1m, …
                 variables: VariableDef[],    schema reserved, UI in phase 4
                 widgets: Record<id, { type, title, options, queries: Query[] }>,
                 layouts: { lg: Item[], md?: Item[], sm?: Item[] } }      Item = { i, x, y, w, h }
Query          { id, datasourceId, spec (zod per datasource), transforms }
DataFrame      { name?, length, fields: { name, type: 'time' | 'number' | 'string' | 'boolean', values, config? }[] }
```

- `lg` is required; a missing `md` or `sm` layout is reflowed from it in reading order.
- The UI never sees the document: `api/mapper.ts` turns it into the domain types in `model/`.
- A `container` widget (phase 4) holds child widgets and their own layout.

## How it works

| Concern             | Approach                                                                                                                                                                                                                                                                                                       | Phase |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Document            | zod schema in `api/dto.ts`, `discriminatedUnion('version')`; no migration engine until there is a v2                                                                                                                                                                                                           | 2     |
| Files               | `public/data/dashboards/index.json` (summaries) and one `<id>.json` per dashboard                                                                                                                                                                                                                              | 2     |
| Widget registry     | `WidgetDefinition { type, name, icon, defaultSize, optionsSchema, component: lazy, skeleton }`, plus `editor: lazy` in phase 3. Types: `kpi`, `chart`, `table` (2); `header`, `container` (`row`, then `grid`), `markdown`, `nodes` (4)                                                                        | 2, 4  |
| Datasource registry | `DatasourceDefinition { type, name, query(spec, ctx, signal) → DataFrame, test?(config) }`, plus config and query schemas and an editor with the datasource manager. `local-json`, `mock` (2); `csv` (4); Azure SQL, Datadog, AWS, Haystack behind an HTTP proxy adapter (6)                                   | 2–6   |
| Registration        | Static maps in `app/registry.ts`, handed to the grid through `DashboardRegistryProvider`. No `registerWidget()` side effects, and `features/dashboards` never imports a widget or datasource                                                                                                                   | 2     |
| Fetching            | Keys `['ds', datasourceId, hash(spec), { from, to }]` with the raw range strings, resolved to absolute times in `queryFn`; abort on unmount. One `useInterval` invalidates `['ds']` every `refresh`, paused while the tab is hidden                                                                            | 2     |
| Time range          | Route search params (`?from=now-24h&to=now&refresh=1m`) validated with zod; the document gives the defaults. Shareable, and back and forward work                                                                                                                                                              | 2     |
| Grid                | RGL v2 `GridLayout` with `useContainerWidth` and an explicit layout per breakpoint, read-only in phase 2. Phase 3 adds `dragConfig.handle` on the widget header, `resizeConfig` handle `se`, `constraintEnforcer` for min sizes, `fastVerticalCompactor` above 100 widgets and `isDroppable` for palette drops | 2, 3  |
| Store               | Zustand slice holding the document, `immer` for edits, `zundo` for undo/redo (`limit: 50`, the whole document minus `timeRange` and selection), a `dirty` flag; selectors per widget id, so a change re-renders one tile                                                                                       | 3     |
| Editing             | Widget palette in the context bar, the selected widget's options editor as a context tab, a datasource manager route, a template gallery route                                                                                                                                                                 | 3, 4  |
| Nested grid         | An inner RGL inside a `container` widget, with `dragConfig.cancel` on the inner grid so the outer drag doesn't capture it; inner layouts stored on the child widget; nested layer tokens for the surfaces                                                                                                      | 4     |
| Persistence         | `DashboardRepository { list, load, save, remove }` port: JSON files for reading, a localStorage draft plus an Export action for writing; `HttpRepository` later                                                                                                                                                | 3, 5  |
| Import / export     | Dashboard JSON (with `version`, migrations run on import), widget data as CSV or JSON from the `DataFrame`, templates as dashboard JSON with `template: true` and no datasource config                                                                                                                         | 3, 4  |

## Performance rules for the canvas

- Every widget type, datasource adapter, editor tab and heavy library (`@xyflow/react`, `react-markdown`) is a lazy chunk; the palette preloads a widget's chunk on hover.
- Tiles are keyed by widget id, and no component is defined inside `map`.
- Widgets and layouts are indexed by id in the store.
- Registries are built once at boot; RGL callbacks read the latest values through a ref.
- Drag and resize positions stay in refs and commit on pointer-up.
- Tiles below the fold get `content-visibility: auto`; hidden context tabs and collapsed rows render inside `Activity`.

References: [Perses](https://github.com/perses/perses) for spec-as-code and the plugin model, [Grafana](https://github.com/grafana/grafana) for `DataFrame` and the panel editor, [Kibana](https://github.com/elastic/kibana) for the embeddable / container pattern.
