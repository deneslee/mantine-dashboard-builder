import * as Sentry from '@sentry/react';

/** The SDK calls the app uses after start. Reach them through `getSentryTools()` in runtime.ts. */
export const logger = Sentry.logger;
export const metrics = Sentry.metrics;
export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
export const addBreadcrumb = Sentry.addBreadcrumb;
export const flush = Sentry.flush;

/** The current Session Replay id, or null when Replay is not recording. */
export function getReplayId(): string | null {
  try {
    return Sentry.getReplay()?.getReplayId() ?? null;
  } catch {
    return null;
  }
}
