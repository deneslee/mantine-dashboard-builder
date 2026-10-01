# 06 Sentry

Status: open, paused until 07 stage 3 · Cross-cutting · Depends on: 02 (done). §1 and §2 come right after [07](07-dashboard-model.md) stage 3, which changes how queries run and fail. §3 needs the Integrations foundation ([roadmap](../roadmap.md#roadmap)), 03 (tokens, done) and 04 (`Page`, done). · Research: [sentry-integration](../research/sentry-integration.md), [integrations](../research/integrations.md)

## Goal

Report errors from every boundary and from the query and mutation caches, get readable stack traces, and make Sentry the first telemetry integration: off unless the deployment's integration config enables it, its SDK a separate chunk, its DSN and sample rates read from that config. The integration registry, the config port and the `/integrations` catalog belong to the Integrations foundation; this plan keeps what is specific to Sentry.

## Where it stands (Sep 30, 2026)

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
- **SDK version:** keep the prototype's major version pinned. v11 (Sep 23, 2026) changed defaults (§3); upgrading is its own task.
- **Tokens:** the token lint rules skip `features/integrations/**` until the catalog and the Sentry page are rebuilt.
- **Integrations model (Sep 29):** a static registry of lazy chunks, enabled per deployment by a config read at load, not feature flags ([research](../research/integrations.md)). The prototype's catalog, integration registry and sidebar entry move to the Integrations foundation. "Load the SDK when a DSN is configured" becomes "load it when the Sentry entry is enabled".

## Design

### 1. Report errors through `reportError`

Each kind of failure is reported in one place:

| Failure                  | Where it's handled                                          | Reported from               | Tags                                        |
| ------------------------ | ----------------------------------------------------------- | --------------------------- | ------------------------------------------- |
| Render error in a route  | `RouteError`                                                | `RouteError`                | `boundary: 'route'`, `route`                |
| Render error in a widget | `QueryBoundary`                                             | `ErrorBoundary`'s `onError` | `boundary: 'widget'`, `widget`              |
| Any other render error   | The app-root boundary                                       | The app root (exists)       | `boundary: 'app_root'`                      |
| Failed query             | Inline in its widget or editor; it never reaches a boundary | `QueryCache.onError`        | `boundary: 'query'`, `datasource`, `source` |
| Failed mutation          | `MutationCache.onError`, which already toasts               | `MutationCache.onError`     | `boundary: 'mutation'`, `source`            |

- **Query errors never reach a boundary.** TanStack Query's `throwOnError` defaults to false, and [feedback.md](../../../docs/ui/feedback.md) renders query errors inline. So the query cache is the only place to report them. Its global callback runs once per failed request, however many widgets show the result, which also removes any need to tell first loads from background refetches.
- **A reportability policy instead of dropping errors by code.** `AppError` gets `expected` and `reportable`, set where the error is mapped, from the error and the operation's `meta.telemetry` (`'report' | 'expected'`):

  | Error                                                                       | Reported              |
  | --------------------------------------------------------------------------- | --------------------- |
  | Abort (`AbortError`, before `toAppError` turns it into `timeout`)           | Never                 |
  | Browser offline (`navigator.onLine` is false)                               | Never                 |
  | Fetch failed while online (`TypeError: Failed to fetch`)                    | As a warning, sampled |
  | HTTP 5xx                                                                    | Yes                   |
  | 404 for something the app expected, such as a dashboard listed in the index | Yes                   |
  | 404 for a URL the user typed                                                | No                    |
  | Validation errors shown in a form                                           | No                    |

  A browser can't tell CORS, a wrong hostname or being offline apart: each is the same `TypeError`. Incidents like those are better caught by backend and uptime monitoring once there is a backend.

- **One outage, one issue:** query errors carry a fingerprint of the datasource and the error code, so twelve widgets failing on Datadog make one issue.
- **Context before capture:** `reportError` takes the operation's context (source, datasource, route) and adds it to the event. `notify.error`'s breadcrumb is added before `reportError` runs, never after.
- **Startup buffer:** until the Sentry runtime registers, `reportError` keeps up to 20 events in memory and sends them when it does. Global `error` and `unhandledrejection` listeners, installed first in `main.tsx`, feed the same buffer. Loading starts from `main.tsx`, not from a component effect, so a crash in the first render still loads Sentry and sends the crash.

### 2. CI source maps

Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` as repository secrets for the Pages build. The Sentry Vite plugin uploads the maps with Debug IDs, which match events to source maps without a release, and then deletes them from `dist`. Setting a release is optional; it helps with regression tracking.

### 3. Sentry as the first telemetry integration

Needs the Integrations foundation: the manifests in `app/plugins.ts`, the `IntegrationConfigRepository` port reading `integrations.json`, and the rebuilt catalog.

- **Manifest:**

  ```ts
  sentry: {
    id: 'sentry', name: 'Sentry', icon, category: 'monitoring',
    provides: ['telemetry'],
    loadConfig: () => import('…/sentry/config'),       // SentryConfig; only when enabled, or on its Setup page
    loadRuntime: () => import('…/lib/sentry/runtime'), // the SDK chunk, as today
    loadSetup: () => import('…/sentry/Setup'),         // the /integrations/sentry page
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

- **Data collection:** set `dataCollection` explicitly: no user info, cookies or request and response bodies. In SDK v11 an unset `dataCollection` collects all of them, and here response bodies are query results. v11 also attaches stack traces by default and starts one session per page load ([v10 to v11 migration](https://docs.sentry.io/platforms/javascript/migration/v10-to-v11/interactive/)).
- **Start:** from `main.tsx` once the integration config is read, only when the entry is enabled and its config parses. It doesn't wait for or block the first render; reports made before it's ready are buffered (§1). An invalid entry doesn't start the SDK, and the Sentry page shows the error.
- **Deployment:** the repo's `public/config/integrations.json` stays the default (nothing enabled). The Pages workflow writes the deployment's config into `dist/config/integrations.json` from a repository variable, next to the source map secrets.
- **Remove:**
  - The runtime DSN settings on the Sentry page, and the `dashboard-builder:sentry` key in `localStorage` (was `sentry.config.v1`, renamed in 08; keep a one-line delete of the key on load). The DSN doesn't come from build-time env either.
  - The `logger` / `metrics` wrappers if decision 1 leaves logs or metrics off.
- **Sentry page** (`/integrations/sentry`, the entry's Setup), on tokens and `Page` parts:
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
- **Decision 4, production sample rates:** `tracesSampleRate` is 1.0 in the prototype. The rates are fields of the Sentry config; pick the production values (for example `tracesSampleRate: 0.1`) for the deployment's config.

## Out of scope

The integration registry, config port and catalog (the Integrations foundation), other integrations, a self-hosted Sentry, and the v11 upgrade.

## Tasks

- [x] **Keep the prototype from affecting the app (done Sep 24, `1cc521f`).** Lazy SDK only with a DSN, Replay privacy defaults, console warn/error only, source maps only when uploaded and then deleted. First load back to 809 KiB, no `.map` files in `dist`.
- [x] **Decision 3: Integrations is a product feature (Sep 27).** 04 migrates both integrations pages.
- [x] **Decision 2: the DSN comes from the integration config (Sep 29).** See [Decisions](#decisions).
- [ ] **Report errors ([§1](#1-report-errors-through-reporterror)).**
  - Render errors: `RouteError` and `QueryBoundary` (`onError`) report.
  - Data errors: `QueryCache.onError` and `MutationCache.onError` report, once per failed request.
  - `AppError` gets `expected` and `reportable`; queries and mutations get `meta.telemetry`.
  - Fingerprint by datasource and code; context attached; breadcrumb before capture.
  - The startup buffer and the global listeners in `main.tsx`.
  - Done when a test per row of the failure table checks the `reportError` call and its tags, a test covers each row of the policy table, and an error thrown before the SDK loads is sent once it does.
- [ ] **Source maps in CI.** Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` secrets to the Pages workflow. Done when a production error shows a readable stack trace in Sentry and the deployed site has no `.map` files.
- [ ] **Settle decisions 1 and 4.** Features and production sample rates ([open decisions](#open-decisions)). Done when the answers are moved to Decisions below.
- [ ] **Sentry as an integration ([§3](#3-sentry-as-the-first-telemetry-integration)).** Needs the Integrations foundation.
  - The manifest and `SentryConfig`; start from `main.tsx` only when enabled and valid.
  - `dataCollection` set explicitly.
  - The Pages workflow writes the deployment's `integrations.json`.
  - Delete the runtime DSN settings and the `sentry.config.v1` key (on load), and the wrappers decision 1 drops.
  - Done when the default config fetches no Sentry chunk, enabling Sentry in the config of the same build starts it with the configured rates, an invalid entry doesn't start it, and no dead exports remain.
- [ ] **Rebuild the Sentry page ([§3](#3-sentry-as-the-first-telemetry-integration)).**
  - Tokens and `Page` parts; state, snippet, effective config.
  - Split the verification card into small Mantine parts.
  - Drop the `color="#7553FF"` ThemeIcon wrappers; the logo SVG keeps its own fill.
  - Done when the stories cover the Sentry page (off / on / config invalid / sent), and the lint exemption for `features/integrations/**` is removed.
- [ ] **Verify with a real DSN.** Preview build with Sentry enabled in its config; the results go into Verification below.

## Decisions

- **Sep 27: Integrations is a product feature (decision 3).** Keep `/integrations`, the registry and the sidebar entry, and rebuild them. The recommendation had been a developer tool; the product keeps an integrations area.
- **Sep 27: error reporting and CI source maps come first,** because they need no decision. _Changed Sep 30: they follow 07 stage 3._
- **Sep 27: `reportError` drops expected errors in one place.** _Replaced Sep 30 by the reportability policy._
- **Sep 27: no duplicates:** first-load errors reported at the boundaries only. _Replaced Sep 30: query errors never reach a boundary._
- **Sep 29: Sentry is an entry in the integration registry** (option B in [research](../research/integrations.md)). The deployment's integration config, read at load, enables and configures it; the SDK stays its own chunk. Not a flag service: install state is long-lived configuration, and a service adds an SDK and a server.
- **Sep 29: decision 2, the DSN comes from the integration config.** Not build-time env (one build per deployment) and not `localStorage` (anyone could point the app's telemetry elsewhere).
- **Sep 29: the registry, config port and catalog move to the Integrations foundation,** which comes before §3. This plan keeps what is specific to Sentry.
- **Sep 29: sample rates are config fields;** their production values are still decision 4.
- **Sep 30: 06 follows the 07 edit MVP and 07 stage 3.** §1 comes right after stage 3, which changes how queries run.
- **Sep 30: query errors are reported from `QueryCache.onError`,** once per failed request; boundaries report render errors only.
- **Sep 30: a reportability policy on `AppError`** replaces dropping `network` and `not_found` by code.
- **Sep 30: reports made before the SDK loads are buffered;** loading starts in `main.tsx`.
- **Sep 30: source maps match through Debug IDs;** a release is optional.
- **Sep 30: the SDK major stays pinned;** the v11 upgrade is separate.

## Verification

- **Default config (nothing enabled):** no Sentry chunk is fetched, first load stays within the bundle budget, and no request goes to `*.sentry.io`.
- **Sentry enabled in the config of a preview build:**
  - a thrown widget error, a route error and a failed mutation each appear once, with their tags
  - a failed datasource query appears once, even when two widgets show it
  - an error thrown during the first render arrives
  - an offline refetch, an abort and a 404 on a typed URL send nothing; a 5xx sends one event
  - a replay only exists for an error session, with masked text
- **Invalid Sentry entry:** the SDK doesn't load, and the Sentry page shows why.
- **Build output:** `dist/` contains no `.map` files after a CI build with the token.
