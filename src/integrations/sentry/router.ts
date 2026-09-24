import * as Sentry from '@sentry/react';
import type { AnyRouter } from '@tanstack/react-router';

/**
 * Binds TanStack Router to Sentry to capture route navigation spans and parameterize transaction names.
 */
export function bindRouterToSentry(router: AnyRouter): void {
  try {
    Sentry.addIntegration(Sentry.tanstackRouterBrowserTracingIntegration(router));
  } catch (error) {
    // Non-fatal if Sentry client is not initialized or in testing
    console.warn('[sentry] Failed to bind router tracing integration', error);
  }
}
