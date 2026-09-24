# Research: Table Library for the Table Widget

Sep 24, 2026 · Reference: [plan-03.md](../plan-03.md)

Question: add `@tanstack/react-table`, use something else, or only Mantine `Table`?

---

## Options

| Option | Status (Sep 2026) | Fit |
|---|---|---|
| **Mantine `Table` only** | Part of 9.6.2 (`Table`, `TableScrollContainer`, `stickyHeader`) | Renders only: no sorting, column state or sizing. Sorting and column logic would be hand-written, which is the custom code we're trying to avoid. |
| **`@tanstack/react-table` v9 + Mantine `Table`** | **v9 stable since Aug 4, 2026**; `9.2.4` published Aug 28, 2026; ~20M downloads/week | Headless: logic only, no styles. Features are **tree-shakable** (`tableFeatures({...})`), so the bundle only includes what's used. Built on TanStack Store; **documented as working under the React Compiler**. `createTableHook` makes one preset hook for the whole app. **Recommended.** |
| `@tanstack/react-table` v8 | Maintenance | Bundles all features. Known friction with the React Compiler, which this repo has enabled. No reason to start a new widget on it. |
| mantine-react-table (MRT) | The official package targets older Mantine. Mantine 9 support exists only in **unofficial forks** (`mantine-react-table-open` 9.0.x, `uponusolutions/…`, `kastov/…`), built on **Table v8** | Complete, but it's a large opinionated UI with its own toolbar and styles, running on v8 internals, and it depends on which fork survives. It clashes with our tokens (Plan 04) and with the "Mantine first, thin wrappers" rule. |
| AG Grid / Glide / others | Commercial or canvas based | Far too heavy for dashboard tiles, and none of our theming reaches them. |

## Decision
TanStack Table v9 for the logic, Mantine `Table` for rendering, `@tanstack/react-virtual` for rows. All three are headless or ours, so tokens, dark mode and `Paper`/`data-layer` surfaces apply unchanged.

## Notes for implementation
* **v9 API:** `useTable` (not `useReactTable`), plus a required `features` option. `stockFeatures` exists, but don't use it; it brings back the v8-sized bundle.
* **One preset for the app:** `createTableHook` gives a single `useAppTable` with the feature set and Mantine cell renderers preset.
* **Column data:** a `DataFrame` is columnar, so the accessor for column `j` reads `fields[j].values[rowIndex]` and there is no row-object step.
* **Accessibility:** sortable headers are `UnstyledButton` inside `Table.Th`, with `aria-sort` on the `th`.
* **Virtualization:** keep the header outside the virtualized body (Mantine `stickyHeader`). Use the `ScrollArea` viewport as the virtualizer's scroll element.

## Sources
- https://tanstack.com/blog/announcing-tanstack-table-v9
- https://tanstack.com/table/v9/docs/framework/react/guide/migrating
- https://www.npmjs.com/package/@tanstack/react-table
- https://registry.npmjs.org/mantine-react-table-open
- https://github.com/uponusolutions/mantine-react-table
