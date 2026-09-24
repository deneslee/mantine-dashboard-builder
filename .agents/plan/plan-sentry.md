# Plan 04: Sentry Observability & Integrations Hub

Sep 24, 2026 · v1.2.0 · Tasks: [task-r04-01.md](./tasks/task-r04-01.md) · Research: [research-r04-sentry-integration.md](./research/research-r04-sentry-integration.md)

## Objective
1. Fully integrate Sentry into the Vite 8 + React 19 + TanStack Router + Mantine dashboard builder application covering all 5 features configured on Sentry: **Error Tracking**, **Logs**, **App Metrics**, **Session Replay**, and **Tracing**.
2. Encapsulate all integration logic within an isolated `src/integrations/sentry/` module to prepare for future monorepo extraction.
3. Build an **Integrations Hub** in the UI:
   - Sidebar navigation entry (`/integrations`).
   - Integrations catalog supporting a **Grid vs. Row view changer** (`IconLayoutGrid` vs `IconList`).
   - Sentry integration card linking to `/integrations/sentry`.
   - Dedicated Sentry page with live **Status**, **Settings/Info**, and **Immediate Verification Hub** featuring Sentry's official "Break the world" verification button.

## Architectural Design

### 1. Isolated `src/integrations/` Architecture
To allow future separation into a monorepo package (e.g. `packages/integrations-sentry`), all Sentry-specific logic lives under `src/integrations/`:
```
src/integrations/
  sentry/
    client.ts             # Sentry.init, sample rates, replay, logs, tracing
    router.ts             # tanstackRouterBrowserTracingIntegration binding
    telemetry.ts          # Sentry.logger and Sentry.metrics wrappers
    types.ts              # Configuration and status types
    components/
      SentryIcon.tsx       # Official Sentry brand SVG icon
      SentryVerification.tsx# "Break the world" + granular test buttons
      SentryStatus.tsx     # Live status and subsystem indicators
      SentrySettings.tsx   # DSN and environment info/controls
    index.ts              # Public API of Sentry integration
  registry.ts             # Pluggable integration registry (Sentry + future integrations)
  types.ts                # Generic Integration definition
  index.ts                # Public API of integrations feature
```

### 2. Sentry Client Initialization (`src/integrations/sentry/client.ts`)
* Configured according to the official Sentry onboarding wizard:
  * `dsn: import.meta.env.VITE_SENTRY_DSN`
  * `environment: import.meta.env.MODE`
  * `release: import.meta.env.VITE_SENTRY_RELEASE`
  * `enableLogs: true` (activates `Sentry.logger`)
  * `tracesSampleRate`: default `1.0` in dev, `0.1` in prod (configurable via `VITE_SENTRY_TRACES_SAMPLE_RATE`)
  * `tracePropagationTargets: ['localhost', /^\//]`
  * `replaysSessionSampleRate`: default `0.1` (configurable via `VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE`)
  * `replaysOnErrorSampleRate`: `1.0`
  * Integrations:
    * `Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false })`
    * `Sentry.consoleLoggingIntegration({ levels: ['log', 'info', 'warn', 'error'] })`
* If `VITE_SENTRY_DSN` is empty, Sentry initializes in mock/no-op mode so local dev runs without errors.

### 3. TanStack Router Tracing (`src/integrations/sentry/router.ts`)
* Connects the TanStack Router instance using `tanstackRouterBrowserTracingIntegration(router)` inside `createAppRouter()`.
* Ensures all route changes (e.g. `/dashboards/:id`, `/integrations`, `/integrations/sentry`) generate navigation spans and parameter-aware transactions.

### 4. Telemetry: Structured Logs & Metrics (`src/integrations/sentry/telemetry.ts`)
* Exposes `logger` wrapping `Sentry.logger` (`info`, `warn`, `error`, `debug`).
* Exposes `metrics` wrapping `Sentry.metrics` (`count`, `distribution`, `gauge`, `set`).
* Bridges `notify.warning` and `notify.error` in `src/features/notifications/notify.tsx` to `Sentry.logger`.

### 5. Error Boundary Integrations
* Fatal App Boundary (`src/app/App.tsx`): reports fatal crashes to Sentry with `{ boundary: 'app_root' }`.
* Route Error (`src/features/errors/RouteError.tsx`): captures route failures with route ID tag.
* Widget Boundary (`src/features/errors/WidgetBoundary.tsx`): captures isolated widget failures.
* TanStack Query Cache (`src/app/queryClient.ts`): captures unhandled mutations and refetch failures.

### 6. Integrations UI Hub
* **Sidebar Navigation**: Add `Integrations` nav item in `src/features/shell/model/nav.ts`.
* **Route `/integrations`** (`src/routes/integrations/index.tsx`):
  * Search bar + View Changer (`SegmentedControl` switching between Grid and Row layout).
  * Sentry Card/Row: Sentry logo, name, status badge, feature tags (Errors, Logs, Metrics, Replay, Tracing), description, and link to `/integrations/sentry`.
* **Route `/integrations/sentry`** (`src/routes/integrations/sentry.tsx`):
  * **Immediate Verification Section** (placed prominently at top):
    - Official Sentry "Break the world" button (`Sentry.logger.info` $\rightarrow$ `Sentry.metrics.count` $\rightarrow$ `throw new Error`).
    - Granular test buttons: "Send Test Log", "Emit Test Metric", "Capture Handled Error".
  * **Live Status**: DSN detection, environment, release, and live status of each of the 5 features.
  * **Settings & Instructions**: Environment variable guide, sample rates, links to Sentry project.

### 7. Immediate Accessibility on App Launch
* In addition to `/integrations/sentry`, render a quick-verification notification banner or badge on `/dashboards` or in the top navigation bar so the user can verify Sentry connection immediately on first visit.

## Verification Plan
1. `pnpm typecheck` to verify strict TypeScript compliance across all new routes and integrations.
2. `pnpm lint` to ensure zero oxlint/stylelint violations.
3. `pnpm test` to verify Vitest test suite passes.
4. `pnpm build` to verify production bundling with hidden sourcemaps.
5. In browser:
   - Navigate to `/integrations`, test Grid vs Row view switcher.
   - Click Sentry card $\rightarrow$ verify `/integrations/sentry` loads.
   - Click "Break the world" $\rightarrow$ verify log, metric, error, and replay triggers.
