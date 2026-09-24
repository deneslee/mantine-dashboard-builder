# Tasks: Sentry Observability & Integrations Hub

Sep 24, 2026 · v1.2.0 · Reference: [plan-04.md](../plan/plan-04.md)

- [x] **Install Sentry SDK and build plugin.** Add `@sentry/react` and devDependency `@sentry/vite-plugin` using pnpm.
- [x] **Create modular `src/integrations/` structure.** Implement `src/integrations/types.ts` and `src/integrations/registry.ts` defining integration contracts for future monorepo extraction.
- [x] **Build isolated `src/integrations/sentry/` module.** Implement client initialization, `tanstackRouterBrowserTracingIntegration` router binding, `Sentry.logger` & `Sentry.metrics` telemetry helpers, and status inspection types.
- [x] **Build Sentry UI components.** Create `SentryIcon`, `SentryVerificationCard`, and `SentryStatusCard` components using Mantine 9.6.2.
- [x] **Connect root error boundary to Sentry.** Update `App.tsx` (AppCrash) to report fatal exceptions to Sentry.
- [x] **Add Integrations navigation and routes.** Add `/integrations` item to sidebar `nav.ts`; implement `/integrations/` route with Grid vs Row view-changer; implement `/integrations/sentry` route with immediate verification and status hub.
- [x] **Configure Vite plugin and production sourcemaps.** Update `vite.config.ts` with `sentryVitePlugin` and `build.sourcemap: 'hidden'` enabled safely when auth token is present.
- [x] **Add environment templates.** Create `.env.example` and `.env.local` guide for Sentry credentials.
- [x] **Validate typecheck, build, and tests.** Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` to verify clean integration.
