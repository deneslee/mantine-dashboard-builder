import userEvent from '@testing-library/user-event';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { notify } from '@/lib/notify/notify';
import { testLoaded } from '@/testing/fixtures/dashboards';
import { render, screen, waitFor } from '@/testing/render';
import type { DashboardSource } from '../data/dashboardSource';
import { createDashboardStore } from '../state/createDashboardStore';
import { DashboardProvider } from '../state/DashboardProvider';
import { EditToolbar } from './EditToolbar';

/** The toolbar on `/dashboards/test`, with a store whose Save is held back until `finish`. */
function setup() {
  let finish!: () => void;
  const save = () =>
    new Promise<DashboardSource>((resolve) => {
      finish = () => resolve({ kind: 'record', placeId: 'browser', revision: 2 });
    });
  const store = createDashboardStore(testLoaded(), { shouldPersist: false, save, noticeMs: 0 });
  const root = createRootRoute();
  const route = createRoute({
    getParentRoute: () => root,
    path: '/dashboards/$id',
    component: () => (
      <DashboardProvider dashboard={testLoaded()} store={store}>
        <EditToolbar isWide range={{ from: 'now-24h', to: 'now' }} refresh="off" />
      </DashboardProvider>
    ),
  });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ['/dashboards/test'] }),
  });
  render(<RouterProvider router={router} />);
  return { store, finish: () => finish() };
}

afterEach(() => vi.restoreAllMocks());

describe('EditToolbar saving', () => {
  it('names where the dashboard is saved, and the pending write until the place confirms', async () => {
    const success = vi.spyOn(notify, 'success').mockReturnValue('id');
    const user = userEvent.setup();
    const { store, finish } = setup();
    expect(await screen.findByText('Saved in This browser')).toBeInTheDocument();

    store.getState().actions.editWidget('a', { title: 'Edited' });
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Waiting for This browser to confirm…')).toBeInTheDocument();
    // Nothing that would change the document or start a second write while one is out.
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Import JSON' })).toBeDisabled();
    // Leaving the page asks first.
    const leaving = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(leaving);
    expect(leaving.defaultPrevented).toBe(true);

    finish();
    expect(await screen.findByText('Saved in This browser')).toBeInTheDocument();
    expect(success).toHaveBeenCalledWith({ title: 'Saved to This browser' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    const stayed = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(stayed);
    expect(stayed.defaultPrevented).toBe(false);
  });
});
