import * as Sentry from '@sentry/react';
import type { SentryStatus } from './types';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const tracesSampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 1.0);
  const replaysSessionSampleRate = Number(import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0.1);
  const replaysOnErrorSampleRate = Number(import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? 1.0);

  Sentry.init({
    dsn: dsn || undefined,
    environment: import.meta.env.VITE_SENTRY_ENV ?? import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE ?? '0.1.0',
    enableLogs: true,
    tracesSampleRate,
    tracePropagationTargets: ['localhost', /^\//],
    replaysSessionSampleRate,
    replaysOnErrorSampleRate,
    integrations: [
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
      Sentry.consoleLoggingIntegration({ levels: ['log', 'info', 'warn', 'error'] }),
    ],
  });

  initialized = true;
}

export function getSentryStatus(): SentryStatus {
  const rawDsn = import.meta.env.VITE_SENTRY_DSN;
  const isConfigured = Boolean(rawDsn && rawDsn.trim().length > 0);

  // Mask DSN if present: https://***@o1234.ingest.sentry.io/5678
  let maskedDsn = 'Not configured';
  if (isConfigured && rawDsn) {
    try {
      const url = new URL(rawDsn);
      maskedDsn = `${url.protocol}//***@${url.host}${url.pathname}`;
    } catch {
      maskedDsn = 'Configured';
    }
  }

  return {
    isConfigured,
    dsn: maskedDsn,
    environment: import.meta.env.VITE_SENTRY_ENV ?? import.meta.env.MODE ?? 'development',
    release: import.meta.env.VITE_SENTRY_RELEASE ?? '0.1.0',
    features: {
      errors: true,
      logs: true,
      metrics: true,
      replay: true,
      tracing: true,
    },
  };
}
