# 06 Sentry

Status: open · Cross-cutting · Depends on: 02 (done). §1 and §2 can be done any time. §3 needs the Integrations foundation ([plan.md › Roadmap](../../docs/planning/plan.md#roadmap)), 03 (tokens, done) and 04 (`Page`, done). · Research: [sentry-integration](research/sentry-integration.md), [integrations](research/integrations.md)

## Goal

Report errors from every boundary, get readable stack traces, and make Sentry the first telemetry integration: off unless the deployment's integration config enables it, its SDK a separate chunk, its DSN and sample rates read from that config. The integration registry, the config port and the `/integrations` catalog belong to the Integrations foundation; this plan keeps what is specific to Sentry.

## Where it stands (Sep 29, 2026)

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
- **Tokens:** the token lint rules skip `features/integrations/**` until the catalog and the Sentry page are rebuilt.
- **Integrations model (Sep 29):** a static registry of lazy chunks, enabled per deployment by a config read at load, not feature flags ([research](research/integrations.md)). The prototype's catalog, integration registry and sidebar entry move to the Integrations foundation. "Load the SDK when a DSN is configured" becomes "load it when the Sentry entry is enabled".

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

### 3. Sentry as the first telemetry integration

Needs the Integrations foundation: the registry in `app/registry.ts`, the `IntegrationConfigRepository` port reading `integrations.json`, and the rebuilt catalog.

- **Registry entry:**

  ```ts
  sentry: {
    id: 'sentry', name: 'Sentry', icon,
    provides: ['telemetry'],
    configSchema: SentryConfig,
    load: () => import('…/lib/sentry/runtime'),  // the SDK chunk, as today
    Setup: lazy(() => import('…/SentrySetup')),  // the /integrations/sentry page
  }
  ```

- **Config:** the `sentry` entry of `integrations.json`, validated with zod. Decision 1 may add fields (logs, metrics).

  ```ts
  SentryConfig {
    dsn: string,                      // URL
    environment?: string,
    tracesSampleRate: number,         // 0–1; the production value is decision 4
    replaysOnErrorSampleRate: number, // 0–1
    replaysSessionSampleRate: number, // 0–1
  }
  ```

- **Start:** after first render, only when the entry is enabled and its config parses. An invalid entry doesn't start the SDK, and the Sentry page shows the error.
- **Deployment:** the repo's `public/config/integrations.json` stays the default (nothing enabled). The Pages workflow writes the deployment's config into `dist/config/integrations.json` from a repository variable, next to the source map secrets.
- **Remove:**
  - The runtime DSN settings on the Sentry page, and the `sentry.config.v1` key in `localStorage` (keep a one-line delete of the old key on load). The DSN doesn't come from build-time env either.
  - The `logger` / `metrics` wrappers if decision 1 leaves logs or metrics off.
- **Sentry page** (`/integrations/sentry`, the entry's `Setup`), on tokens and `Page` parts:
  - State: off, on, or config invalid (with the error).
  - Off: the snippet to add to `integrations.json`.
  - On: the effective config and the test buttons. The 552-line verification card becomes a few Mantine parts, with no custom look.
  - The Sentry logo SVG keeps its own fill, like an image asset; the `color="#7553FF"` ThemeIcon wrappers around it go, and `primitives.brand.sentry` is deleted if nothing reads it then (feature code may not import primitives).
  - Once this page and the catalog are rebuilt, the lint exemption for `features/integrations/**` in `oxlint.config.ts` and `.stylelintrc.json` goes.

## Open decisions

- **Decision 1, features:** which of errors, logs, metrics, replay and tracing are wanted? Each costs size in the Sentry chunk and quota.
  - **Recommendation:** errors and tracing first, with replay on error only (`replaysOnErrorSampleRate: 1`, session sampling 0).
  - Replay can be a chunk of its own, loaded only when a replay rate is above 0; Sentry recommends a dynamic `import()` of `replayIntegration` for this.
  - Add logs and metrics when there's something that reads them.
- **Decision 4, production sample rates:** `tracesSampleRate` is 1.0 in the prototype. The rates are now fields of the Sentry config; pick the production values (for example `tracesSampleRate: 0.1`) for the deployment's config.

## Out of scope

The integration registry, config port and catalog (the Integrations foundation), other integrations, and a self-hosted Sentry.

## Tasks

- [x] **Keep the prototype from affecting the app (done Sep 24, `1cc521f`).** Lazy SDK only with a DSN, Replay privacy defaults, console warn/error only, source maps only when uploaded and then deleted. First load back to 809 KiB, no `.map` files in `dist`.
- [x] **Decision 3: Integrations is a product feature (Sep 27).** 04 migrates both integrations pages.
- [x] **Decision 2: the DSN comes from the integration config (Sep 29).** See [Decisions](#decisions).
- [ ] **Report errors from every boundary ([§1](#1-report-errors-through-reporterror)).**
  - `reportError` drops aborts, `not_found` and `network`.
  - `RouteError` and `WidgetBoundary` (`onError`) report.
  - `QueryCache.onError` reports only in its background-refetch branch; `MutationCache.onError` reports.
  - `notify.error` adds a breadcrumb.
  - Tags: `boundary` plus `route` / `widget` / `source`.
  - Done when a test per boundary checks the `reportError` call and its tags, and a test checks the filter.
- [ ] **Source maps in CI.** Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` secrets to the Pages workflow. Done when a release shows readable stack traces in Sentry and the deployed site has no `.map` files.
- [ ] **Settle decisions 1 and 4.** Features and production sample rates ([open decisions](#open-decisions)). Done when the answers are moved to Decisions below.
- [ ] **Sentry as an integration ([§3](#3-sentry-as-the-first-telemetry-integration)).** Needs the Integrations foundation.
  - Registry entry and `SentryConfig`; start only when enabled and valid.
  - The Pages workflow writes the deployment's `integrations.json`.
  - Delete the runtime DSN settings and the `sentry.config.v1` key (on load), and the wrappers decision 1 drops.
  - Done when the default config loads no Sentry code, enabling Sentry in the config of the same build starts it with the configured rates, an invalid entry doesn't start it, and no dead exports remain.
- [ ] **Rebuild the Sentry page ([§3](#3-sentry-as-the-first-telemetry-integration)).**
  - Tokens and `Page` parts; state, snippet, effective config.
  - Split the verification card into small Mantine parts.
  - Drop the `color="#7553FF"` ThemeIcon wrappers; the logo SVG keeps its own fill.
  - Done when the stories cover the Sentry page (off / on / config invalid / sent), and the lint exemption for `features/integrations/**` is removed.
- [ ] **Verify with a real DSN.** Preview build with Sentry enabled in its config: a widget error, a route error and a failed mutation each arrive once, with tags. A 404 and an offline refetch send nothing. Replay only on error, with text masked. Done when the results are written into Verification below.

## Decisions

- **Sep 27: Integrations is a product feature (decision 3).** Keep `/integrations`, the registry and the sidebar entry, and rebuild them. The recommendation had been a developer tool; the product keeps an integrations area.
- **Sep 27: error reporting and CI source maps come first,** because they need no decision.
- **Sep 27: `reportError` drops expected errors in one place.**
- **Sep 27: no duplicates.** First-load errors are reported at the boundaries only; the query cache reports only background refetch errors.
- **Sep 29: Sentry is an entry in the integration registry** (option B in [research](research/integrations.md)). The deployment's integration config, read at load, enables and configures it; the SDK stays its own chunk. Not a feature flag: a flag would still ship the code and add a flag service.
- **Sep 29: decision 2, the DSN comes from the integration config.** Not build-time env (one build per deployment) and not `localStorage` (anyone could point the app's telemetry elsewhere).
- **Sep 29: the registry, config port and catalog move to the Integrations foundation,** which comes before §3. This plan keeps what is specific to Sentry.
- **Sep 29: sample rates are config fields;** their production values are still decision 4.

## Verification

- **Default config (nothing enabled):** the first load contains no Sentry code (809 KiB, as today), and no request goes to `*.sentry.io`.
- **Sentry enabled in the config of a preview build:**
  - a thrown widget error, a route error and a failed mutation each appear in Sentry once, with their tags
  - a 404 route and an offline refetch send nothing
  - a replay only exists for an error session, with masked text
- **Invalid Sentry entry:** the SDK doesn't load, and the Sentry page shows why.
- **Build output:** `dist/` contains no `.map` files after a CI build with the token.
