# Research: Sentry Integration (Errors, Logs, App Metrics, Session Replay, Tracing)

Reference: [plan-04.md](../plan/plan-04.md)
Date: Sep 24, 2026

## Objective
Analyze the requirements, architectural touchpoints, modular folder structure (`src/integrations/`), and UI navigation (Integrations view with Grid/Row view-changer and dedicated Sentry status/settings/verification hub) for Sentry integration in the Mantine dashboard builder.

## Architectural Requirements
1. **Modular Integration Package (`src/integrations/sentry/`)**:
   - Isolate Sentry logic into a dedicated directory (`src/integrations/sentry/` and `src/integrations/registry.ts`).
   - Ensures future monorepo extraction into a separate package (e.g. `packages/integrations-sentry`) with zero frontend refactoring.
   - Clean boundaries: export client initialization, router tracing integration, telemetry wrappers (`logger`, `metrics`), and Mantine UI components.

2. **Integrations Navigation & UI Hub**:
   - Sidebar item in `nav.ts`: `Integrations` (icon: `IconPlugConnected` or `IconPuzzle`).
   - Route `/integrations`:
     - Header with title, search, and **View Changer** (Grid view vs Row/List view using `SegmentedControl` or `ActionIcon.Group`).
     - Pluggable integration cards (Sentry featured with status, description, active feature pills: Errors, Logs, Metrics, Replay, Tracing).
   - Route `/integrations/sentry`:
     - **Immediate Verification Hub**: Official Sentry "Break the world" test button (combining `Sentry.logger.info`, `Sentry.metrics.count`, `throw new Error`) + granular test buttons.
     - **Status Overview**: DSN status (configured / missing), environment, release, SDK version, and health indicators for all 5 subsystems.
     - **Settings & Info**: Environment variable instructions, sample rate controls, links to Sentry dashboard.
   - **Immediate Accessibility**:
     - Also provide a quick-verification banner/button on the main overview or dev shell so the connection can be tested immediately upon launch.

3. **Sentry Onboarding Configuration**:
   - Package: `@sentry/react` (and devDependency `@sentry/vite-plugin`).
   - Sentry initialization with:
     - `enableLogs: true` (unlocks `Sentry.logger.info/warn/error`)
     - `tracesSampleRate: 1.0` (with `tracePropagationTargets: ['localhost', /^\//]`)
     - `replaysSessionSampleRate: 0.1`
     - `replaysOnErrorSampleRate: 1.0`
     - Integrations: `replayIntegration()`, `consoleLoggingIntegration()`, and `tanstackRouterBrowserTracingIntegration(router)`
   - Full support for `Sentry.logger` and `Sentry.metrics`.
