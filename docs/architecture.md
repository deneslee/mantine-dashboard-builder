# Architecture

How the app is put together today: the stack, the layers, how a dashboard's data flows, and where each kind of state lives. The coding rules are in [AGENTS.md](../AGENTS.md); what comes next is in [.agents/planning/](../.agents/planning/roadmap.md).

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

Imports go one way, from the bottom up; oxlint enforces it ([AGENTS.md › Structure](../AGENTS.md#structure)).

```text
app/        routes  Providers  router  queryClient  plugins.ts  nav.ts
  │         the only place features and the built-in plugins meet
features/   dashboards  settings  notifications  integrations  debug
  │         never import each other; widgets and datasources come from usePlugins()
shell/      the app frame: Shell, ShellProvider, useShell, navbar, sidebar, context bar
plugins/    WidgetPlugin and DatasourcePlugin contracts, usePlugins; widgets/*, datasources/*
lib/        notify (toasts and the inbox), sentry, useMotion, useCurrentUser
ui/         tokens, the Mantine theme, generic components (Page, ErrorState, QueryBoundary, Skeletons)
core/       plain TypeScript: dashboard schema and layout, time ranges, DataFrame, AppError
utils/      wait
testing/    render, TestRouter, AppStory: for tests and stories only
```

Each top-level folder is shaped like a package, so it can move to `packages/` when a monorepo (pnpm + Turborepo) arrives: a second app, a backend in the repo, or publishable packages. oxlint holds each folder to the layers below it (`oxlint.config.ts`), and `lint/rules.test.ts` proves every rule fires.

## Dashboard data flow

```text
URL /dashboards/$id?mode&from&to&refresh ── validateSearch (zod)
  beforeLoad: on entry, a stored draft and no ?mode=edit → redirect to ?mode=edit
  loader: ensureQueryData(dashboardQuery(id))
    dashboardApi: saved copy (localStorage) ?? fetch public/data/dashboards/<id>.json
      → storedDashboardSchema (migrateDashboard → dashboardSchema) → Dashboard → Query cache ['dashboards', id]
DashboardProvider key=id → createDashboardStore(dashboard)      restores a draft if there is one
DashboardPage → isEditing = ?mode=edit; range = isEditing ? store range : URL ?? document range
  DashboardGrid → layouts per breakpoint; drag or resize stop → commitLayout (one undo step)
    WidgetTile(id) → widget from the store, plugin from usePlugins()
      useQuery(widgetDataQuery(queries, range)) once the tile is near the viewport
        → resolveRange → DatasourcePlugin.query(spec, ctx) → DataFrame[]
      QueryBoundary → <plugin.component frames options />

Save    store.save → saveDashboard (data/dashboardApi.ts) → localStorage saved copy → new baseline, draft cleared
        → setQueryData(['dashboards', id]) and the list invalidated
Draft   every document change: isDirty ? write draft : clear draft
Export  orderWidgets(dashboard) → <id>.json;  Import  JSON → storedDashboardSchema → plugin checks → importDocument
```

Widget data is cached per widget (`['ds', queries, range]`); auto-refresh and the Refresh button invalidate `['ds']`. How the canvas stays fast is in [grid-and-charts.md](dashboard/grid-and-charts.md); the document model is in [dashboard.md](dashboard/dashboard.md).

## Where state lives

| State                                                            | Owner                                                                | Mounted                              |
| ---------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------ |
| Dashboard list, documents, widget data                           | TanStack Query                                                       | `app/Providers`                      |
| Time range, refresh, `mode`, `widget`, `editor`, settings tab    | URL search params, validated with zod                                | routes                               |
| Document being edited, saved baseline, undo history, editor tool | per-dashboard zustand store (`DashboardProvider`)                    | `routes/dashboards/$id`, keyed by id |
| Sidebar and context bar layout; the app's nav and global tabs    | shell zustand store and static values (`ShellProvider`)              | `routes/__root`                      |
| Widget and datasource plugins                                    | `PluginsContext`, filled from `app/plugins.ts`                       | `app/Providers`                      |
| Inbox                                                            | global zustand store (`lib/notify/useInbox.ts`), written by `notify` | module                               |
| Color scheme, motion                                             | Mantine color-scheme manager, `useMotion`                            | `app/Providers`                      |
| Everything else                                                  | component state                                                      | –                                    |

`app/Providers` is the only provider stack: the app, `testing/render` and the Storybook preview all use it.

## Browser storage

Every key is `storageKey(name)` from `lib/storage.ts`: `dashboard-builder:<name>`, because the GitHub Pages origin is shared with other projects.

| Key (`dashboard-builder:` + …) | Holds                                                                  |
| ------------------------------ | ---------------------------------------------------------------------- |
| `shell`                        | Sidebar and context bar layout (zustand persist, `version` 2)          |
| `notifications`                | Inbox items (zustand persist, `version` 2)                             |
| `motion`                       | Reduced-motion preference                                              |
| `color-scheme`                 | Light, dark or auto; also read by the pre-paint script in `index.html` |
| `saved:<id>`                   | A saved dashboard (with `schemaVersion`), which overrides the file     |
| `draft:<id>`                   | Unsaved edits and the baseline they started from                       |
| `sentry`                       | Sentry prototype settings (plan 06 deletes them)                       |

No key carries a version; each value does: zustand persist's `version` with a `migrate`, and a dashboard's `schemaVersion`. The keys from before Oct 2026 (`shell.v1`, `dashboard.saved.v1:<id>`, …) move to these names when `lib/storage.ts` is first evaluated, before any store hydrates; that code goes after 2027-01.
