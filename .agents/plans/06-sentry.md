# 06 Sentry

Status: open · Cross-cutting · Depends on: 02 (done). The UI rebuild needs 03 (tokens, done) and 04 (`Page`). "Report errors" and "Source maps in CI" can be done any time. · Research: [sentry-integration](research/sentry-integration.md)

## Goal

Keep the parts of the prototype worth keeping, decide what Sentry is for in this app, and rebuild the Integrations UI to the same standard as the rest (tokens, `Page`, Mantine-first, tests). Integrations is a product feature (decision 3).

## Where it stands (Sep 27, 2026)

A Sentry prototype was merged in PR #13 ([done/06-sentry-prototype](done/06-sentry-prototype.md)).

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
- **Tokens:** the token lint rules skip `features/integrations/**` until this plan rebuilds that UI.

## Design

### 1. Report errors through `reportError`

- **Filter once, inside `reportError`:** skip aborts (`AbortError`, before `toAppError` turns them into `timeout`) and the expected `AppError` codes `not_found` and `network`. Otherwise offline users and 404s flood the project.
- **Report at the boundaries:**
  - `RouteError` (tag: route id)
  - `WidgetBoundary` through `ErrorBoundary`'s `onError` (tag: widget type)
- **Query cache:** `QueryCache.onError` reports only in the background-refetch branch that already toasts. A first-load error reaches a boundary and is reported there, so reporting it in the cache too would send it twice.
- **Mutation cache:** `MutationCache.onError` reports every mutation error that passes the filter.
- **`notify.error`:** a Sentry breadcrumb, not an event.
- **Tags:** one key, `boundary: 'route' | 'widget' | 'query' | 'mutation'` (next to the existing `app_root`), plus `route`, `widget` or `source` (from `meta.source`).

### 2. CI source maps

Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` as repository secrets for the Pages build, so releases get source maps in Sentry, which then deletes them from `dist`.

### 3. Integrations as a product feature

- **Keep:** the `/integrations` catalog, the integration registry, the `/integrations/sentry` page and the sidebar entry.
- **Remove what decisions 1, 2 and 4 drop, before rebuilding:** runtime DSN settings and `sentry.config.v1` in `localStorage` if the DSN comes from env only (keep a one-line delete of the old key on load), and unused wrappers (`metrics` if metrics are off).
- **Rebuild** with tokens (03) and `Page` (04):
  - The catalog and the Sentry page use `Page` parts and `RouteBreadcrumbs`; 04 migrates both pages first.
  - The 552-line verification card becomes a few Mantine parts, with no custom look.
  - The Sentry logo SVG keeps its own fill, like an image asset; the `color="#7553FF"` ThemeIcon wrappers around it go, and `primitives.brand.sentry` is deleted if nothing reads it then (feature code may not import primitives).
  - The lint exemption for `features/integrations/**` in `oxlint.config.ts` and `.stylelintrc.json` goes.

## Open decisions

- **Decision 1, features:** which of errors, logs, metrics, replay and tracing are wanted? Each costs bundle size and quota.
  - **Recommendation:** errors and tracing first, with replay on error only (`replaysOnErrorSampleRate: 1`, session sampling 0).
  - Add logs and metrics when there's something that reads them.
- **Decision 2, where the DSN comes from:** build-time env only (`VITE_SENTRY_DSN`), or also editable in the UI?
  - **Recommendation:** env only. A DSN that can be changed at runtime from `localStorage` is unusual, hard to reason about in support, and lets anyone point the app's telemetry elsewhere.
- **Decision 4, production sample rates:** `tracesSampleRate` is 1.0 in the prototype. Use a production value (for example 0.1) through env.

## Out of scope

Other integrations, and a self-hosted Sentry.

## Tasks

- [x] **Keep the prototype from affecting the app (done Sep 24, `1cc521f`).** Lazy SDK only with a DSN, Replay privacy defaults, console warn/error only, source maps only when uploaded and then deleted. First load back to 809 KiB, no `.map` files in `dist`.
- [x] **Decision 3: Integrations is a product feature (Sep 27).** 04 migrates both integrations pages.
- [ ] **Report errors from every boundary ([§1](#1-report-errors-through-reporterror)).**
  - `reportError` drops aborts, `not_found` and `network`.
  - `RouteError` and `WidgetBoundary` (`onError`) report.
  - `QueryCache.onError` reports only in its background-refetch branch; `MutationCache.onError` reports.
  - `notify.error` adds a breadcrumb.
  - Tags: `boundary` plus `route` / `widget` / `source`.
  - Done when a test per boundary checks the `reportError` call and its tags, and a test checks the filter.
- [ ] **Source maps in CI.** Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` secrets to the Pages workflow. Done when a release shows readable stack traces in Sentry and the deployed site has no `.map` files.
- [ ] **Settle decisions 1, 2 and 4.** Features, DSN source and production sample rates ([open decisions](#open-decisions)). Done when the answers are moved to Decisions below.
- [ ] **Remove what the decisions drop.**
  - Runtime DSN settings, and the `sentry.config.v1` key (deleted on load), if decision 2 is env only.
  - Unused wrappers (`metrics` if metrics are off).
  - Done when no dead exports remain.
- [ ] **Rebuild the Integrations UI ([§3](#3-integrations-as-a-product-feature)).**
  - The catalog and the Sentry page on tokens and `Page` parts.
  - Split the verification card into small Mantine parts.
  - Drop the `color="#7553FF"` ThemeIcon wrappers; the logo SVG keeps its own fill.
  - Done when the stories cover the catalog (grid and row) and the Sentry page (not configured / configured / sent), and the lint exemption for `features/integrations/**` is removed.
- [ ] **Verify with a real DSN.** Preview build: a widget error, a route error and a failed mutation each arrive once, with tags. A 404 and an offline refetch send nothing. Replay only on error, with text masked. Done when the results are written into Verification below.

## Decisions

- **Sep 27: Integrations is a product feature (decision 3).** Keep `/integrations`, the registry and the sidebar entry, and rebuild them. The recommendation had been a developer tool; the product keeps an integrations area.
- **Sep 27: error reporting and CI source maps come first,** because they need no decision.
- **Sep 27: `reportError` drops expected errors in one place.**
- **Sep 27: no duplicates.** First-load errors are reported at the boundaries only; the query cache reports only background refetch errors.

## Verification

- **With no DSN:** the first load contains no Sentry code (809 KiB, as today), and no request goes to `*.sentry.io`.
- **With a DSN in a preview build:**
  - a thrown widget error, a route error and a failed mutation each appear in Sentry once, with their tags
  - a 404 route and an offline refetch send nothing
  - a replay only exists for an error session, with masked text
- **Build output:** `dist/` contains no `.map` files after a CI build with the token.
