import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const initSentry = vi.fn();
const captureException = vi.fn();
const bindRouterToSentry = vi.fn();
vi.mock('./client', () => ({ initSentry }));
vi.mock('./telemetry', () => ({ captureException }));
vi.mock('./router', () => ({ bindRouterToSentry }));

/** A fresh copy of the runtime (it keeps module state) with the given stored DSN. */
async function runtime(dsn: string) {
  localStorage.setItem('sentry.config.v1', JSON.stringify({ dsn }));
  vi.resetModules();
  return import('./runtime');
}

beforeEach(() => vi.stubEnv('VITE_SENTRY_DSN', ''));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('sentry runtime', () => {
  it('does not load or start the SDK without a DSN', async () => {
    const { startSentry, reportError } = await runtime('');
    startSentry();
    reportError(new Error('boom'));
    await vi.dynamicImportSettled();

    expect(initSentry).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it('starts the SDK once and forwards errors and the router when a DSN is set', async () => {
    const { startSentry, reportError, connectRouter } = await runtime('https://key@o1.ingest.sentry.io/1');
    startSentry();
    startSentry();
    const error = new Error('boom');
    reportError(error, { tags: { boundary: 'app_root' } });
    connectRouter({} as never);
    await vi.dynamicImportSettled();

    expect(initSentry).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(error, { tags: { boundary: 'app_root' } });
    expect(bindRouterToSentry).toHaveBeenCalledTimes(1);
  });
});
