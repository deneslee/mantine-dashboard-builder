import { describe, expect, it } from 'vitest';
import { AppError, toAppError } from './AppError';

describe('toAppError', () => {
  it('keeps AppErrors as they are', () => {
    const e = new AppError('validation', 'Bad shape');
    expect(toAppError(e)).toBe(e);
  });

  it('maps fetch failures to retryable network errors', () => {
    const e = toAppError(new TypeError('Failed to fetch'));
    expect(e.code).toBe('network');
    expect(e.retryable).toBe(true);
  });

  it('maps aborts to timeout', () => {
    expect(toAppError(new DOMException('Aborted', 'AbortError')).code).toBe('timeout');
  });

  it('wraps unknown values without losing the cause', () => {
    const e = toAppError('boom');
    expect(e.code).toBe('unknown');
    expect(e.cause).toBe('boom');
    expect(e.retryable).toBe(false);
  });
});
