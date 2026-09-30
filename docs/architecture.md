# Architecture

How the app is put together today: the stack, the layers, how a dashboard's data flows, and where each kind of state lives. The coding rules are in [AGENTS.md](../AGENTS.md); what comes next is in [.agents/planning/](../.agents/planning/roadmap.md).

Plan [08](../.agents/planning/plans/08-structure-cleanup.md) is moving the code into package-shaped folders (`app`, `features`, `plugins`, `shell`, `core`, `ui`, `lib`). This page describes the layout until that lands, and is rewritten when it does.

## Stack

Mantine 9 needs React 19.2+, so all React 19 APIs (`ref` as prop, `use()`, `Activity`, `useEffectEvent`) are fair game. The React Compiler is on.

| Area    | Package                                                                                   | Notes                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Build   | Vite 8, TypeScript strict, pnpm                                                           | tsconfig paths are native in Vite 8                                                                                                              |
| UI      | `@mantine/core` 9.6.3, `hooks`, `notifications`, `modals`, `dates`, `charts`, `spotlight` | Spotlight drives the navbar search; `postcss-preset-mantine`                                                                                     |
| Fonts   | Fontsource variable fonts: DM Sans, Source Sans 3, Source Code Pro, JetBrains Mono        | Self-hosted, no runtime requests to Google                                                                                                       |
| Routing | `@tanstack/react-router`                                                                  | File-based routes, `staticData` declares context-bar tabs and breadcrumbs                                                                        |
| Data    | `@tanstack/react-query`                                                                   | One `QueryClient`                                                                                                                                |
| State   | `zustand` + `immer` + `zundo`                                                             | Shell store (persisted) and one dashboard store per open dashboard (undo history)                                                                |
| Grid    | `react-grid-layout` 2.x                                                                   | v2 API only, never `/legacy`                                                                                                                     |
| Schemas | `zod`                                                                                     | Dashboard document, widget options, datasource query specs, search params                                                                        |
| Tables  | `@tanstack/react-table` v9 + `@tanstack/react-virtual`                                    | Rendered with Mantine `Table`                                                                                                                    |
| Later   | `@xyflow/react`, `react-markdown`                                                         | Each a lazy chunk                                                                                                                                |
| Icons   | `@tabler/icons-react`                                                                     | Direct file imports, no barrel                                                                                                                   |
| Tooling | Storybook, Vitest + Testing Library, oxlint + Stylelint, Prettier                         | Three Vitest projects: `node` (pure logic), `dom` (jsdom) and `storybook` (every story in Chromium with an a11y check, play functions for flows) |

## Layers

Imports go one way, from the bottom up; oxlint enforces it ([AGENTS.md › Structure](../AGENTS.md#structure-bulletproof-react-lightly-adapted)).

```text
app/            routes, providers, router, query client, registry.ts (widget and datasource plugins)
  │             the only place features meet
features/       dashboards  widgets  datasources  settings  integrations  notifications  debug
  │             never import each other
shared          components/ (errors, feedback, shell)  hooks/  lib/ (notify, AppError, sentry, user)
  │             stores/ (inbox)  config/  types/ (DataFrame, plugin contracts)  utils/  testing/
design-system/  tokens, Mantine theme, Page
```

Nothing below `app/` imports from above it, which keeps the lower folders movable to `packages/` when a monorepo (pnpm + Turborepo) arrives: a second app, a backend in the repo, or publishable packages.

## Dashboard data flow

```text
URL /dashboards/$id?mode&from&to&refresh ── validateSearch (zod)
  loader: ensureQueryData(dashboardQuery(id))
    getDashboard(id): local saved copy ?? fetch public/data/dashboards/<id>.json
      → zod parse (api/dto.ts) → toDashboard (api/mapper.ts) → Query cache ['dashboards', id]
DashboardProvider key=id → createDashboardStore(dashboard)      restores a draft if there is one
DashboardView → range = edit mode ? store range : URL ?? document range
  DashboardGrid → layouts per breakpoint; drag or resize stop → commitLayout (one undo step)
    WidgetTile(id) → widget from the store, plugin from DashboardRegistryContext
      useQuery(widgetDataQuery(queries, range)) once the tile is near the viewport
        → resolveRange → datasource.query(spec, ctx) → DataFrame[]
      WidgetBoundary → <widget.component frames options />

Save    store.save → repository.save → localStorage saved copy → new baseline, draft cleared
        → setQueryData(['dashboards', id]) and the list invalidated
Draft   every document change: dirty ? write draft : clear draft
Export  current document → <id>.json;  Import  JSON → zod → plugin checks → importDocument
```

Widget data is cached per widget (`['ds', queries, range]`); auto-refresh and the Refresh button invalidate `['ds']`. How the canvas stays fast is in [grid-and-charts.md](dashboard/grid-and-charts.md); the document model is in [dashboard.md](dashboard/dashboard.md).

## Where state lives

| State                                                            | Owner                                                         | Mounted                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------ |
| Dashboard list, documents, widget data                           | TanStack Query                                                | `app/Providers`                      |
| Time range, refresh, `mode`, `widget`, `editor`, settings tab    | URL search params, validated with zod                         | routes                               |
| Document being edited, saved baseline, undo history, editor tool | per-dashboard zustand store (`DashboardProvider`)             | `routes/dashboards/$id`, keyed by id |
| Sidebar and context bar layout                                   | shell zustand store (`ShellProvider`)                         | `routes/__root`                      |
| Widget and datasource plugins                                    | `DashboardRegistryContext`, filled from `app/registry.ts`     | `routes/dashboards/$id`              |
| Inbox                                                            | global zustand store (`stores/inbox.ts`), written by `notify` | module                               |
| Color scheme, motion                                             | Mantine color-scheme manager, `useMotion`                     | `app/Providers`                      |
| Everything else                                                  | component state                                               | –                                    |

## Browser storage

| Key                       | Holds                                                                  |
| ------------------------- | ---------------------------------------------------------------------- |
| `shell.v1`                | Sidebar and context bar layout (zustand persist)                       |
| `notifications.v1`        | Inbox items (zustand persist)                                          |
| `motion.v1`               | Reduced-motion preference                                              |
| `color-scheme`            | Light, dark or auto; also read by the pre-paint script in `index.html` |
| `dashboard.saved.v1:<id>` | A saved dashboard, which overrides the static file                     |
| `dashboard.draft.v1:<id>` | Unsaved edits and the baseline they started from                       |
| `sentry.config.v1`        | Sentry prototype settings                                              |

Plan [08](../.agents/planning/plans/08-structure-cleanup.md) renames these to `dashboard-builder:<name>` with the version inside the value.
