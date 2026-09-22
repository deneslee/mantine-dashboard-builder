import { describe, expect, it } from 'vitest';
import { tokens } from '@/design-system/tokens/tokens';
import { createShellStore, type ShellInit } from './store';

const make = (init?: ShellInit) => createShellStore({ narrow: false, ...init }, false);

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
    const store = make({ sidebar: { docked: false, mode: 'compact' } });
    store.getState().actions.toggleSidebar();
    expect(store.getState().sidebar).toMatchObject({ drawerOpen: true, mode: 'compact' });
    store.getState().actions.closeSidebar();
    expect(store.getState().sidebar.drawerOpen).toBe(false);
  });

  it('treats narrow viewports as undocked but keeps the preference', () => {
    const store = make({ narrow: true });
    store.getState().actions.toggleSidebar();
    expect(store.getState().sidebar).toMatchObject({ docked: true, drawerOpen: true, mode: 'expanded' });
    store.getState().actions.setNarrow(false);
    expect(store.getState().sidebar.drawerOpen).toBe(false);
  });

  it('docking from the drawer shows the column; undocking keeps it visible as a drawer', () => {
    const store = make({ sidebar: { docked: false, mode: 'closed', drawerOpen: true } });
    store.getState().actions.setSidebarDocked(true);
    expect(store.getState().sidebar).toMatchObject({ docked: true, drawerOpen: false, mode: 'expanded' });
    store.getState().actions.setSidebarDocked(false);
    expect(store.getState().sidebar).toMatchObject({ docked: false, drawerOpen: true });
  });

  it('clamps widths to token limits', () => {
    const store = make();
    const { setSidebarWidth, setContextBarWidth } = store.getState().actions;
    setSidebarWidth(9999);
    expect(store.getState().sidebar.width).toBe(tokens.shell.sidebar.max);
    setSidebarWidth(10);
    expect(store.getState().sidebar.width).toBe(tokens.shell.sidebar.min);
    setContextBarWidth(10);
    expect(store.getState().contextBar.width).toBe(tokens.shell.contextBar.min);
  });
});

describe('shell store: context bar', () => {
  it('opens on a tab and keeps it when toggled closed and open', () => {
    const store = make();
    const { openContextBar, toggleContextBar } = store.getState().actions;
    openContextBar('notifications');
    expect(store.getState().contextBar).toMatchObject({ open: true, activeTab: 'notifications' });
    toggleContextBar();
    expect(store.getState().contextBar.open).toBe(false);
    toggleContextBar();
    expect(store.getState().contextBar).toMatchObject({ open: true, activeTab: 'notifications' });
  });

  it('uses the drawer when undocked and closes the drawer, not the column', () => {
    const store = make({ contextBar: { docked: false, open: true } });
    store.getState().actions.toggleContextBar();
    expect(store.getState().contextBar.drawerOpen).toBe(true);
    store.getState().actions.closeContextBar();
    expect(store.getState().contextBar).toMatchObject({ drawerOpen: false, open: true });
  });
});

describe('shell store: persistence', () => {
  it('saves layout preferences under a versioned key and never the drawer state', () => {
    const store = createShellStore({ narrow: true });
    store.getState().actions.setSidebarMode('compact');
    store.getState().actions.toggleSidebar();
    const saved = JSON.parse(localStorage.getItem('shell.v1') ?? '{}');
    expect(saved.version).toBe(1);
    expect(saved.state.sidebar).toEqual({
      mode: 'compact',
      burger: 'compact',
      docked: true,
      width: tokens.shell.sidebar.expanded,
    });
    expect(saved.state.actions).toBeUndefined();
    expect(saved.state.narrow).toBeUndefined();
  });
});
