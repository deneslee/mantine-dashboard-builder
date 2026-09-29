# Dashboard Builder: Project Plan

Sep 22, 2026 · updated Sep 27 · @Someone

The big picture: what we're building, the decisions that are fixed, and the order of work.

- **Checklist:** [tasks.md](tasks.md): what's done, in progress and next.
- **Detailed plans:** [.agents/plans/](../.agents/plans/), one file per piece of work with its design and tasks.
- **How things work:** [shell.md](shell.md) (app chrome), [design-system.md](design-system.md) (tokens and theme), [feedback.md](feedback.md) (notifications, errors, loading), [dashboard.md](dashboard.md) (document, registries, data), [grid-and-charts.md](grid-and-charts.md) (canvas performance).
- **Rules for writing code:** [AGENTS.md](../AGENTS.md).

## What we're building

A dashboard builder: an app chrome (top navbar, docking sidebar, docking context bar) around a drag-and-resize widget canvas fed by pluggable datasources. The chrome, notifications, error and loading UI came first; the dashboard follows in phases: viewing, editing, more widgets and data, persistence, then real datasources.

## Locked decisions

| Decision    | Choice                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Backend     | None at start; every feature has `client / dto / mapper`, persistence behind a `DashboardRepository` port                      |
| Persistence | JSON files in `/data/dashboards` and `/data/templates`, localStorage holds the unsaved draft, versioned schema with migrations |
| Panel group | One `container` widget: `row` (collapsible section, first) and `grid` (nested sub-dashboard, second)                           |
| Charts      | `@mantine/charts` (Recharts) as default; the registry allows uPlot later                                                       |
| User        | Placeholder via a `CurrentUser` context, no auth                                                                               |
| Time range  | Global picker, kept in the URL and in every query key; template variables get a schema slot now, UI in phase 4                 |
| Responsive  | Desktop builder (`md+`), smaller screens view-only, layouts stored per breakpoint                                              |
| Undo/redo   | Yes: the dashboard document is one immutable slice edited via immer, `zundo` temporal middleware                               |
| Structure   | bulletproof-react layers in a single Vite app, no monorepo yet                                                                 |
| Code style  | Vercel composition patterns and react-best-practices, installed as agent skills                                                |
| Sentry      | A product feature: an Integrations area with Sentry as the first entry                                                         |

## Stack

React 19 is required by Mantine 9, so all React 19 APIs (`ref` as prop, `use()`, `Activity`, `useEffectEvent`) are fair game. The React Compiler is on.

| Area    | Package                                                                                   | Notes                                                        |
| ------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Build   | Vite 8, TypeScript strict, pnpm                                                           | tsconfig paths are native in Vite 8                          |
| UI      | `@mantine/core` 9.6.2, `hooks`, `notifications`, `modals`, `dates`, `charts`, `spotlight` | Spotlight drives the navbar search; `postcss-preset-mantine` |
| Fonts   | Fontsource (Inter, JetBrains Mono)                                                        | Self-hosted, no runtime requests to Google                   |
| Routing | `@tanstack/react-router`                                                                  | File-based routes, `staticData` declares context-bar tabs    |
| Data    | `@tanstack/react-query`                                                                   | One `QueryClient`                                            |
| State   | `zustand` + `immer` + `zundo`                                                             | Shell store (persisted) and dashboard store (temporal)       |
| Grid    | `react-grid-layout` 2.x                                                                   | v2 API only, never `/legacy`                                 |
| Schemas | `zod`                                                                                     | Dashboard, widget options, datasource config, DTOs           |
| Tables  | `@tanstack/react-table` v9 + `@tanstack/react-virtual`                                    | Rendered with Mantine `Table`                                |
| Later   | `@xyflow/react`, `react-markdown`                                                         | Each a lazy chunk                                            |
| Icons   | `@tabler/icons-react`                                                                     | Direct file imports, no barrel                               |
| Tooling | Storybook, Vitest + Testing Library, oxlint + Stylelint, Prettier; Playwright later       | Storybook covers every chrome state                          |

## Project structure

