import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { createQueryClient } from '@/app/queryClient';
import { dashboardKeys } from '@/features/dashboards/data/dashboardQueries';
import { mockDatasource } from '@/plugins/datasources/mock/mockDatasource';
import { chartWidget } from '@/plugins/widgets/chart/chartWidget';
import { kpiWidget } from '@/plugins/widgets/kpi/kpiWidget';
import { getActivePlace } from '@/lib/records/activeRecordProvider';
import { testDashboard, testLoaded } from '@/testing/fixtures/dashboards';
import { Route } from './$id';

type Loader = (context: unknown) => Promise<unknown>;

function setup() {
  const dashboard = testDashboard();
  dashboard.widgets.a!.queries = [{ datasource: 'mock', spec: { n: 1 } }];
  dashboard.widgets.b!.queries = [{ datasource: 'mock', spec: { n: 2 } }];
  const queryClient = createQueryClient();
  queryClient.setQueryData(dashboardKeys.detail(getActivePlace().id, dashboard.id), testLoaded(dashboard));
  // Never settles: the loader resolving proves it didn't wait.
  const runQuery = vi.spyOn(mockDatasource, 'query').mockImplementation(() => new Promise<never>(() => {}));
  const preloads = [chartWidget, kpiWidget].map((widget) =>
    vi.spyOn(widget.component, 'preload').mockResolvedValue(undefined),
  );
  const load = (cause: string) =>
    (Route.options.loader as unknown as Loader)({
      context: { queryClient },
      params: { id: dashboard.id },
      cause,
      location: { search: {} },
    });
  return { dashboard, runQuery, preloads, load };
}

describe('/dashboards/$id loader', () => {
  afterEach(() => vi.restoreAllMocks());

  it("starts the first screen's widget queries and code on entry, without awaiting them", async () => {
    const { dashboard, runQuery, preloads, load } = setup();
    await expect(load('enter')).resolves.toMatchObject({
      place: getActivePlace(),
      loaded: { document: dashboard, source: { kind: 'record', placeId: 'browser' } },
    });
    expect(runQuery).toHaveBeenCalledTimes(2);
    for (const preload of preloads) expect(preload).toHaveBeenCalledOnce();
  });

  it('starts nothing on a search change or a hover preload', async () => {
    const { runQuery, load } = setup();
    await load('stay');
    await load('preload');
    expect(runQuery).not.toHaveBeenCalled();
  });
});
