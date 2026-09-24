import * as Sentry from '@sentry/react';
import { loadSentryConfig, type SentryConfig } from './settings';
import type { SentryStatus } from './types';

let currentConfig: SentryConfig = loadSentryConfig();

export function initSentry(overrideConfig?: SentryConfig): void {
  if (overrideConfig) {
    currentConfig = overrideConfig;
  } else {
    currentConfig = loadSentryConfig();
  }

  Sentry.init({
    dsn: currentConfig.dsn.trim() ? currentConfig.dsn.trim() : undefined,
    environment: currentConfig.environment || 'development',
    release: currentConfig.release || '0.1.0',
    enableLogs: currentConfig.enableLogs,
    tracesSampleRate: currentConfig.tracesSampleRate,
    tracePropagationTargets: ['localhost', /^\//],
    replaysSessionSampleRate: currentConfig.replaysSessionSampleRate,
    replaysOnErrorSampleRate: currentConfig.replaysOnErrorSampleRate,
    integrations: [
      // Sentry's privacy defaults: replays mask all text and block media, so user data never leaves the page.
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
      // Only problems, not every debug log.
      Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
    ],
  });
}

export function reconfigureSentry(newConfig: SentryConfig): void {
  currentConfig = newConfig;
  initSentry(newConfig);
}

export function getActiveSentryConfig(): SentryConfig {
  return currentConfig;
}

export function getReplaySessionId(): string | null {
  try {
    const replay = Sentry.getReplay();
    return replay?.getReplayId() ?? null;
  } catch {
    return null;
  }
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  durationMs: number;
  eventId?: string;
}

/**
 * Sends a lightweight verification ping to Sentry and checks transport flush.
 */
export async function testSentryConnection(): Promise<ConnectionTestResult> {
  const start = performance.now();
  const dsn = currentConfig.dsn.trim();

  if (!dsn) {
    return {
      ok: false,
      message: 'No DSN provided. Please configure your DSN in Settings.',
      durationMs: 0,
    };
  }

  try {
    new URL(dsn);
  } catch {
    return {
      ok: false,
      message: 'Invalid DSN format. Must be a valid URL like https://<key>@o<org>.ingest.sentry.io/<project>',
      durationMs: 0,
    };
  }

  try {
    const eventId = Sentry.captureMessage('Sentry integration connection verification ping', {
      level: 'info',
      tags: { source: 'dashboard_connection_test' },
    });

    // Flush queued events within 3000ms
    const flushed = await Sentry.flush(3000);
    const durationMs = Math.round(performance.now() - start);

    if (flushed) {
      return {
        ok: true,
        message: `Successfully connected and delivered envelope to Sentry in ${durationMs}ms.`,
        durationMs,
        eventId,
      };
    }

    return {
      ok: true,
      message: `Event queued (${eventId}), but transport flush timed out after ${durationMs}ms. Event will retry in background.`,
      durationMs,
      eventId,
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown transport error occurred.',
      durationMs,
    };
  }
}

export function getSentryStatus(): SentryStatus {
  const rawDsn = currentConfig.dsn.trim();
  const isConfigured = Boolean(rawDsn.length > 0);

  let maskedDsn = 'Not configured';
  if (isConfigured) {
    try {
      const url = new URL(rawDsn);
      maskedDsn = `${url.protocol}//***@${url.host}${url.pathname}`;
    } catch {
      maskedDsn = 'Configured (invalid format)';
    }
  }

  return {
    isConfigured,
    dsn: maskedDsn,
    environment: currentConfig.environment || 'development',
    release: currentConfig.release || '0.1.0',
    features: {
      errors: true,
      logs: currentConfig.enableLogs,
      metrics: true,
      replay: true,
      tracing: true,
    },
  };
}
