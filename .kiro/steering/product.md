# Product: Dashboard Builder

## What it is

A dashboard builder on Mantine 9 and React 19. An app frame (top navbar, docking sidebar, docking context bar) wraps a drag-and-resize widget canvas fed by pluggable datasources. Dashboards are JSON documents; widgets and datasources are plugins, and a `DataFrame` is the only contract between them.

Status: paused for a restructure (Nov 2026). Dashboards, the shell, and the datasource plugins work today; the target architecture lives in `docs/target/`.

## Key features

- Dashboard list and view pages with live mock data.
- Edit mode: Save, Discard, Undo, Redo, drag and resize, widget menu, Add widget, Import/Export JSON.
- Time range and auto-refresh driven from the URL, plus timezone support.
- Full-screen single-widget view with keyboard shortcuts.
- Widget inspect: a query's data, request, JSON, and stats.
- Performance tiles that mount when scrolled into view, and a virtualized 10k-row table.
- Validation errors with retry, and a 404 that renders inside the frame.
- Settings: theme, burger behaviour, dashboard density, reduced motion.
- Storage page: localStorage and Convex, each with live status, plus use-for-saving, export, import, and copy.
- Datasources page: connections, the vault, built-in datasources, and pluggable plugins.
- Debug page for toasts, progress, errors, and skeletons.
- App frame: collapsible/docking sidebar (`Ctrl+B`), docking context bar (`Ctrl+.`), spotlight search (`Ctrl+K` or `/`), draggable/resizable panes, and layout preferences persisted in localStorage.

## Capabilities

**Foundations (fixed):** React 19 + React Compiler, TypeScript strict; Vite+ (Vite, Vitest, Oxlint, Oxfmt) with pnpm workspaces; TanStack Router; TanStack Query for server state; Zustand + Immer + Zundo for client/editor state (one undo step per action); Zod + JSON Schema validation; Mantine 9 with CSS Modules and design tokens; react-grid-layout v2 for the grid; TanStack Table + Virtual for tables; Tabler Icons. Charts use Mantine Charts (Recharts), with ECharts available.

**Pluggable architecture:** plugins contribute datasources, widgets, views, editors, context tabs, commands, and exporters. Datasources (which read data) are kept separate from storage (which owns records).

**Datasources:** local-json and mock; relay-backed Azure SQL / SQL Server / MongoDB & Atlas; AWS (Athena, Aurora, Redshift, DynamoDB); Google (BigQuery, Firestore).

**Storage:** browser localStorage/IndexedDB by default, or a Convex deployment.

**Import/export:** JSON always; CSV for tables.

**Telemetry:** optional Sentry plugin. An assistant (chat panel) is planned, not built.
