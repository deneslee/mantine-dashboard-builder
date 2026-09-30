import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MOTION_STORAGE_KEY, useMotion, useMotionPreference } from './useMotion';

const matchMedia = window.matchMedia;

/** Stubs the OS `prefers-reduced-motion` answer. */
function osReducesMotion(reduce: boolean) {
  window.matchMedia = (query: string) => {
    const list = matchMedia(query);
    return Object.assign(Object.create(list) as MediaQueryList, {
      matches: reduce && query.includes('prefers-reduced-motion'),
    });
  };
}

afterEach(() => {
  window.matchMedia = matchMedia;
});

describe('useMotion', () => {
  it('follows the operating system by default', () => {
    expect(renderHook(() => useMotion()).result.current).toEqual({ reduced: false, preference: 'system' });

    osReducesMotion(true);
    expect(renderHook(() => useMotion()).result.current.reduced).toBe(true);
  });

  it('reduces motion when the user chose "reduce", whatever the operating system says', () => {
    localStorage.setItem(MOTION_STORAGE_KEY, 'reduce');
    expect(renderHook(() => useMotion()).result.current).toEqual({ reduced: true, preference: 'reduce' });
  });

  it('reads an unknown stored value as "system"', () => {
    localStorage.setItem(MOTION_STORAGE_KEY, '"fast"');
    expect(renderHook(() => useMotion()).result.current.preference).toBe('system');
  });

  it('updates every reader when the setting is saved', () => {
    const reader = renderHook(() => useMotion());
    const writer = renderHook(() => useMotionPreference());

    act(() => writer.result.current[1]('reduce'));
    expect(reader.result.current.reduced).toBe(true);
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe('reduce');
  });
});
