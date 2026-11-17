import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

function stubWidgets(chartType = 'chart') {
  vi.doMock('@/plugins/datasources/mock/mockDatasource', () => ({ mockDatasource: { id: 'mock' } }));
  vi.doMock('@/plugins/datasources/localJson/localJsonDatasource', () => ({
    localJsonDatasource: { id: 'localJson' },
  }));
  vi.doMock('virtual:optional-plugins', () => ({ build: {}, optionalPlugins: [] }));
  vi.doMock('@/plugins/widgets/kpi/kpiWidget', () => ({ kpiWidget: { type: 'kpi' } }));
  vi.doMock('@/plugins/widgets/chart/chartWidget', () => ({ chartWidget: { type: chartType } }));
  vi.doMock('@/plugins/widgets/chart/rechartsChartWidget', () => ({
    rechartsChartWidget: { type: 'chart-recharts' },
  }));
  vi.doMock('@/plugins/widgets/table/tableWidget', () => ({ tableWidget: { type: 'table' } }));
}

afterEach(() => {
  vi.doUnmock('@/plugins/datasources/mock/mockDatasource');
  vi.doUnmock('@/plugins/datasources/localJson/localJsonDatasource');
  vi.doUnmock('virtual:optional-plugins');
  vi.doUnmock('@/plugins/widgets/kpi/kpiWidget');
  vi.doUnmock('@/plugins/widgets/chart/chartWidget');
  vi.doUnmock('@/plugins/widgets/chart/rechartsChartWidget');
  vi.doUnmock('@/plugins/widgets/table/tableWidget');
  vi.resetModules();
});

describe('plugins', () => {
  it('builds every registry at startup', async () => {
    vi.resetModules();
    stubWidgets();
    const { plugins } = await import('./plugins');
    expect(Object.keys(plugins.widgets)).toEqual(['kpi', 'chart', 'chart-recharts', 'table']);
    expect(plugins.recordProviders).toEqual({});
    expect(plugins.panels).toEqual({});
    expect(plugins.actions).toEqual({});
  });

  it('fails at startup when two plugins share an id', async () => {
    vi.resetModules();
    stubWidgets('kpi');
    await expect(import('./plugins')).rejects.toThrow('Two widget plugins have the id "kpi"');
  });
});
