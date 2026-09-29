# Notifications, errors and loading

How the app tells the user what's happening. Designed Sep 22 and built in phase 1; rows marked _later_ aren't built yet. The short rules for using it are in [AGENTS.md › Notifications, errors, loading](../AGENTS.md#notifications-errors-loading).

Code: `lib/notify/` (toasts), `stores/inbox.ts` (inbox), `lib/errors/AppError.ts`, `components/errors/`, `components/feedback/`, `app/queryClient.ts`, `app/router.ts`.

## Notifications

Two surfaces, one API: transient toasts (`@mantine/notifications`) and a persistent inbox in the context bar's `notifications` tab. Features call `notify.*` from `lib/notify/notify.tsx`; nothing calls `notifications.show` directly.

| Level      | Toast                    | Inbox | Auto-close | Example                                |
| ---------- | ------------------------ | ----- | ---------- | -------------------------------------- |
| `success`  | yes                      | no    | 4s         | Dashboard saved                        |
| `info`     | yes                      | no    | 5s         | Layout reset                           |
| `warning`  | yes                      | yes   | 8s         | Datasource slow, showing cached data   |
| `error`    | yes                      | yes   | manual     | Import failed: invalid JSON at line 12 |
| `progress` | one toast, updated by id | no    | when done  | Exporting 3 dashboards                 |

- **Message shape:** `{ id, level, title, message?, action?: { label, onClick }, dedupeKey?, source? }`. `title` is a plain sentence under 60 characters with the outcome first ("Dashboard saved", not "Success").
- **Dedupe:** a toast with the same `dedupeKey` within 10s updates the existing one instead of stacking. Inbox entries with the same key collapse into one with a count.
- **Placement:** at most 3 toasts visible (`limit={3}`), bottom-right.
- **Actions:** every error toast has an action when one exists (Retry, Undo, Open settings). _Later (phase 3):_ success toasts for destructive actions carry Undo for 8s, wired to the dashboard store's undo.
- **Accessibility:** `success` / `info` use `role="status"`, `warning` / `error` use `role="alert"`. Toasts pause on hover and focus, and are never the only signal (inline error UI still appears).
- **Inbox:** the last 50 `warning` / `error` items, persisted as `notifications.v1`, each with `read` state. The navbar context button shows an unread badge; "Clear all" and per-item dismiss.
- **Mutations:** a global `MutationCache.onError` calls `notify.error` with the mapped message, so features don't repeat toast logic. Success toasts are opt-in per mutation via `meta.successMessage`.
- **No toast** for errors that already have a full-page or in-place UI (404, widget error boundary).
- **Trying it:** `/debug` fires every level.

## Errors

Errors are caught at the smallest boundary that can recover, and every boundary renders the same `ErrorState` compound component (icon, title, detail, actions), so the design stays uniform. The app chrome never unmounts because of a content error.

| Scope                        | Mechanism                                           | UI                                                                                     |
| ---------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Unknown URL                  | Router `defaultNotFoundComponent`                   | `NotFound` in the main area: the attempted path, Search, Home and Back                 |
| Route loader or render error | Router `defaultErrorComponent`                      | `RouteError` in the main area: Retry (`router.invalidate()`), details in dev           |
| App-level crash              | `react-error-boundary` around the shell             | `AppCrash` full page with Reload; reported to Sentry                                   |
| Widget                       | `WidgetBoundary` per grid item plus query `isError` | `ErrorState.Inline` fills the tile with Retry; the rest of the dashboard keeps running |
| Datasource / query           | TanStack Query `error` typed as `AppError`          | Inline in the widget or editor; a toast only for background refetches                  |
| Form                         | Mantine form validation                             | Field-level messages, summary `Alert` on submit                                        |
| Offline                      | Mantine `useNetwork` in `OfflineBanner`             | Persistent banner ("You're offline"); queries pause with `networkMode: 'offlineFirst'` |
| Permission / 403             | `AppError` code                                     | _Later:_ a `Forbidden` variant of `ErrorState`                                         |

- **One error type:** `AppError { code: 'not_found' | 'network' | 'timeout' | 'validation' | 'datasource' | 'unknown', message, cause?, retryable, details? }`. Mappers in each feature's `api/` turn transport errors into `AppError`; the UI never inspects `fetch` responses.
- **Messages:** say what happened and what to do next. No stack traces, no error codes in the title. Dev builds show a collapsible details block with the cause.
- **Variants:** `ErrorState.Full` (page), `.Inline` (card or tile), `.Banner` (top of content), chosen by the parent. Full and Inline are built on Mantine `EmptyState`.
- **Retry** buttons call a real retry (`refetch`, `router.invalidate`, `resetErrorBoundary`) and are disabled while pending.
- **Reporting:** only the app root reports to Sentry today; [06-sentry](../.agents/plans/06-sentry.md) adds the route, widget, query and mutation boundaries.
- **Tests:** every error component has a story and a Vitest test for role, message and the retry callback.

## Loading

Loading UI matches the shape of what arrives, appears only when it would otherwise flash, and never blocks the chrome: skeletons for first loads, small indicators for refetches, a progress bar for navigation.

| Situation                  | Mechanism                                                  | UI                                                                           |
| -------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Route navigation           | Router `defaultPendingMs: 300`, `defaultPendingMinMs: 500` | A skeleton shaped like the route after 300ms, shown at least 500ms           |
| Route transition with data | `defaultPreload: 'intent'` (preload on hover and focus)    | Thin top bar (`RouteProgress`, Mantine `NavigationProgress`); old page stays |
| Widget first load          | `useQuery` `isPending`                                     | The widget type's skeleton inside the tile                                   |
| Widget refetch             | `isFetching && !isPending`                                 | _Later:_ a 2px bar under the widget header; never a skeleton                 |
| Lazy chunk (widget, tab)   | `React.lazy` + `Suspense` per tile or tab                  | Same skeleton as the data load, so code and data loading look the same       |
| Button actions             | Mutation `isPending`                                       | Button `loading`, disabled, label unchanged                                  |
| Slow queries               | `SlowHint` after 5s                                        | "Still loading…" with Cancel that aborts the query. Built, _later_ wired in  |
| Empty result               | Query success with no rows                                 | Mantine `EmptyState` with a hint and a primary action, never a blank tile    |

- **Skeletons** live in `components/feedback/skeletons/Skeletons.tsx`: `TextSkeleton`, `ChartSkeleton`, `TableSkeleton`, `PanelSkeleton`, `DashboardSkeleton`, `ListSkeleton`. Animation and radius come from the `Skeleton` theme binding. Each widget definition names its skeleton ([05-dashboard-read](../.agents/plans/done/05-dashboard-read.md)).
- **`useDelayedPending(isPending, 300)`** gates skeletons, so loads under 300ms render nothing. Each skeleton container is `aria-busy`, the skeleton itself `aria-hidden`, with one visually hidden "Loading" per region.
- **Boot:** a static splash in `index.html`, replaced on first render. No full-screen spinner after that.
- **Query defaults** (`app/queryClient.ts`): `staleTime` 30s, `gcTime` 5m, one retry for retryable errors, `refetchOnWindowFocus: false`, and `placeholderData: keepPreviousData`, so charts don't show a skeleton on every range change.
- **Non-urgent updates** (search filtering, re-layout on resize, range changes) go through `startTransition` / `useDeferredValue`, so input stays responsive.
- **Stories:** `Skeletons.stories.tsx` shows each skeleton.
