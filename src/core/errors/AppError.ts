export type AppErrorCode =
  'not_found' | 'network' | 'timeout' | 'validation' | 'datasource' | 'forbidden' | 'unknown';

/**
 * The one error shape the UI understands. Each feature's `api/mapper.ts` turns transport
 * errors into this; components never inspect `fetch` responses.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly isRetryable: boolean;
  readonly details?: unknown;

  constructor(
    code: AppErrorCode,
    message: string,
    opts: { cause?: unknown; isRetryable?: boolean; details?: unknown } = {},
  ) {
    super(message, { cause: opts.cause });
    this.name = 'AppError';
    this.code = code;
    this.isRetryable =
      opts.isRetryable ?? (code === 'network' || code === 'timeout' || code === 'datasource');
    this.details = opts.details;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

/** Normalises anything thrown into an AppError. */
export function toAppError(e: unknown): AppError {
  if (isAppError(e)) return e;
  if (e instanceof DOMException && e.name === 'AbortError')
    return new AppError('timeout', 'The request was cancelled.', { cause: e });
  if (e instanceof TypeError && /fetch|network/i.test(e.message))
    return new AppError('network', 'Could not reach the server. Check your connection.', { cause: e });
  if (e instanceof Error) return new AppError('unknown', e.message || 'Something went wrong.', { cause: e });
  return new AppError('unknown', 'Something went wrong.', { cause: e });
}

/** Title per code: what happened, in plain words. */
export const ERROR_TITLES: Record<AppErrorCode, string> = {
  not_found: 'Not found',
  network: 'Connection problem',
  timeout: 'Request timed out',
  validation: 'Invalid data',
  datasource: 'Data source error',
  forbidden: 'No access',
  unknown: 'Something went wrong',
};
