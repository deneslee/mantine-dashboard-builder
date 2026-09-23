import { IconSettings, IconTemplate } from '@tabler/icons-react';
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@/test/render';
import type { NavGroup } from '../model/nav';
import { ShellProvider } from '../ShellProvider';
import { createShellStore, type ShellInit } from '../store';
import { Sidebar } from './Sidebar';
import { SidebarNav } from './SidebarNav';

function renderAt(path: string, compact = false, init: ShellInit = {}, ui: ReactNode = <Sidebar />) {
  const store = createShellStore(
    { narrow: false, ...init, sidebar: { mode: compact ? 'compact' : 'expanded', ...init.sidebar } },
    false,
  );
  const rootRoute = createRootRoute({
    component: () => <ShellProvider store={store}>{ui}</ShellProvider>,
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  return { router, store };
}

describe('Sidebar active states', () => {
  it('marks the current child as selected and its parent as child-active', async () => {
    renderAt('/dashboards/sales');
    const child = await screen.findByRole('link', { name: 'Sales overview' });
    expect(child).toHaveAttribute('data-active');
    expect(child).toHaveAttribute('aria-current', 'page');
    // Exact matching: the section index is not "current" on a child page.
    expect(screen.getByRole('link', { name: 'All dashboards' })).not.toHaveAttribute('aria-current');

    const parent = screen.getByRole('button', { name: /Dashboards/ });
    expect(parent).toHaveAttribute('data-child-active');
    expect(parent).not.toHaveAttribute('data-active');
    expect(parent).toHaveAttribute('aria-expanded', 'true');
  });

  it('marks a leaf link active on its own route and nested paths', async () => {
    renderAt('/datasources');
    expect(await screen.findByRole('link', { name: 'Data sources' })).toHaveAttribute('data-active');
    expect(screen.getByRole('button', { name: /Dashboards/ })).not.toHaveAttribute('data-child-active');
  });

  it('opens a section when navigating into it', async () => {
    const { router } = renderAt('/templates');
    const parent = await screen.findByRole('button', { name: /Dashboards/ });
    expect(parent).toHaveAttribute('aria-expanded', 'false');

    await act(() => router.navigate({ to: '/dashboards/$id', params: { id: 'ops' } }));
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    // A disclosure, not a menu button, while expanded.
    expect(parent).not.toHaveAttribute('aria-haspopup');
    expect(parent).not.toHaveAttribute('aria-controls');
  });
});

describe('Sidebar compact rail', () => {
  it('keeps accessible names on icon-only links', async () => {
    renderAt('/datasources', true);
    expect(await screen.findByRole('link', { name: 'Data sources' })).toHaveAttribute('data-active');
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
  });

  it('opens a flyout with the children of a section', async () => {
    renderAt('/dashboards/ops', true);
    const parent = await screen.findByRole('button', { name: 'Dashboards' });
    // Children are out of sight on the rail, so the section itself shows as selected.
    expect(parent).toHaveAttribute('data-active');
    expect(parent).toHaveAttribute('aria-haspopup', 'menu');
    expect(parent).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(parent);
    expect(await screen.findByRole('menuitem', { name: 'Operations' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('menuitem', { name: 'All dashboards' })).not.toHaveAttribute('aria-current');
    expect(parent).toHaveAttribute('aria-expanded', 'true');
  });

  it('drops the flyout when the sidebar expands, so it does not reopen on collapse', async () => {
    const { store } = renderAt('/dashboards/ops', true);
    fireEvent.click(await screen.findByRole('button', { name: 'Dashboards' }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();

    act(() => store.getState().actions.setSidebarMode('expanded'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dashboards/ })).not.toHaveAttribute('aria-haspopup');

    act(() => store.getState().actions.setSidebarMode('compact'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('Sidebar layout', () => {
  it('pins bottom items outside the scrolling nav', async () => {
    renderAt('/');
    const settings = await screen.findByRole('link', { name: 'Settings' });
    const templates = screen.getByRole('link', { name: 'Templates' });
    expect(templates.closest('.mantine-ScrollArea-root')).not.toBeNull();
    expect(settings.closest('.mantine-ScrollArea-root')).toBeNull();
  });

  it('names a group by its optional title', async () => {
    const groups: NavGroup[] = [
      { id: 'untitled', items: [{ id: 'templates', label: 'Templates', icon: IconTemplate, to: '/templates' }] },
      { id: 'system', label: 'System', items: [{ id: 'settings', label: 'Settings', icon: IconSettings, to: '/settings' }] },
    ];
    renderAt('/', true, {}, <SidebarNav groups={groups} />);
    const system = await screen.findByRole('group', { name: 'System' });
    expect(system).toContainElement(screen.getByRole('link', { name: 'Settings' }));
    // Untitled groups are plain containers, not unnamed groups.
    expect(screen.getAllByRole('group')).toHaveLength(1);
  });
});

describe('Sidebar footer', () => {
  it('shows the dock toggle before the menu button when expanded', async () => {
    renderAt('/');
    const menu = await screen.findByRole('button', { name: 'Sidebar menu' });
    const dock = screen.getByRole('button', { name: 'Undock panel' });
    // Dock toggle comes first, the menu sits in the trailing position.
    expect(dock.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(menu);
    expect(await screen.findByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Collapse to icons' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Hide sidebar' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Undock sidebar' })).not.toBeInTheDocument();
  });

  it('keeps only the menu button when compact and moves undocking into the menu', async () => {
    renderAt('/', true);
    const menu = await screen.findByRole('button', { name: 'Sidebar menu' });
    expect(screen.queryByRole('button', { name: 'Undock panel' })).not.toBeInTheDocument();

    fireEvent.click(menu);
    expect(await screen.findByRole('menuitem', { name: 'Expand sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Hide sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Undock sidebar' })).toBeInTheDocument();
  });

  it('keeps only the menu button on narrow viewports', async () => {
    renderAt('/', false, { narrow: true });
    expect(await screen.findByRole('button', { name: 'Sidebar menu' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dock panel/i })).not.toBeInTheDocument();
  });
});
