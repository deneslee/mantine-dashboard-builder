# Dashboard Builder: Project Plan

Sep 22, 2026 · updated Sep 30 · @Someone

The big picture: what we're building, the decisions that are fixed, and the order of work.

- **Checklist:** [tasks.md](tasks.md): what's done, in progress and next.
- **Detailed plans:** [.agents/plans/](../../.agents/plans/), one file per piece of work with its design and tasks. The research behind them is in [.agents/plans/research/](../../.agents/plans/research/).
- **How things work:** [shell.md](../ui/shell.md) (app chrome), [design-system.md](../ui/design-system.md) (tokens and theme), [feedback.md](../ui/feedback.md) (notifications, errors, loading), [dashboard.md](../dashboard/dashboard.md) (document, registries, data), [grid-and-charts.md](../dashboard/grid-and-charts.md) (canvas performance).
- **Rules for writing code:** [AGENTS.md](../../AGENTS.md).

## What we're building

A dashboard builder: an app chrome (top navbar, docking sidebar, docking context bar) around a drag-and-resize widget canvas fed by pluggable datasources. The chrome, notifications, error and loading UI came first; the dashboard follows in phases: reading (done), editing and viewing tools, more widgets and data, persistence, then real datasources.

Anything that connects to an outside service is an integration: a datasource such as Azure SQL or Datadog, or telemetry such as Sentry. Integrations are off by default and load only when a deployment enables them, so a fresh install reads local files only.

## Locked decisions

