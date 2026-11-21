import type { AnyRouter } from '@tanstack/react-router';
import { toAppError, type AppError } from '@/core/errors/AppError';
// Type-only: erased at build time, so the SDK stays out of this module's chunk.
import type * as ClientModule from './client';
import type * as RouterModule from './router';
import type * as TelemetryModule from './telemetry';
import { loadSentryConfig, resetSentryConfig, saveSentryConfig, type SentryConfig } from './sentryConfig';
import type { SentryStatus } from './types';

/**
 * The app's only entry into Sentry. It never imports the SDK itself: `startSentry` loads it as a
 * separate chunk, in the background and only when a DSN is configured, so pages without Sentry pay
 * nothing on first load. Calls made while the SDK loads wait on its promise; without a DSN there is
 * no promise and every call returns on its first line.
 *
 * Sentry is optional: with no DSN the app runs, builds and tests the same. The SDK starts at most
 * once per page load; a config saved after that applies on the next load.
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
/** The config the SDK started with; null while Sentry is off. */
let activeConfig: SentryConfig | null = null;
/** Kept so a start after the router exists (a DSN saved in settings) still traces navigation. */
let appRouter: AnyRouter | null = null;
/** The SDK once its chunk has loaded. */
let loaded: Sdk | null = null;
let queued = 0;
// The same error can reach the query cache and then a boundary; send it once.
const reported = new WeakSet<object>();

/** Loads and initialises Sentry if a DSN is configured. Safe to call more than once. */
export function startSentry(config: SentryConfig = loadSentryConfig()): void {
  if (sdk || !config.dsn.trim()) return;
  activeConfig = config;
  sdk = Promise.all([import('./client'), import('./router'), import('./telemetry')]).then(
    ([client, router, telemetry]) => {
      client.initSentry(config);
      if (appRouter) router.bindRouterToSentry(appRouter);
      loaded = { client, router, telemetry };
      return loaded;
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

/** Adds route-change tracing once Sentry is running, also when it starts later. */
export function connectRouter(router: AnyRouter): void {
  appRouter = router;
  loaded?.router.bindRouterToSentry(router);
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

/** The SDK calls the integrations page uses to verify delivery. */
export type SentryTools = Telemetry;

/** The SDK calls, once Sentry is running; null while it is off or failed to load. */
export async function getSentryTools(): Promise<SentryTools | null> {
  if (!sdk) return null;
  try {
    return (await sdk).telemetry;
  } catch {
    return null;
  }
}

/** What the settings page shows. Reads the config only: it never loads the SDK. */
export function getSentryStatus(): SentryStatus {
  const saved = loadSentryConfig();
  const config = activeConfig ?? saved;
  const rawDsn = config.dsn.trim();
  const isRunning = activeConfig !== null;

  let dsn = 'Not configured';
  if (rawDsn) {
    try {
      const url = new URL(rawDsn);
      dsn = `${url.protocol}//***@${url.host}${url.pathname}`;
    } catch {
      dsn = 'Configured (invalid format)';
    }
  }

  return {
    isConfigured: Boolean(rawDsn),
    isRunning,
    needsReload: isRunning && JSON.stringify(saved) !== JSON.stringify(activeConfig),
    dsn,
    environment: config.environment || 'development',
    release: config.release || '0.1.0',
    features: {
      errors: isRunning,
      logs: isRunning && config.enableLogs,
      metrics: isRunning,
      replay: isRunning && (config.replaysSessionSampleRate > 0 || config.replaysOnErrorSampleRate > 0),
      tracing: isRunning && config.tracesSampleRate > 0,
    },
  };
}

/** The config the settings form edits: the running one, else the saved one. */
export function getSentryConfig(): SentryConfig {
  return activeConfig ?? loadSentryConfig();
}

/**
 * `started`: Sentry was off and starts now. `reload`: Sentry is running, the change applies on the
 * next load. `off`: no DSN, Sentry stays off.
 */
export type ApplyResult = 'started' | 'reload' | 'off';

/** Saves the config. Starts Sentry if it is off and the config has a DSN; never starts it twice. */
export function applySentryConfig(config: SentryConfig): ApplyResult {
  saveSentryConfig(config);
  if (sdk) return 'reload';
  if (!config.dsn.trim()) return 'off';
  startSentry(config);
  return 'started';
}

/** Clears the saved config and returns the defaults from the environment. */
export function resetSentry(): { config: SentryConfig; result: ApplyResult } {
  const config = resetSentryConfig();
  if (sdk) return { config, result: 'reload' };
  if (!config.dsn.trim()) return { config, result: 'off' };
  startSentry(config);
  return { config, result: 'started' };
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  durationMs: number;
  eventId?: string;
}

/** Sends a small verification message to Sentry and waits for the transport to flush. */
export async function testSentryConnection(): Promise<ConnectionTestResult> {
  const tools = await getSentryTools();
  if (!tools) {
    return { ok: false, message: 'Sentry is off (no DSN). Add a DSN in Settings.', durationMs: 0 };
  }
  const start = performance.now();
  try {
    const eventId = tools.captureMessage('Sentry integration connection verification ping', {
      level: 'info',
      tags: { source: 'dashboard_connection_test' },
    });
    const flushed = await tools.flush(3000);
    const durationMs = Math.round(performance.now() - start);
    return {
      ok: true,
      message: flushed
        ? `Event delivered to Sentry in ${durationMs}ms.`
        : `Event queued (${eventId}), but the flush timed out after ${durationMs}ms. Sentry retries in the background.`,
      durationMs,
      eventId,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown transport error.',
      durationMs: Math.round(performance.now() - start),
    };
  }
}
