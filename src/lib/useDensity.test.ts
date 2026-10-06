import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DENSITY_STORAGE_KEY, useDensity } from './useDensity';

describe('useDensity', () => {
  it('is comfortable by default and for anything unexpected in storage', () => {
    expect(renderHook(() => useDensity()).result.current[0]).toBe('comfortable');
    localStorage.setItem(DENSITY_STORAGE_KEY, 'cosy');
    expect(renderHook(() => useDensity()).result.current[0]).toBe('comfortable');
  });

  it('updates every reader when it is saved', () => {
    const reader = renderHook(() => useDensity());
    const writer = renderHook(() => useDensity());
    act(() => writer.result.current[1]('spacious'));
    expect(reader.result.current[0]).toBe('spacious');
    expect(localStorage.getItem(DENSITY_STORAGE_KEY)).toBe('spacious');
  });
});