The current layout and its rules are in [AGENTS.md › Structure](../AGENTS.md#structure-bulletproof-react-lightly-adapted). Planned features slot in like this:

```text
src/
  app/             routes/, providers, router, query client, registry.ts; the only place features meet
  features/
    dashboards/    model/, api/, components/ (grid; later the editor)
    widgets/       one feature per widget type (kpi, chart, table; later header, container, markdown, nodes)
    datasources/   one feature per adapter (local-json, mock; later csv, api)
    templates/  import-export/  settings/  notifications/  debug/  integrations/
  components/      errors/, feedback/ (skeletons), layouts/shell/, navigation/
  hooks/  lib/ (notify, AppError, user, sentry)  stores/  config/  types/ (DataFrame, widget contracts)  utils/  testing/
  design-system/   tokens/, theme/, components/ (Page)
public/data/       dashboards/*.json, templates/*.json
```

The shared layer and `design-system/` never import from `features/` or `app/` (oxlint enforces). That keeps them movable to `packages/` if a monorepo (pnpm + Turborepo) is ever needed: a second app, a backend in the repo, or publishable packages.

## Roadmap

Each phase ends with Storybook stories, tests and a short review against the coding rules. Plans are numbered in build order; some belong to a phase, others cut across phases. Status per item is in [tasks.md](tasks.md).

| Phase              | Scope                                                                                                                                                                         | Done when                                                                   | Plans                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 0 Scaffold         | Vite, React 19, Mantine 9.6.2, router, query, zustand, oxlint / Stylelint / Prettier, Storybook, Vitest, `AGENTS.md`, Vercel skills                                           | `pnpm dev`, `storybook`, `test`, `lint` all green on an empty shell         | Done Sep 22                                                                                                  |
| 1 Chrome           | Design system, `Panel`, top navbar, sidebar, context bar, notifications, error UI, loading UI, placeholder routes                                                             | Every chrome state has a story; keyboard and outside-click behaviour tested | Done Sep 22                                                                                                  |
| 2 Dashboard read   | Versioned JSON documents, `DataFrame`, widget and datasource registries (`kpi`, `chart`, `table`; `local-json`, `mock`), read-only grid, time range in the URL, page header   | A JSON dashboard renders with live queries and skeletons                    | Done Sep 27: [04](../.agents/plans/done/04-page-header.md), [05](../.agents/plans/done/05-dashboard-read.md) |
| 3 Dashboard edit   | Dashboard store with immer + zundo, drag and resize, palette in the context bar, widget options editor, save to draft, export JSON                                            | Round-trip: edit, undo, export, import identical                            | Not planned yet                                                                                              |
| 4 Widgets and data | `container` (row, then grid), `header`, `markdown`, `nodes`, `csv` datasource, datasource manager, templates gallery, variables UI, CSV/JSON data export, nested layer tokens | A template creates a working dashboard in two clicks                        | Not planned yet                                                                                              |
| 5 Persistence      | `HttpRepository` behind the port, MSW-backed API, autosave, conflict toast                                                                                                    | Switching repository is a one-line provider change                          | Not planned yet                                                                                              |
| 6 Real datasources | Backend proxy (`apps/api`, Hono), Datadog, Azure SQL, AWS and Haystack adapters; secrets never in the browser                                                                 | Each adapter passes `test(config)` and a Playwright smoke test              | Not planned yet                                                                                              |

**Cross-cutting plans:** [01 Shell performance](../.agents/plans/done/01-shell-performance.md), [02 Project structure](../.agents/plans/done/02-project-structure.md) and [03 Design tokens](../.agents/plans/done/03-design-tokens.md) are done; [06 Sentry](../.agents/plans/06-sentry.md) is open.

**Changes from the Sep 22 plan:**

- Mantine `Splitter` replaced `AppShell` and the custom resize handle.
- oxlint replaced ESLint; a local plugin adds the style rules.
- bulletproof-react layers replaced the light feature folders (02).
- The time range lives in the URL, and the registries are static maps built in `app/` instead of `registerWidget()` calls (05).
- The color scheme is applied by an inline script in `index.html` before first paint.
- Phase 6 was called "Integrations"; it's renamed "Real datasources" so it isn't confused with the Integrations area (06).

## Open questions and risks

| Item                                | Why it matters                                                           | Default if undecided                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Nested RGL inside `container: grid` | Two grids capturing the same pointer events; RGL has no official nesting | Ship `row` first; prototype nesting in phase 4 with `dragConfig.cancel` and a spike story |
| Recharts with large series          | Recharts slows past ~10k points                                          | Downsample in the datasource (LTTB); add a uPlot widget only if needed                    |
| Search scope                        | Spotlight over dashboards only, or also widget contents and datasources  | Dashboards and routes now; widgets in phase 3                                             |
| Nav select semantics                | Area switcher vs. workspace or tenant switcher                           | Area switcher; rename if tenants arrive                                                   |
| Undo scope                          | Undo for layout only, or also options and datasource edits               | The whole document; `timeRange` and selection excluded from the temporal slice            |

Sources: [react-grid-layout releases](https://github.com/react-grid-layout/react-grid-layout/releases), [Mantine changelog](https://mantine.dev/changelog/all-releases/), [Vercel composition patterns](https://github.com/vercel-labs/agent-skills/blob/main/skills/composition-patterns/SKILL.md), [Vercel react-best-practices](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md).
