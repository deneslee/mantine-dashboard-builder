# Tasks: Phase 2 Dashboard Read Core

Sep 24, 2026 · v1.0.0 · Reference: [plan-03.md](../plan/plan-03.md)

- [ ] **Define versioned Dashboard Zod schema.** Implement `DashboardDocSchemaV1` in `src/features/dashboards/model/schema.ts` separating panel specifications from layout coordinates across breakpoints.
- [ ] **Build DataFrame data contract and transforms.** Create `src/shared/data/dataframe.ts` with columnar field vectors (`time`, `number`, `string`, `boolean`) and downsampling utilities (LTTB).
- [ ] **Create pluggable Widget Registry.** Build `src/features/widgets/registry.ts` with lazy chunk loading and skeleton bindings for `chart`, `table`, `kpi`, `markdown`, and `container`.
- [ ] **Create pluggable Datasource Registry.** Build `src/features/datasources/registry.ts` with `local-json` and `mock` adapters returning standardized `DataFrame` objects.
- [ ] **Implement TimeRange state and picker component.** Create `TimeRange` context provider and `TimeRangePicker` component with relative intervals (`15m`, `1h`, `24h`, `7d`), wiring time ranges into Query keys.
- [ ] **Implement virtualized Table widget.** Build table widget using `@tanstack/react-virtual` inside Mantine `ScrollArea`, handling datasets $>1,000$ rows without DOM lag.
- [ ] **Migrate demo dashboard to JSON file repository.** Convert demo dashboards into valid JSON documents conforming to `DashboardDocSchemaV1` and verify end-to-end rendering on `/dashboards/$id`.
