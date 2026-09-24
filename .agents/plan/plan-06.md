# Plan 06: Sentry, prototype → real

Sep 24, 2026 · v1.0.0 · Tasks: [task-r06-01.md](./tasks/task-r06-01.md) · Research: [research-r06-sentry-integration.md](./research/research-r06-sentry-integration.md)

**Order:** 6 of 6 · **Depends on:** Plan 02 (final location of the Sentry code), Plan 03 (tokens for its UI), Plan 04 (`Page` header for its pages), Plan 05 (registry pattern, if integrations stay a product feature) · **Blocks:** nothing. Sentry is not a priority; this plan waits until the others are done.

## Where it stands (Sep 24, 2026)

A Sentry prototype was merged in PR #13. Its plan and task list are in `archive/plan-sentry-prototype.md` and `archive/task-r04-01-sentry-prototype.md`. It added:

- `src/integrations/`: a Sentry client (init, sample rates, replay, logs, tracing), TanStack Router tracing, `logger` / `metrics` wrappers, and an integration registry.
- **UI, for show only, not final:** an `/integrations` catalog (grid/row switch), an `/integrations/sentry` page with status, runtime settings (DSN editable and saved to `localStorage`) and a large verification card ("Break the world" plus test buttons), and an "Integrations" sidebar entry.
- The app-root error boundary reports to Sentry. Nothing else does yet: the route errors, widget boundaries and query/mutation caches listed in the prototype plan were never wired.

**Already fixed after the merge (commit `1cc521f`), so the rest of the app isn't affected:**

- **SDK loading:** the SDK is loaded as its own chunk, only when a DSN is configured (`src/integrations/sentry/runtime.ts`: `startSentry`, `connectRouter`, `reportError`). First-load JS went from 1085 back to 809 KiB.
- **Replay privacy:** Replay masks all text and blocks media (Sentry's defaults); the prototype had turned both off.
- **Console forwarding:** only `warn` and `error`, not every log.
- **Source maps:** built only when uploading to Sentry, then deleted, so GitHub Pages no longer publishes them.

**Handled by other plans in the meantime:**

- **Plan 02:** moves the code: the SDK code to `lib/sentry/`, the UI to `features/integrations/`, and the barrels go.
- **Plan 03:** its token lint rules skip `features/integrations/**` until this plan rebuilds that UI.

## Objective

Keep the parts of the prototype that are worth keeping, decide what Sentry is for in this app, and rebuild the UI to the same standard as the rest (tokens, `Page`, Mantine-first, tests).

## Decisions to make first

1. **Features:** which of errors, logs, metrics, replay and tracing are actually wanted? Each costs bundle size and quota.
   - **Recommendation:** errors and tracing first, with replay on error only (`replaysOnErrorSampleRate: 1`, session sampling 0).
   - Add logs and metrics when there's something that reads them.
2. **Where the DSN comes from:** build-time env only (`VITE_SENTRY_DSN`), or also editable in the UI?
   - **Recommendation:** env only. A DSN that can be changed at runtime from `localStorage` is unusual, hard to reason about in support, and lets anyone point the app's telemetry elsewhere.
3. **Is "Integrations" a product feature or a developer tool?**
   - If it's a product feature (more integrations planned), keep `/integrations` with the registry, built the same way as Plan 05's registries.
   - If it's a developer tool, fold Sentry status and verification into the Debug page and drop the catalog and sidebar entry.
4. **Production sample rates:** `tracesSampleRate` is 1.0 in the prototype. Use a production value (for example 0.1) through env.

## Work (after the decisions)

1. **Report errors everywhere, through `reportError`:**
   - `RouteError` (tag: route id)
   - `WidgetBoundary` (tag: widget type)
   - the global `QueryCache` / `MutationCache` `onError` in `app/queryClient.ts`
   - `notify.error` (as a Sentry log or breadcrumb, not an event, to avoid duplicates)
2. **Rebuild the UI** with tokens (Plan 03) and `Page` (Plan 04):
   - status and verification on a small page or Debug-page section, per decision 3
   - the 546-line verification card becomes a few Mantine parts, with no custom look
3. **Remove what the decisions drop:**
   - runtime DSN settings and `sentry.config.v1` in `localStorage` (keep a migration that deletes the old key)
   - unused wrappers (`metrics` if metrics are off)
   - the catalog, if decision 3 goes that way
4. **CI:** add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` as repository secrets for the Pages build, so releases get source maps in Sentry, which then deletes them from `dist`.
5. **Tests:**
   - `reportError` calls from each boundary
   - no SDK chunk requested without a DSN (already covered by `runtime.test.ts`)
   - the rebuilt UI's states (not configured, configured, verification sent)

## Out of scope

Other integrations, and a self-hosted Sentry.

## Verification

- **With no DSN:** the first load contains no Sentry code (as today, 809 KiB), and no request goes to `*.sentry.io`.
- **With a DSN in a preview build:**
  - a thrown widget error, a route error and a failed mutation each appear in Sentry with their tags
  - a replay only exists for an error session, with masked text
- **Build output:** `dist/` contains no `.map` files after a CI build with the token.
