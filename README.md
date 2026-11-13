# Dashboard Builder

A dashboard builder on Mantine 9 and React 19. An app frame (top navbar, docking sidebar, docking context bar) wraps a drag-and-resize widget canvas fed by pluggable datasources. Dashboards are JSON documents; widgets and datasources are plugins, and a `DataFrame` is the only contract between them.

**Status:**

- **Paused for a restructure** (Nov 2026). Dashboards, the shell and the datasource plugins work. The target and the order of work are in [docs/target/architecture.md](docs/target/architecture.md); the contracts are in [docs/target/contracts.md](docs/target/contracts.md).
- Older docs, plans and reviews were moved out of the repo on Nov 13, 2026, to the `builder-docs` folder. They are history, not guidance.

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
vp run build        # the production build (types are checked by `vp run lint`)
```

Install [Vite+](https://viteplus.dev/guide/) first. The exact Node and pnpm versions are pinned in [`package.json`](package.json); Vite+ selects them automatically. `.nvmrc` mirrors the Node pin for nvm and CI. `pnpm-workspace.yaml` makes version mismatches errors, with expected and actual versions in pnpm's diagnostic. `devEngines` also rejects unsupported npm invocations. Use `vp env current` to inspect the selected versions and `vp env doctor` to diagnose PATH or shell overrides.

Run commands from the workspace root. Direct `pnpm` commands also work when the pinned versions are active. Use `vp run build` and `vp run lint` for the repository scripts: they are cached by Vite Task, and the built-in `vp lint` omits Stylelint. Type errors come from `vp lint` (tsgolint with `typeCheck`); there is no separate `tsc` step. Formatting uses Oxfmt and the `fmt` block in `vite.config.ts`; lint rules are composed there from `oxlint.config.ts`. CI uses the same pins and commands.

Dependencies update through [Renovate](.github/renovate.json5): grouped pull requests (Mantine, TanStack, React, the Vite+ toolchain and others) early on Mondays, once a release is 3 days old, each checked by CI before you merge. react-grid-layout stays on 2.2.4 (why).

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

| Where          | What                                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/`         | The app: `app/` (routes, providers), `features/`, `shell/`, `plugins/`, `lib/`, `ui/`, `core/`, `utils/`, `testing/`. Layers, data flow and state are in [docs/current-state.md](docs/current-state.md) |
| `relay/`       | The relay: a small Node server (Hono) that runs SQL Server and MongoDB queries for the Azure SQL and MongoDB plugins                                                                                    |
| `plugins.json` | The optional plugins in the build, `[]` by default; `plugins.config.ts` reads it                                                                                                                        |
| `public/data/` | Seed dashboards (`dashboards/*.json`) and data frames read by the `local-json` datasource                                                                                                               |
| `docs/`        | Two things only: `target/` (where the app is going: architecture and contracts) and [current-state.md](docs/current-state.md) (how it is built today; not the goal)                                     |
| `floorplan/`   | A generated map of the code: `node floorplan/query.mjs overview`                                                                                                                                        |
| `apps/docs/`   | The capability catalog: what's fixed, the core capabilities and their providers, and the plugins ([core](apps/docs/core.md), [potential](apps/docs/potential.md)); a docs site later                    |
| `AGENTS.md`    | Rules for anyone writing code here, people or agents                                                                                                                                                    |
| `lint/`        | The local oxlint plugin for the token and style rules, and the tests proving each rule fires                                                                                                            |
| `.storybook/`  | Storybook config; every chrome and dashboard state has a story, and `pnpm test` runs each one in Chromium                                                                                               |

## Frame behaviour

| Control                    | Docked                                                   | Undocked or narrow        |
| -------------------------- | -------------------------------------------------------- | ------------------------- |
| Burger (`Ctrl+B`)          | Sidebar: full → icons → hidden                           | Opens / closes the drawer |
| Sidebar footer             | Collapse to icons · undock                               | Dock                      |
| Question button (`Ctrl+.`) | Shows / hides the context column (navbar is pushed left) | Opens / closes the drawer |
| Context bar header         | Tabs · undock · close                                    | Tabs · dock · close       |
| Pane edges                 | Drag, arrow keys (Shift = 40 px), double-click resets    | –                         |
| Search (`Ctrl+K` or `/`)   | Spotlight over navigation targets                        | same                      |

Layout preferences persist in `localStorage`; open drawers never do, so nothing pops open on load. The keys are listed in [architecture.md › Browser storage](docs/current-state.md#browser-storage).

## Agent skills

The skills this repo uses are listed in [AGENTS.md › Skills](AGENTS.md#skills); local ones are in `.agents/skills/`, and `pnpm exec intent list` shows the ones shipped with dependencies.
