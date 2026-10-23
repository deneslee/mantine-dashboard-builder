import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { AppError } from '@/core/errors/AppError';
import { storageKey } from '../storage';

const initSentry = vi.fn();
const captureException = vi.fn();
const addBreadcrumb = vi.fn();
const bindRouterToSentry = vi.fn();
vi.mock('./client', () => ({ initSentry }));
vi.mock('./telemetry', () => ({ captureException, addBreadcrumb }));
vi.mock('./router', () => ({ bindRouterToSentry }));

const DSN = 'https://key@o1.ingest.sentry.io/1';

/**
 * A fresh copy of the runtime (it keeps module state) with the given stored DSN, and the `AppError`
 * class of that copy: errors built from the test file's own import fail its `instanceof`.
 */
async function runtime(dsn: string) {
  localStorage.setItem(storageKey('sentry'), JSON.stringify({ dsn }));
  vi.resetModules();
  const [r, errors] = await Promise.all([import('./runtime'), import('@/core/errors/AppError')]);
  return { ...r, AppError: errors.AppError };
}

/** A runtime whose SDK has loaded. */
async function started() {
  const r = await runtime(DSN);
  r.startSentry();
  await vi.dynamicImportSettled();
  return r;
}

/** Lets queued `then` callbacks run. */
const flush = () => new Promise((resolve) => setTimeout(resolve));

beforeEach(() => vi.stubEnv('VITE_SENTRY_DSN', ''));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('sentry runtime', () => {
  it('loads nothing and listens to nothing without a DSN', async () => {
    const listen = vi.spyOn(window, 'addEventListener');
    const { startSentry, reportError, addBreadcrumb: addCrumb } = await runtime('');
    startSentry();
    reportError(new Error('boom'));
    addCrumb({ message: 'Saved' });
    await vi.dynamicImportSettled();

    expect(initSentry).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
  });

  it('starts the SDK once and forwards the router', async () => {
    const { startSentry, connectRouter } = await runtime(DSN);
    startSentry();
    startSentry();
    connectRouter({} as never);
    await vi.dynamicImportSettled();

    expect(initSentry).toHaveBeenCalledTimes(1);
    expect(bindRouterToSentry).toHaveBeenCalledTimes(1);
  });

  it('sends an error reported while the SDK loads once it has started', async () => {
    const { startSentry, reportError } = await runtime(DSN);
    startSentry();
    const error = new Error('early boom');
    reportError(error, { tags: { boundary: 'route' } });
    expect(captureException).not.toHaveBeenCalled();

    await vi.dynamicImportSettled();
    expect(captureException).toHaveBeenCalledExactlyOnceWith(error, {
      level: 'error',
      tags: { code: 'unknown', boundary: 'route' },
      fingerprint: undefined,
    });
  });

  it.each([
    { label: 'an abort', make: () => new DOMException('Aborted', 'AbortError'), isReported: false },
    {
      label: 'a 404',
      make: (E: typeof AppError) => new E('not_found', 'No such dashboard.'),
      isReported: false,
    },
    {
      label: 'a server error',
      make: (E: typeof AppError) => new E('unknown', 'Request failed with status 503.'),
      isReported: true,
    },
    {
      label: 'data in the wrong shape',
      make: (E: typeof AppError) => new E('validation', 'This dashboard has an unexpected format.'),
      isReported: true,
    },
  ])('reports $label: $isReported', async ({ make, isReported }) => {
    const { reportError, AppError: RuntimeAppError } = await started();
    reportError(make(RuntimeAppError));
    await flush();
    expect(captureException).toHaveBeenCalledTimes(isReported ? 1 : 0);
  });

  it('drops fetch failures while offline and sends them as warnings while online', async () => {
    const { reportError } = await started();
    vi.stubGlobal('navigator', { onLine: false });
    reportError(new TypeError('Failed to fetch'));
    vi.unstubAllGlobals();
    const online = new TypeError('Failed to fetch');
    reportError(online);
    await flush();

    expect(captureException).toHaveBeenCalledExactlyOnceWith(
      online,
      expect.objectContaining({ level: 'warning' }),
    );
  });

  it('sends an error once, however many places report it', async () => {
    const { reportError, AppError: RuntimeAppError } = await started();
    const error = new RuntimeAppError('datasource', 'Haystack returned 502.');
    reportError(error, { tags: { boundary: 'query' } });
    reportError(error, { tags: { boundary: 'widget' } });
    await flush();
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('keeps at most 20 reports while the SDK loads', async () => {
    const { startSentry, reportError } = await runtime(DSN);
    startSentry();
    for (let i = 0; i < 25; i++) reportError(new Error(`error ${i}`));
    await vi.dynamicImportSettled();
    expect(captureException).toHaveBeenCalledTimes(20);
  });

  it('adds a breadcrumb before the capture that follows it', async () => {
    const { reportError, addBreadcrumb: addCrumb } = await started();
    addCrumb({ message: 'Could not save' });
    reportError(new Error('save failed'));
    await flush();
    expect(addBreadcrumb).toHaveBeenCalledBefore(captureException);
  });

  it('reports global errors while the SDK loads, then leaves them to the SDK', async () => {
    const { startSentry } = await runtime(DSN);
    startSentry();
    const early = new Error('crash while loading');
    window.dispatchEvent(new ErrorEvent('error', { error: early }));
    await vi.dynamicImportSettled();
    await flush();
    // Stands in for the SDK's own handler; with no listener left, jsdom calls the error uncaught.
    const sdkHandler = vi.fn();
    window.addEventListener('error', sdkHandler);
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('crash after') }));
    window.removeEventListener('error', sdkHandler);
    await flush();

    expect(captureException).toHaveBeenCalledExactlyOnceWith(
      early,
      expect.objectContaining({ tags: { code: 'unknown', boundary: 'global' } }),
    );
  });
});
