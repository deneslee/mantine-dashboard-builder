import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { wait } from './wait';

describe('wait', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resolves after the delay', async () => {
    const done = vi.fn();
    void wait(100).then(done);
    await vi.advanceTimersByTimeAsync(99);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalled();
  });

  it('rejects with an AbortError when the signal aborts', async () => {
    const controller = new AbortController();
    const pending = wait(100, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects at once when the signal is already aborted', async () => {
    await expect(wait(100, AbortSignal.abort())).rejects.toMatchObject({ name: 'AbortError' });
  });
});
