# Dashboard Builder

A dashboard builder on Mantine 9 and React 19. An app frame (top navbar, docking sidebar, docking context bar) wraps a drag-and-resize widget canvas fed by pluggable datasources. Dashboards are JSON documents; widgets and datasources are plugins, and a `DataFrame` is the only contract between them.

**Status:**

- [11 Optional plugins](.agents/planning/plans/done/11-optional-plugins.md) is done (Oct 24). Azure SQL, MongoDB, AWS and Google are datasource plugins chosen at build time in `plugins.json`. Connections and their passphrase-protected secrets live on `/datasources`, and a relay in `relay/` runs SQL Server and MongoDB queries ([data sources](docs/dashboard/datasources.md)).
- Phase 3. Reading dashboards is done. The edit MVP (edit mode, undo and redo, drag and resize, add, duplicate and remove widgets, a local save and draft, JSON export and import) is done (Oct 2): its acceptance checks run as play functions or were checked in the browser, and the drag and resize numbers are in [grid-and-charts.md](docs/dashboard/grid-and-charts.md#tile-drag-and-resize).
- [08 Structure cleanup](.agents/planning/plans/done/08-structure-cleanup.md) is done (Oct 1): every story runs in Chromium with an a11y check and the edit flows are play functions; the code sits in package-shaped folders, one lint rule per layer.
- The order of work is in [tasks.md](.agents/planning/tasks.md).

## Run

```bash
vp install
vp run dev          # http://localhost:5173/mantine-dashboard-builder/
vp run dev:devtools # the same, with TanStack Devtools, Vite DevTools and click-to-source
vp run storybook    # http://localhost:6006
vp run relay        # the relay for Azure SQL and MongoDB, on http://127.0.0.1:8787
vp run test         # node + jsdom tests and every story in Chromium
vp run test:unit    # node + jsdom only
vp check            # Oxfmt, Oxlint and type checks
vp run lint:css     # Stylelint remains a separate check
vp run build        # tsc -b, then the production build
```

Install [Vite+](https://viteplus.dev/guide/) first. The exact Node and pnpm versions are pinned in [`package.json`](package.json); Vite+ selects them automatically. `.nvmrc` mirrors the Node pin for nvm and CI. `pnpm-workspace.yaml` makes version mismatches errors, with expected and actual versions in pnpm's diagnostic. `devEngines` also rejects unsupported npm invocations. Use `vp env current` to inspect the selected versions and `vp env doctor` to diagnose PATH or shell overrides.

Run commands from the workspace root. Direct `pnpm` commands also work when the pinned versions are active. Use `vp run build` and `vp run lint` for the repository scripts: the built-in `vp build` omits our separate `tsc -b` step, and `vp lint` omits Stylelint. Formatting uses Oxfmt and the `fmt` block in `vite.config.ts`; lint rules are composed there from `oxlint.config.ts`. CI uses the same pins and commands.

Dependencies update through [Renovate](.github/renovate.json5): grouped pull requests (Mantine, TanStack, React, the Vite+ toolchain and others) early on Mondays, once a release is 3 days old, each checked by CI before you merge. react-grid-layout stays on 2.2.4 ([why](docs/upgrades/RGL.md)).

## Try it

| URL                                                  | Shows                                                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/dashboards`                                        | The dashboard list                                                                                                                   |
| `/dashboards/sales`                                  | A dashboard with live mock data, context-bar tabs from the route, one widget failing inside its own boundary                         |
| `/dashboards/sales?mode=edit`                        | Edit mode: Save, Discard, Undo, Redo, drag and resize, widget menu, Add widget, Import and Export JSON                               |
| `/dashboards/sales?from=now-7d&to=now&refresh=1m`    | Time range and auto-refresh from the URL                                                                                             |
| `/dashboards/sales?tz=America/New_York`              | The dashboard in New York time: ranges, axes and table times                                                                         |
| `/dashboards/sales?view=revenue`                     | One widget full screen; Esc returns. A widget's menu also sets its own time range (the clock icon); `?` lists the keyboard shortcuts |
| `/dashboards/sales?inspect=revenue&inspectTab=query` | Inspect: a widget query's data, request, JSON and stats                                                                              |
| `/dashboards/perf`                                   | 20 charts; tiles below the fold mount when scrolled near                                                                             |
| `/dashboards/infra`                                  | A virtualized 10k-row table                                                                                                          |
| `/dashboards/broken`                                 | A document that fails validation: route error with retry                                                                             |
| `/dashboards/missing`, `/anything`                   | 404 inside the frame                                                                                                                 |
| `/settings`                                          | Appearance: theme, burger behaviour, dashboard density, reduced motion                                                               |
| `/datasources`                                       | Connections, the vault, the built-in datasources, and Plugins with Add to build (in `vp run dev` it edits `plugins.json`)            |
| `/debug`                                             | Every toast level, dedupe, progress, mutation error, a throwing widget, all skeletons                                                |

Saves and drafts stay in this browser's `localStorage`; the files in `public/data/` are never changed.

## Repo map

| Where               | What                                                                                                                                                                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/`              | The app: `app/` (routes, providers), `features/`, `shell/`, `plugins/`, `lib/`, `ui/`, `core/`, `utils/`, `testing/`. Layers, data flow and state are in [docs/architecture.md](docs/architecture.md)                                                                                                                |
| `relay/`            | The relay: a small Node server (Hono) that runs SQL Server and MongoDB queries for the Azure SQL and MongoDB plugins ([how](docs/dashboard/datasources.md#relay))                                                                                                                                                    |
| `plugins.json`      | The optional plugins in the build, `[]` by default; `plugins.config.ts` reads it ([how](docs/dashboard/datasources.md#choosing-whats-in-the-build))                                                                                                                                                                  |
| `public/data/`      | Seed dashboards (`dashboards/*.json`) and data frames read by the `local-json` datasource                                                                                                                                                                                                                            |
| `docs/`             | How the built parts work: [architecture](docs/architecture.md), [shell](docs/ui/shell.md), [design system](docs/ui/design-system.md), [feedback](docs/ui/feedback.md), [dashboard](docs/dashboard/dashboard.md), [grid and charts](docs/dashboard/grid-and-charts.md), [data sources](docs/dashboard/datasources.md) |
| `.agents/planning/` | [Roadmap](.agents/planning/roadmap.md), [tasks](.agents/planning/tasks.md), one plan per piece of work in `plans/`, and `research/`                                                                                                                                                                                  |
| `AGENTS.md`         | Rules for anyone writing code here, people or agents                                                                                                                                                                                                                                                                 |
| `lint/`             | The local oxlint plugin for the token and style rules, and the tests proving each rule fires                                                                                                                                                                                                                         |
| `.storybook/`       | Storybook config; every chrome and dashboard state has a story, and `pnpm test` runs each one in Chromium                                                                                                                                                                                                            |

## Frame behaviour

| Control                    | Docked                                                   | Undocked or narrow        |
| -------------------------- | -------------------------------------------------------- | ------------------------- |
| Burger (`Ctrl+B`)          | Sidebar: full → icons → hidden                           | Opens / closes the drawer |
| Sidebar footer             | Collapse to icons · undock                               | Dock                      |
| Question button (`Ctrl+.`) | Shows / hides the context column (navbar is pushed left) | Opens / closes the drawer |
| Context bar header         | Tabs · undock · close                                    | Tabs · dock · close       |
| Pane edges                 | Drag, arrow keys (Shift = 40 px), double-click resets    | –                         |
| Search (`Ctrl+K` or `/`)   | Spotlight over navigation targets                        | same                      |

Layout preferences persist in `localStorage`; open drawers never do, so nothing pops open on load. The keys are listed in [architecture.md › Browser storage](docs/architecture.md#browser-storage).

## Agent skills

The skills this repo uses are listed in [AGENTS.md › Skills](AGENTS.md#skills); local ones are in `.agents/skills/`, and `pnpm exec intent list` shows the ones shipped with dependencies.
