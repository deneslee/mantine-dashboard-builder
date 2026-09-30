import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  stripSearchParams,
} from '@tanstack/react-router';
import { useState } from 'react';
import sales from '../../../../public/data/dashboards/sales.json';
import { registry } from '@/app/registry';
import { dashboardDoc } from '../api/dto';
import { toDashboard } from '../api/mapper';
import { localRepository } from '../api/client';
import { DashboardProvider } from '../DashboardProvider';
import { dashboardSearch } from '../model/timeRange';
import { DashboardRegistryContext } from '../registry';
import { createDashboardStore } from '../store';
import { DashboardView } from './DashboardView';

type State =
  | 'view'
  | 'edit'
  | 'dirty'
  | 'storage-error'
  | 'palette'
  | 'options'
  | 'queries'
  | 'move'
  | 'resize'
  | 'empty';
function DashboardStory({ state }: { state: State }) {
  const [setup] = useState(() => {
    const dashboard = toDashboard(
      dashboardDoc.parse(state === 'empty' ? { ...sales, widgets: {}, layouts: { lg: [] } } : sales),
    );
    if (dashboard.widgets.revenue)
      dashboard.widgets.revenue.description = 'Revenue for the selected time range.';
    const store = createDashboardStore(dashboard, localRepository, state === 'view' ? 'view' : 'edit', false);
    if (state === 'dirty') store.getState().actions.editWidget('revenue', { title: 'Edited revenue' });
    if (state === 'storage-error')
      store.setState({ draftError: 'The draft could not be stored. Export JSON before leaving.' });
    if (state === 'palette') store.getState().actions.openTool({ kind: 'palette' });
    if (state === 'move' || state === 'resize')
      store.getState().actions.openTool({ kind: state, id: 'revenue' });
    const root = createRootRoute({ component: Outlet });
    const route = createRoute({
      getParentRoute: () => root,
      path: '/dashboards/$id',
      validateSearch: dashboardSearch,
      search: { middlewares: [stripSearchParams({ mode: 'view' })] },
      component: () => (
        <DashboardRegistryContext value={registry}>
          <DashboardProvider dashboard={dashboard} store={store}>
            <DashboardView />
          </DashboardProvider>
        </DashboardRegistryContext>
      ),
    });
    const query =
      state === 'view'
        ? ''
        : '?mode=edit' +
          (state === 'options' || state === 'queries' ? '&widget=revenue' : '') +
          (state === 'queries' ? '&editor=queries' : '');
    const router = createRouter({
      routeTree: root.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ['/dashboards/sales' + query] }),
    });
    return { router, client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) };
  });
  return (
    <QueryClientProvider client={setup.client}>
      <RouterProvider router={setup.router} />
    </QueryClientProvider>
  );
}
const meta = { title: 'Dashboards/Editing', component: DashboardStory } satisfies Meta<typeof DashboardStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const View: Story = { args: { state: 'view' } };
export const Editing: Story = { args: { state: 'edit' } };
export const Unsaved: Story = { args: { state: 'dirty' } };
export const StorageError: Story = { args: { state: 'storage-error' } };
export const Palette: Story = { args: { state: 'palette' } };
export const WidgetOptions: Story = { args: { state: 'options' } };
export const QueryEditor: Story = { args: { state: 'queries' } };
export const Move: Story = { args: { state: 'move' } };
export const Resize: Story = { args: { state: 'resize' } };
export const Empty: Story = { args: { state: 'empty' } };
