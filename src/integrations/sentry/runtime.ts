import type { AnyRouter } from '@tanstack/react-router';
// Type-only: erased at build time, so the SDK stays out of this module's chunk.
import type * as ClientModule from './client';
import type * as RouterModule from './router';
import type * as TelemetryModule from './telemetry';
import { loadSentryConfig } from './settings';

/**
 * The app's only entry into Sentry. It never imports the SDK itself: `startSentry` loads it as a
 * separate chunk, in the background and only when a DSN is configured, so pages without Sentry pay
 * nothing on first load. Calls made before the SDK arrives wait for it; without a DSN they do nothing.
 */

type Telemetry = typeof TelemetryModule;
type Sdk = {
  client: typeof ClientModule;
  router: typeof RouterModule;
  telemetry: Telemetry;
};

let sdk: Promise<Sdk> | null = null;

/** Loads and initialises Sentry if a DSN is configured. Safe to call more than once. */
export function startSentry(): void {
  if (sdk || !loadSentryConfig().dsn.trim()) return;
  sdk = Promise.all([import('./client'), import('./router'), import('./telemetry')]).then(
    ([client, router, telemetry]) => {
      client.initSentry();
      return { client, router, telemetry };
    },
  );
  sdk.catch((error: unknown) => console.warn('[sentry] failed to load', error));
}

/** Adds route-change tracing once Sentry is running. */
export function connectRouter(router: AnyRouter): void {
  void sdk?.then(
    (s) => s.router.bindRouterToSentry(router),
    () => {},
  );
}

/** Reports an error to Sentry when it is running; otherwise does nothing. */
export function reportError(error: unknown, hint?: Parameters<Telemetry['captureException']>[1]): void {
  void sdk?.then(
    (s) => s.telemetry.captureException(error, hint),
    () => {},
  );
}
