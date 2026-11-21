import * as Sentry from '@sentry/react';
import type { SentryConfig } from './sentryConfig';

let isStarted = false;

/**
 * Starts the SDK with `config`. It runs at most once per page load: a second `Sentry.init` is not
 * supported (it adds a second Replay instance), so a changed config takes effect after a reload.
 */
export function initSentry(config: SentryConfig): void {
  if (isStarted) return;
  isStarted = true;
  Sentry.init({
    dsn: config.dsn.trim() || undefined,
    environment: config.environment || 'development',
    release: config.release || '0.1.0',
    enableLogs: config.enableLogs,
    tracesSampleRate: config.tracesSampleRate,
    tracePropagationTargets: ['localhost', /^\//],
    replaysSessionSampleRate: config.replaysSessionSampleRate,
    replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,
    integrations: [
      // Sentry's privacy defaults: replays mask all text and block media, so user data never leaves the page.
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
      // Only problems, not every debug log.
      Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
    ],
  });
}
