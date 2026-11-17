import { describe, expect, it } from 'vite-plus/test';
import { renderHook } from '@/testing/render';
import { usePlugins } from '@/plugins/usePlugins';

describe('PluginsProvider', () => {
  it('keeps the plugins value between renders', () => {
    const { result, rerender } = renderHook(() => usePlugins());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
