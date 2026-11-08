# R6: App, frame, screens and design system

Part of the [R5 review](R5-codebase-overview.md), at `main` commit `2515b1e`. Covers `src/app`, `src/shell`, `src/features` and `src/ui`.

## In short

These layers follow AGENTS.md closely: primitive store selectors, one Suspense boundary per tile, lazy edit tools and context-bar tabs, tiles that load only near the screen, semantic tokens only, no inline styles, no barrel files. The findings are one data edge case and some housekeeping.

## 3. A widget can show the previous query's data after its queries change

`features/dashboards/data/useWidgetData.ts` keeps the last complete frames (`kept`) and shows them while new keys load, so a time-range change never flashes the skeleton. That's right for a range change. It also happens when the queries themselves change, for example a different datasource or spec applied in the query editor: until the new query answers, the tile shows the old query's rows as if they were the new ones. `kept` is never cleared, and there is no test for this hook.

**Look at:** keeping old frames only when the same queries reload (same datasources and specs, new time), and a hook test for both cases. Belongs with the data restructure.

## 8. The dashboard page re-renders on every address change

`DashboardPage.tsx` reads the whole search object (`useSearch({ from: '/dashboards/$id' })`) and about 15 store slices. Any search change (an inspect tab, the edited widget, a full-screen view) re-renders the page. The grid's children are memoised, so the cost stays at page level today. It grows with every control added to the page.

**Look at:** `select` on `useSearch` for the values the page uses, as `WidgetHeader` already does (`select: (search) => search.view === id`). Belongs with the re-render work.

## 11. The app's crash screen doesn't cover the providers

`app/App.tsx` puts the root `ErrorBoundary` inside `Providers`. A throw while the providers set up (theme, query client, vault, plugins) has no boundary, so the page goes blank instead of showing `AppCrash`.

**Look at:** an outer boundary with a fallback that needs no providers (plain HTML), keeping the inner one.

## 12. Older files break the naming rules

AGENTS.md says no generic `types.ts` in new code. Three remain from before the rule: `lib/notify/types.ts`, `lib/sentry/types.ts` and `features/integrations/types.ts`.

**Look at:** renaming each after its main type when the file is next touched. The Sentry two go with plan 06.

## 13. Large components to split when next touched

Over about 280 lines: `integrations/sentry/SentryVerificationCard.tsx` (491, waits for plan 06), `ui/components/SplitView/SplitViewRoot.tsx` (310), `dashboards/inspect/InspectPane.tsx` (306), `datasources/ConnectionForm.tsx` (294), `dashboards/DashboardPage.tsx` (293) and `dashboards/grid/WidgetHeader.tsx` (285). None is wrong, but large files are harder to change safely, for people and for AI assistants alike.

**Look at:** splitting by part (Inspect's tabs, the widget menu, the connection form's sections) when each file next changes, not as a task of its own.

## Checked and fine

- **Loading and errors:** skeletons shaped like the content, `QueryBoundary` per tile, first-load errors inline, refetch errors as toasts (`app/queryClient.ts`).
- **State owners:** the open dashboard in its store with undo (50 steps), the frame in the shell store, address state in search params, plugins in a context set once.
- **Code splitting:** edit tools, the inspect pane, widgets and devtools load only when needed.
