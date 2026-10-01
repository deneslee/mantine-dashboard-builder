import { createQueryClient } from '@/app/queryClient';
import { act, renderHook } from '@/testing/render';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoRefresh } from './useAutoRefresh';

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  act(() => void document.dispatchEvent(new Event('visibilitychange')));
}

function setup(refresh: string) {
  const queryClient = createQueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
  const hook = renderHook((props: { refresh: string }) => useAutoRefresh(props.refresh), {
    queryClient,
    initialProps: { refresh },
  });
  return { invalidate, hook };
}

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe('useAutoRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
  });
  afterEach(() => vi.useRealTimers());

  it('invalidates the widget queries once per tick', () => {
    const { invalidate } = setup('30s');
    advance(90_000);
    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['ds'] });
  });

  it('never ticks with refresh off', () => {
    const { invalidate } = setup('off');
    advance(10 * 60_000);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('pauses while the tab is hidden', () => {
    const { invalidate } = setup('30s');
    setVisibility('hidden');
    advance(120_000);
    expect(invalidate).not.toHaveBeenCalled();

    setVisibility('visible');
    advance(30_000);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('follows a new interval', () => {
    const { invalidate, hook } = setup('1m');
    hook.rerender({ refresh: '30s' });
    advance(60_000);
    expect(invalidate).toHaveBeenCalledTimes(2);
    hook.rerender({ refresh: 'off' });
    advance(60_000);
    expect(invalidate).toHaveBeenCalledTimes(2);
  });
});
