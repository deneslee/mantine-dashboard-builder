import type { AnyRouter } from '@tanstack/react-router';
import { toAppError, type AppError } from '@/core/errors/AppError';
// Type-only: erased at build time, so the SDK stays out of this module's chunk.
import type * as ClientModule from './client';
import type * as RouterModule from './router';
import type * as TelemetryModule from './telemetry';
import { loadSentryConfig } from './sentryConfig';

/**
 * The app's only entry into Sentry. It never imports the SDK itself: `startSentry` loads it as a
 * separate chunk, in the background and only when a DSN is configured, so pages without Sentry pay
 * nothing on first load. Calls made while the SDK loads wait on its promise; without a DSN there is
 * no promise and every call returns on its first line.
 */

type Telemetry = typeof TelemetryModule;
type Sdk = {
  client: typeof ClientModule;
  router: typeof RouterModule;
  telemetry: Telemetry;
};

/** What a caller adds to the event: where it failed, and how to group it. */
export interface ReportContext {
  tags?: Record<string, string | undefined>;
  fingerprint?: string[];
}

const MAX_QUEUED = 20;
let sdk: Promise<Sdk> | null = null;
let queued = 0;
// The same error can reach the query cache and then a boundary; send it once.
const reported = new WeakSet<object>();

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

  // Errors outside React while the SDK loads; its own global handlers take over once it starts.
  const handleError = (event: ErrorEvent) => {
    if (event.error) reportError(event.error, { tags: { boundary: 'global' } });
  };
  const handleRejection = (event: PromiseRejectionEvent) =>
    reportError(event.reason, { tags: { boundary: 'unhandled_rejection' } });
  const detach = () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);
  void sdk.then(detach, detach);
}

/** Adds route-change tracing once Sentry is running. */
export function connectRouter(router: AnyRouter): void {
  void sdk?.then(
    (s) => s.router.bindRouterToSentry(router),
    () => {},
  );
}

/** Adds a breadcrumb once Sentry is running; queued in order with `reportError`. */
export function addBreadcrumb(breadcrumb: Parameters<Telemetry['addBreadcrumb']>[0]): void {
  void sdk?.then(
    (s) => s.telemetry.addBreadcrumb(breadcrumb),
    () => {},
  );
}

/**
 * The policy table in plans/06-sentry.md §1: aborts, offline failures and 404s are expected, and so
 * is `forbidden` (a locked connection, credentials without access), which is the user's setup to fix.
 */
function isReportable(error: unknown, e: AppError): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return false;
  if (e.code === 'not_found' || e.code === 'forbidden') return false;
  return e.code !== 'network' || navigator.onLine;
}

/** Sends an error to Sentry unless the policy expects it. Without a DSN it does nothing. */
export function reportError(error: unknown, context: ReportContext = {}): void {
  // ponytail: drops reports past 20 in flight; only a storm while the SDK loads gets there.
  if (!sdk || queued >= MAX_QUEUED) return;
  const e = toAppError(error);
  if (!isReportable(error, e)) return;
  if (error instanceof Object) {
    if (reported.has(error)) return;
    reported.add(error);
  }
  queued++;
  void sdk.then(
    (s) => {
      queued--;
      s.telemetry.captureException(error, {
        level: e.code === 'network' ? 'warning' : 'error',
        tags: { code: e.code, ...context.tags },
        fingerprint: context.fingerprint,
      });
    },
    () => {},
  );
}
