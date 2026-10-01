import { describe, expect, it } from 'vitest';
import { dimensions } from '@/ui/tokens/dimensions';
import { createShellStore, STORAGE_KEY, type ShellInit } from './createShellStore';

const make = (init?: ShellInit) => createShellStore({ isNarrow: false, ...init }, false);

function burgerModes(init?: ShellInit) {
  const store = make(init);
  const { toggleSidebar } = store.getState().actions;
  const modes = [store.getState().sidebar.mode];
  for (let i = 0; i < 3; i++) {
    toggleSidebar();
    modes.push(store.getState().sidebar.mode);
  }
  return modes;
}

describe('shell store: sidebar', () => {
  it('burger toggles expanded ↔ compact by default', () => {
    expect(burgerModes()).toEqual(['expanded', 'compact', 'expanded', 'compact']);
  });

  it('burger toggles expanded ↔ closed with the hide behavior', () => {
    expect(burgerModes({ sidebar: { burger: 'hide' } })).toEqual([
      'expanded',
      'closed',
      'expanded',
      'closed',
    ]);
  });

  it('burger cycles expanded → compact → closed → expanded with the cycle behavior', () => {
    expect(burgerModes({ sidebar: { burger: 'cycle' } })).toEqual([
      'expanded',
      'compact',
      'closed',
      'expanded',
    ]);
  });

  it('burger expands a hidden sidebar whatever the behavior', () => {
    expect(burgerModes({ sidebar: { mode: 'closed' } })).toEqual([
      'closed',
      'expanded',
      'compact',
      'expanded',
    ]);
  });

  it('changing the behavior applies to the next burger press', () => {
    const store = make();
    store.getState().actions.setBurgerBehavior('hide');
    store.getState().actions.toggleSidebar();
    expect(store.getState().sidebar.mode).toBe('closed');
  });

  it('burger opens and closes the drawer when undocked, without touching the docked mode', () => {
    const store = make({ sidebar: { isDocked: false, mode: 'compact' } });
    store.getState().actions.toggleSidebar();
    expect(store.getState().sidebar).toMatchObject({ isDrawerOpen: true, mode: 'compact' });
    store.getState().actions.closeSidebar();
    expect(store.getState().sidebar.isDrawerOpen).toBe(false);
  });

  it('treats narrow viewports as undocked but keeps the preference', () => {
    const store = make({ isNarrow: true });
    store.getState().actions.toggleSidebar();
    expect(store.getState().sidebar).toMatchObject({ isDocked: true, isDrawerOpen: true, mode: 'expanded' });
    store.getState().actions.setNarrow(false);
    expect(store.getState().sidebar.isDrawerOpen).toBe(false);
  });

  it('docking from the drawer shows the column; undocking keeps it visible as a drawer', () => {
    const store = make({ sidebar: { isDocked: false, mode: 'closed', isDrawerOpen: true } });
    store.getState().actions.setSidebarDocked(true);
    expect(store.getState().sidebar).toMatchObject({ isDocked: true, isDrawerOpen: false, mode: 'expanded' });
    store.getState().actions.setSidebarDocked(false);
    expect(store.getState().sidebar).toMatchObject({ isDocked: false, isDrawerOpen: true });
  });

  it('clamps widths to token limits', () => {
    const store = make();
    const { setSidebarWidth, setContextBarWidth } = store.getState().actions;
    setSidebarWidth(9999);
    expect(store.getState().sidebar.width).toBe(dimensions.shell.sidebar.max);
    setSidebarWidth(10);
    expect(store.getState().sidebar.width).toBe(dimensions.shell.sidebar.min);
    setContextBarWidth(10);
    expect(store.getState().contextBar.width).toBe(dimensions.shell.contextBar.min);
  });
});

describe('shell store: context bar', () => {
  it('opens on a tab and keeps it when toggled closed and open', () => {
    const store = make();
    const { openContextBar, toggleContextBar } = store.getState().actions;
    openContextBar('notifications');
    expect(store.getState().contextBar).toMatchObject({ isOpen: true, activeTab: 'notifications' });
    toggleContextBar();
    expect(store.getState().contextBar.isOpen).toBe(false);
    toggleContextBar();
    expect(store.getState().contextBar).toMatchObject({ isOpen: true, activeTab: 'notifications' });
  });

  it('uses the drawer when undocked and closes the drawer, not the column', () => {
    const store = make({ contextBar: { isDocked: false, isOpen: true } });
    store.getState().actions.toggleContextBar();
    expect(store.getState().contextBar.isDrawerOpen).toBe(true);
    store.getState().actions.closeContextBar();
    expect(store.getState().contextBar).toMatchObject({ isDrawerOpen: false, isOpen: true });
  });
});

describe('shell store: persistence', () => {
  it('saves layout preferences under a versioned key and never the drawer state', () => {
    const store = createShellStore({ isNarrow: true });
    store.getState().actions.setSidebarMode('compact');
    store.getState().actions.toggleSidebar();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(saved.version).toBe(2);
    expect(saved.state.sidebar).toEqual({
      mode: 'compact',
      burger: 'compact',
      isDocked: true,
      width: dimensions.shell.sidebar.expanded,
    });
    expect(saved.state.actions).toBeUndefined();
    expect(saved.state.isNarrow).toBeUndefined();
  });

  it('loads v1 preferences saved before the boolean rename', () => {
    const sidebar = { mode: 'compact', burger: 'hide', docked: false, width: 300 };
    const contextBar = { open: true, docked: false, width: 400, activeTab: 'notifications' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state: { sidebar, contextBar } }));
    const { sidebar: s, contextBar: c } = createShellStore({ isNarrow: false }).getState();
    expect(s).toEqual({ mode: 'compact', burger: 'hide', isDocked: false, width: 300, isDrawerOpen: false });
    expect(c).toEqual({
      isOpen: true,
      isDocked: false,
      width: 400,
      activeTab: 'notifications',
      isDrawerOpen: false,
    });
  });
});
