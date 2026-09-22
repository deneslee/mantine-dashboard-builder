import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDelayedPending } from './useDelayedPending';

describe('useDelayedPending', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('stays hidden for fast loads', () => {
    const { result, rerender } = renderHook(({ p }) => useDelayedPending(p, 300, 400), {
      initialProps: { p: true },
    });
    act(() => vi.advanceTimersByTime(200));
    rerender({ p: false });
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(false);
  });

  it('shows after the delay and stays for the minimum time', () => {
    const { result, rerender } = renderHook(({ p }) => useDelayedPending(p, 300, 400), {
      initialProps: { p: true },
    });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe(true);
    rerender({ p: false });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe(false);
  });
});
