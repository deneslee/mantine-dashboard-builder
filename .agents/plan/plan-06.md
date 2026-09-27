# Plan 06: Sentry, prototype → real

Sep 27, 2026 · v1.1.0 · Tasks: [task-r06-02.md](./tasks/task-r06-02.md) · Research: [research-r06-sentry-integration.md](./research/research-r06-sentry-integration.md)

**v1.1 changes:**

- **Order:** error reporting and CI source maps come first, because they need no decision.
- **Filtering:** `reportError` drops expected errors in one place.
- **No duplicates:** first-load errors are reported at the boundaries only, and the query cache reports only background refetch errors.
- **Timing:** decision 3 must be made before Plan 04's migration task.
- **Recommendation:** Integrations becomes a developer tool.
- **Cleanup:** the Plan 02 hand-off notes are removed (done).

**Order:** 6 of 6 · **Depends on:** Plan 02 (done). Only the UI rebuild needs Plan 03 (tokens) and Plan 04 (`Page`). "Report errors" and "Source maps in CI" can be done any time. · **Blocks:** Plan 04's migration task, through decision 3 only

## Where it stands (Sep 27, 2026)

A Sentry prototype was merged in PR #13 (plan and tasks in `archive/plan-sentry-prototype.md` and `archive/task-r04-01-sentry-prototype.md`).

- **Code:** `lib/sentry/`.
  - The app only uses `runtime.ts`: `startSentry`, `connectRouter` and `reportError`.
  - The rest is the SDK client (init, sample rates, replay, logs, tracing), TanStack Router tracing and the `logger` / `metrics` wrappers.
- **UI, for show only, not final:** in `features/integrations/`.
  - An `/integrations` catalog with a grid/row switch.
  - An `/integrations/sentry` page with status, runtime settings (the DSN is editable and saved to `localStorage`) and a large verification card ("Break the world" plus test buttons).
  - An "Integrations" sidebar entry.
- **Error reporting:** only the app-root boundary reports (`App.tsx`, tag `boundary: 'app_root'`). Route errors, widget boundaries and the query and mutation caches don't.
- **Already fixed (commit `1cc521f`):**
  - The SDK loads as its own chunk, only when a DSN is configured; first-load JS went from 1085 to 809 KiB.
  - Replay masks all text and blocks media.
  - Only console `warn` and `error` are forwarded.
  - Source maps are built only when uploading, and then deleted.
- **Plan 03:** its token lint rules skip `features/integrations/**` until this plan rebuilds or removes that UI.

## Objective

Keep the parts of the prototype worth keeping, decide what Sentry is for in this app, and rebuild the UI to the same standard as the rest (tokens, `Page`, Mantine-first, tests).

## Decisions to make

1. **Features:** which of errors, logs, metrics, replay and tracing are wanted? Each costs bundle size and quota.
   - **Recommendation:** errors and tracing first, with replay on error only (`replaysOnErrorSampleRate: 1`, session sampling 0).
   - Add logs and metrics when there's something that reads them.
2. **Where the DSN comes from:** build-time env only (`VITE_SENTRY_DSN`), or also editable in the UI?
   - **Recommendation:** env only. A DSN that can be changed at runtime from `localStorage` is unusual, hard to reason about in support, and lets anyone point the app's telemetry elsewhere.
3. **Is "Integrations" a product feature or a developer tool?** Decide this before Plan 04's migration, which otherwise migrates two pages that may be deleted.
   - **Product feature:** keep `/integrations` with the registry, built like Plan 05's registries.
   - **Developer tool:** fold the Sentry status and verification into the Debug page, and drop the catalog, the integration registry and its test, and the sidebar entry.
   - **Recommendation:** developer tool. No second integration is planned. It also ends Plan 03's lint exemption, because the folder goes.
4. **Production sample rates:** `tracesSampleRate` is 1.0 in the prototype. Use a production value (for example 0.1) through env.

## Work

1. **Report errors through `reportError` (no decision needed).**
   - **Filter once, inside `reportError`:** skip aborts (`AbortError`, before `toAppError` turns them into `timeout`) and the expected `AppError` codes `not_found` and `network`. Otherwise offline users and 404s flood the project.
   - **Report at the boundaries:**
     - `RouteError` (tag: route id)
     - `WidgetBoundary` through `ErrorBoundary`'s `onError` (tag: widget type)
   - **Query cache:** `QueryCache.onError` reports only in the background-refetch branch that already toasts. A first-load error reaches a boundary and is reported there, so reporting it in the cache too would send it twice.
   - **Mutation cache:** `MutationCache.onError` reports every mutation error that passes the filter.
   - **`notify.error`:** a Sentry breadcrumb, not an event.
   - **Tags:** one key, `boundary: 'route' | 'widget' | 'query' | 'mutation'` (next to the existing `app_root`), plus `route`, `widget` or `source` (from `meta.source`).
2. **CI source maps (no decision needed):** add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` as repository secrets for the Pages build, so releases get source maps in Sentry, which then deletes them from `dist`.
3. **Remove what the decisions drop, before rebuilding:**
   - runtime DSN settings and `sentry.config.v1` in `localStorage` (keep a one-line delete of the old key on load)
   - unused wrappers (`metrics` if metrics are off)
   - the catalog, registry and sidebar entry, if decision 3 goes that way
4. **Rebuild what's left** with tokens (Plan 03) and `Page` (Plan 04):
   - status and verification on a Debug-page section or a small page, per decision 3
   - the 552-line verification card becomes a few Mantine parts, with no custom look
   - the Sentry logo SVG keeps its own fill, like an image asset; the `color="#7553FF"` ThemeIcon wrappers around it go, and `primitives.brand.sentry` is deleted if nothing reads it then (feature code may not import primitives)
5. **Tests:**
   - `reportError` calls from each boundary, with tags
   - `reportError` drops aborts, `not_found` and `network`
   - no SDK chunk requested without a DSN (already covered by `runtime.test.ts`)
   - the rebuilt UI's states (not configured, configured, verification sent)

## Out of scope

Other integrations, and a self-hosted Sentry.

## Verification

- **With no DSN:** the first load contains no Sentry code (809 KiB, as today), and no request goes to `*.sentry.io`.
- **With a DSN in a preview build:**
  - a thrown widget error, a route error and a failed mutation each appear in Sentry once, with their tags
  - a 404 route and an offline refetch send nothing
  - a replay only exists for an error session, with masked text
- **Build output:** `dist/` contains no `.map` files after a CI build with the token.
