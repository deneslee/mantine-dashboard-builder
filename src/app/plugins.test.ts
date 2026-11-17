import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

afterEach(() => {
  vi.doUnmock('@/plugins/widgets/chart/chartWidget');
  vi.resetModules();
});

describe('plugins', () => {
  it('builds every registry at startup', { timeout: 30_000 }, async () => {
    const { plugins } = await import('./plugins');
    expect(Object.keys(plugins.widgets)).toEqual(['kpi', 'chart', 'table']);
    expect(plugins.recordProviders).toEqual({});
    expect(plugins.panels).toEqual({});
    expect(plugins.actions).toEqual({});
  });

  it('fails at startup when two plugins share an id', { timeout: 30_000 }, async () => {
    vi.resetModules();
    vi.doMock('@/plugins/widgets/chart/chartWidget', () => ({ chartWidget: { type: 'kpi' } }));
    await expect(import('./plugins')).rejects.toThrow('Two widget plugins have the id "kpi"');
  });
});
