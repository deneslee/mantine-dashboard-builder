import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoRefresh } from './useAutoRefresh';

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  act(() => void document.dispatchEvent(new Event('visibilitychange')));
}

function setup(refresh: string) {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook((props: { refresh: string }) => useAutoRefresh(props.refresh), {
    wrapper,
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