| Decision | Choice |
| --- | --- |
| Backend | None at start; every feature has `client / dto / mapper`, persistence behind a `DashboardRepository` port |
| Persistence | JSON files in `/data/dashboards` and `/data/templates`, localStorage holds the unsaved draft, versioned schema with migrations |
| Layout | Blocks: grid, collapsible row and tabs (tabs may hold rows), each grid its own react-grid-layout; no `container` widget ([07](../../.agents/plans/07-dashboard-model.md)) |
| Charts | `@mantine/charts` (Recharts) as default; the registry allows uPlot later |
| User | Placeholder via a `CurrentUser` context, no auth |
| Time range | Scoped: dashboard → section → widget, each inheriting unless it sets its own, with a time zone and one shared `now` per refresh. Viewers change it in the URL; edit mode saves it. Template variables: schema slot now, UI in phase 4 ([07](../../.agents/plans/07-dashboard-model.md)) |
| Responsive | Desktop builder (`md+`), smaller screens view-only, layouts stored per breakpoint |
| Undo/redo | Yes: the dashboard document is one immutable slice edited via immer, `zundo` temporal middleware; one undo step per user action (a drag, a resize, a menu action, a field on blur) ([07](../../.agents/plans/07-dashboard-model.md#3-modes)) |
| Structure | bulletproof-react layers in a single Vite app, no monorepo yet |
| Code style | Vercel composition patterns and react-best-practices, installed as agent skills |
| Integrations | A static registry in `app/registry.ts`: each integration (datasource, telemetry or both) is a lightweight manifest, with its config, runtime and setup code in chunks loaded only when a deployment enables it through a config read at load (a JSON file, later the API). Default: none. First load stays within a bundle budget. Not feature flags ([research](../../.agents/plans/research/integrations.md)) |
| Sentry | The first telemetry integration, in the product's Integrations area |
| Context bar | Help, general information and notifications; tools such as Inspect open in right-side drawers ([07](../../.agents/plans/07-dashboard-model.md)) |
| Navigation | Navbar area picker (may become a workspace or tenant switcher), sidebar with Favorites and Recent, breadcrumbs; app-level tabs later ([07](../../.agents/plans/07-dashboard-model.md)) |

## Stack

Mantine 9 needs React 19.2+, so all React 19 APIs (`ref` as prop, `use()`, `Activity`, `useEffectEvent`) are fair game. The React Compiler is on.

| Area | Package | Notes |
| --- | --- | --- |
| Build | Vite 8, TypeScript strict, pnpm | tsconfig paths are native in Vite 8 |
| UI | `@mantine/core` 9.6.3, `hooks`, `notifications`, `modals`, `dates`, `charts`, `spotlight` | Spotlight drives the navbar search; `postcss-preset-mantine` |
| Fonts | Fontsource (Inter, JetBrains Mono) | Self-hosted, no runtime requests to Google |
| Routing | `@tanstack/react-router` | File-based routes, `staticData` declares context-bar tabs |
| Data | `@tanstack/react-query` | One `QueryClient` |
| State | `zustand` + `immer` + `zundo` | Shell store (persisted) and dashboard store (temporal) |
| Grid | `react-grid-layout` 2.x | v2 API only, never `/legacy` |
| Schemas | `zod` | Dashboard, widget options, datasource config, DTOs |
| Tables | `@tanstack/react-table` v9 + `@tanstack/react-virtual` | Rendered with Mantine `Table` |
| Later | `@xyflow/react`, `react-markdown` | Each a lazy chunk |
| Icons | `@tabler/icons-react` | Direct file imports, no barrel |
| Tooling | Storybook, Vitest + Testing Library, oxlint + Stylelint, Prettier; browser tests from phase 3 (Storybook's Vitest addon or Playwright) | Storybook covers every chrome state |

## Project structure

The current layout and its rules are in [AGENTS.md › Structure](../../AGENTS.md#structure-bulletproof-react-lightly-adapted). Planned features slot in like this:

```text
src/
  app/             routes/, providers, router, query client, registry.ts (widgets, datasources, integrations); the only place features meet
  features/
    dashboards/    model/, api/, components/ (grid; later the editor)
    widgets/       one feature per widget type (kpi, chart, table; later header, markdown, nodes)
    datasources/   one feature per adapter (local-json, mock; later csv, api)
    integrations/  the /integrations catalog, and each integration's Setup page and config schema (sentry; later datadog, azure-sql, …)
    templates/  import-export/  settings/  notifications/  debug/
  components/      errors/, feedback/ (skeletons), layouts/shell/, navigation/
  hooks/  lib/ (notify, AppError, user, sentry)  stores/  config/  types/ (DataFrame, widget contracts)  utils/  testing/
  design-system/   tokens/, theme/, components/ (Page)
public/data/       dashboards/*.json, templates/*.json
public/config/     integrations.json: which integrations a deployment enables (none by default)
```

The shared layer and `design-system/` never import from `features/` or `app/` (oxlint enforces). That keeps them movable to `packages/` if a monorepo (pnpm + Turborepo) is ever needed: a second app, a backend in the repo, or publishable packages.

## Roadmap

Each phase ends with Storybook stories, tests and a short review against the coding rules. Plans are numbered in build order; some belong to a phase, others cut across phases. Status per item is in [tasks.md](tasks.md).

**Order (Sep 30).** Phase 3 starts with the edit MVP ([07](../../.agents/plans/07-dashboard-model.md) stages 1 and 2), then the viewing tools (stage 3). 06 Sentry's error reporting and source maps follow, then the Integrations foundation, which must be in before Sentry becomes an integration (06 §3) and before phase 4's datasource manager offers integrations. Phases 4 to 6 each add their part.

| Phase | Scope | Done when | Plans |
| --- | --- | --- | --- |
| 0 Scaffold | Vite, React 19, Mantine 9.6.2, router, query, zustand, oxlint / Stylelint / Prettier, Storybook, Vitest, `AGENTS.md`, Vercel skills | `pnpm dev`, `storybook`, `test`, `lint` all green on an empty shell | Done Sep 22 |
| 1 Chrome | Design system, `Panel`, top navbar, sidebar, context bar, notifications, error UI, loading UI, placeholder routes | Every chrome state has a story; keyboard and outside-click behaviour tested | Done Sep 22 |
| 2 Dashboard read | Versioned JSON documents, `DataFrame`, widget and datasource registries (`kpi`, `chart`, `table`; `local-json`, `mock`), read-only grid, time range in the URL, page header | A JSON dashboard renders with live queries and skeletons | Done Sep 27: [04](../../.agents/plans/done/04-page-header.md), [05](../../.agents/plans/done/05-dashboard-read.md) |
| 3 Dashboard edit | Edit MVP first: dashboard store, widget header and menu, edit mode with Save, Discard, Undo and Redo, drag and resize, menu alternatives to dragging, add widget, draft, export JSON. Then viewing: one cache entry per datasource query, scoped time with a time zone, per-widget time, one widget full screen, the Inspect drawer, density | Round-trip: edit, undo, export, import identical; one drag is one undo step; every widget action works by keyboard | [07](../../.agents/plans/07-dashboard-model.md) stages 1–3 |
| Integrations | Integration manifests in `app/registry.ts` (datasource and telemetry entries), a config port reading `public/config/integrations.json`, config, runtime and setup chunks loaded only for enabled entries, the `/integrations` catalog and Setup pages on `Page` and tokens. Sentry is the first entry ([06](../../.agents/plans/06-sentry.md) §3) | A build with the default config fetches no integration chunk and stays within the bundle budget; enabling Sentry in the config of the same build loads it | Not planned yet; after 06 §1–2 |
| 4 Widgets and data | Layout blocks (rows, then tabs) and document v2, `header`, `markdown`, `nodes`, `csv` datasource, datasource manager (built-in types plus those of enabled integrations), variables by reference, query resolution from the layout, hover sync groups, errors grouped per datasource, templates gallery, CSV/JSON data export | A template creates a working dashboard in two clicks | [07](../../.agents/plans/07-dashboard-model.md) stage 4 |
| 5 Persistence | `HttpRepository` behind the port, an MSW-backed API (a mock until the backend is chosen), a `revision` field for conflict checks, autosave, conflict toast; integration config read from the API | Switching repository is a one-line provider change | Not planned yet |
| 6 Real datasources | The backend (open decision); Datadog, Azure SQL, AWS and Haystack as datasource integrations, their config and secrets in the proxy, never in the browser | Each adapter passes `test(config)` and a Playwright smoke test | Not planned yet |

**Cross-cutting plans:** [01 Shell performance](../../.agents/plans/done/01-shell-performance.md), [02 Project structure](../../.agents/plans/done/02-project-structure.md) and [03 Design tokens](../../.agents/plans/done/03-design-tokens.md) are done; [07 Dashboard model](../../.agents/plans/07-dashboard-model.md) is next: the dashboard design for phases 3 and 4, edit MVP first. [06 Sentry](../../.agents/plans/06-sentry.md) is paused until 07 stage 3; Sentry becomes an integration once the foundation is in.

**Changes from the Sep 22 plan:**

- Mantine `Splitter` replaced `AppShell` and the custom resize handle.
- oxlint replaced ESLint; a local plugin adds the style rules.
- bulletproof-react layers replaced the light feature folders (02).
- The time range lives in the URL, and the registries are static maps built in `app/` instead of `registerWidget()` calls (05).
- The color scheme is applied by an inline script in `index.html` before first paint.
- Phase 6 was called "Integrations"; it's renamed "Real datasources" so it isn't confused with the Integrations area (06).
- Sep 29: integrations get their own registry and config, and Sentry becomes its first entry instead of a feature of its own. They're enabled by config, not feature flags ([research](../../.agents/plans/research/integrations.md)).
- Sep 29: the time range is scoped (dashboard → section → widget) instead of global; layout blocks replace the `container` widget; the context bar is for help and general information, and Inspect is a right-side drawer ([07](../../.agents/plans/07-dashboard-model.md)).
- Sep 30: the edit MVP moves ahead of 06 Sentry and the Integrations foundation. After a review: queries are cached one entry per datasource query, the time model gets a time zone, undo steps follow user actions, Sentry reports query errors from the query cache, and integration manifests are split from their code ([07](../../.agents/plans/07-dashboard-model.md), [06](../../.agents/plans/06-sentry.md)).

## Open questions and risks

| Item | Why it matters | Default if undecided |
| --- | --- | --- |
| Recharts with large series | Recharts slows past ~10k points | Aggregate in the datasource to the widget's resolution; reduce points (LTTB) only for drawing; add a uPlot widget only if needed |
| Search scope | Spotlight over dashboards only, or also widget contents and datasources | Dashboards and routes now; widgets in phase 3 |
| Undo scope | Undo for layout only, or also options and datasource edits | The whole document; `timeRange` and selection excluded from the temporal slice |
| Who changes integration config | There's no auth, and a writable config lets anyone point telemetry or queries elsewhere | The config file only; the catalog is read-only and shows the snippet to add |
| Third-party integrations | Runtime plugins (module federation) need matching shared dependency versions and run outside code in the app | Not supported; an entry's `loadRuntime()` can point at a remote later without changing its callers |
| Backend | Persistence, the datasource proxy and integration config need a server; TanStack Start in SPA mode and a separate API are the options | Decide later; the phase 5 API stays a mock until then |
| Auth | Real datasources behind a proxy must not be open to anyone who reaches the site | Decide later (Better Auth, Clerk or WorkOS); required before phase 6 ships |
| Phase order | Whether the backend and auth move into phase 5, ahead of real datasources | Decide later |
| Widget editor and palette | The context bar is no longer for tools | A right-side edit drawer for the palette and options, a main-pane query editor ([07](../../.agents/plans/07-dashboard-model.md), open decision 1) |

Sources: [react-grid-layout releases](https://github.com/react-grid-layout/react-grid-layout/releases), [Mantine changelog](https://mantine.dev/changelog/all-releases/), [Vercel composition patterns](https://github.com/vercel-labs/agent-skills/blob/main/skills/composition-patterns/SKILL.md), [Vercel react-best-practices](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md).
