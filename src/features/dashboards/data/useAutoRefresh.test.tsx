import { act, renderHook } from '@/testing/render';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoRefresh } from './useAutoRefresh';

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  act(() => void document.dispatchEvent(new Event('visibilitychange')));
}

function setup(refresh: string) {
  const onRefresh = vi.fn();
  const hook = renderHook((props: { refresh: string }) => useAutoRefresh(props.refresh, onRefresh), {
    initialProps: { refresh },
  });
  return { onRefresh, hook };
}

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe('useAutoRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
  });
  afterEach(() => vi.useRealTimers());

  it('refreshes once per tick', () => {
    const { onRefresh } = setup('30s');
    advance(90_000);
    expect(onRefresh).toHaveBeenCalledTimes(3);
  });

  it('never ticks with refresh off', () => {
    const { onRefresh } = setup('off');
    advance(10 * 60_000);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('pauses while the tab is hidden', () => {
    const { onRefresh } = setup('30s');
    setVisibility('hidden');
    advance(120_000);
    expect(onRefresh).not.toHaveBeenCalled();

    setVisibility('visible');
    advance(30_000);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('follows a new interval', () => {
    const { onRefresh, hook } = setup('1m');
    hook.rerender({ refresh: '30s' });
    advance(60_000);
    expect(onRefresh).toHaveBeenCalledTimes(2);
    hook.rerender({ refresh: 'off' });
    advance(60_000);
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });
});
