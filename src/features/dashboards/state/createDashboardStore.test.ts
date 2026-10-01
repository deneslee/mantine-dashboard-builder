import { describe, expect, it, vi } from 'vitest';
import { dashboardSchema, orderWidgets } from '@/core/dashboard/dashboardSchema';
import { testDashboard } from '@/testing/fixtures/dashboards';
import type { DashboardRepository } from '../data/repository';
import { draftKey, readSaved, writeSaved } from '../data/drafts';
import { createDashboardStore, selectDashboard } from './createDashboardStore';

const readingOrder = (store: ReturnType<typeof createDashboardStore>) =>
  Object.keys(orderWidgets(selectDashboard(store.getState())).widgets);

const repository = (): DashboardRepository => ({
  list: vi.fn(async () => []),
  load: vi.fn(async () => testDashboard()),
  save: vi.fn(async (doc) => writeSaved(doc)),
  remove: vi.fn(async () => {}),
});

describe('dashboard editing', () => {
  it('keeps one step per drag/resize or field blur and ignores identical updates', () => {
    const store = createDashboardStore(testDashboard(), repository(), 'edit', false);
    const actions = store.getState().actions;
    actions.commitLayout(
      'lg',
      [
        { i: 'a', x: 6, y: 0, w: 6, h: 3 },
        { i: 'b', x: 0, y: 0, w: 6, h: 3 },
      ],
      'a',
      'Moved',
    );
    expect(readingOrder(store)).toEqual(['b', 'a']);
    expect(store.temporal.getState().pastStates).toHaveLength(1);
    actions.placeWidget('a', { x: 6, w: 5, h: 4 });
    expect(store.temporal.getState().pastStates).toHaveLength(2);
    actions.undo();
    expect(store.getState().doc.layouts.lg.find((item) => item.i === 'a')?.w).toBe(6);
    actions.editWidget('a', { title: 'Edited' });
    actions.editWidget('a', { title: 'Edited' });
    expect(store.temporal.getState().pastStates).toHaveLength(2);
    actions.undo();
    expect(store.getState().doc.widgets.a?.title).toBe('First');
  });

  it('saves a new baseline, keeps undo, and makes the dashboard dirty again on undo after Save', async () => {
    const repo = repository();
    const store = createDashboardStore(testDashboard(), repo);
    const actions = store.getState().actions;
    actions.editWidget('a', { title: 'Saved title' });
    await actions.save();
    expect(store.getState().isDirty).toBe(false);
    expect(readSaved('test')?.widgets.a?.title).toBe('Saved title');
    expect(localStorage.getItem(draftKey('test'))).toBeNull();
    expect(store.temporal.getState().pastStates).toHaveLength(1);
    actions.undo();
    expect(store.getState().isDirty).toBe(true);
    expect(store.getState().doc.widgets.a?.title).toBe('First');
    actions.redo();
    expect(store.getState().isDirty).toBe(false);
  });

  it('preserves edits made while Save is pending', async () => {
    let finish!: () => void;
    const repo = repository();
    repo.save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const store = createDashboardStore(testDashboard(), repo);
    const actions = store.getState().actions;
    actions.editWidget('a', { title: 'Snapshot' });
    const saving = actions.save();
    actions.editWidget('a', { title: 'Newer edit' });
    finish();
    await saving;
    expect(store.getState().baseline.widgets.a?.title).toBe('Snapshot');
    expect(store.getState().doc.widgets.a?.title).toBe('Newer edit');
    expect(store.getState().isDirty).toBe(true);
  });

  it('restores a per-dashboard draft and edit mode; Discard restores baseline and clears draft/history', () => {
    const first = createDashboardStore(testDashboard(), repository());
    first.getState().actions.editWidget('a', { title: 'Draft' });
    const reloaded = createDashboardStore(testDashboard(), repository(), 'view');
    expect(reloaded.getState().mode).toBe('edit');
    expect(reloaded.getState().doc.widgets.a?.title).toBe('Draft');
    reloaded.getState().actions.editWidget('b', { description: 'Another change' });
    reloaded.getState().actions.discard();
    expect(selectDashboard(reloaded.getState())).toEqual(testDashboard());
    expect(reloaded.getState().isDirty).toBe(false);
    expect(reloaded.temporal.getState().pastStates).toHaveLength(0);
    expect(reloaded.temporal.getState().futureStates).toHaveLength(0);
    expect(localStorage.getItem(draftKey('test'))).toBeNull();
  });

  it('leaves the dashboard dirty after a failed Save and preserves an unreadable draft', async () => {
    const repo = repository();
    repo.save = vi.fn(async () => {
      throw new Error('Disk full');
    });
    const store = createDashboardStore(testDashboard(), repo);
    store.getState().actions.editWidget('a', { title: 'Keep me' });
    await expect(store.getState().actions.save()).rejects.toThrow('Disk full');
    expect(store.getState().isDirty).toBe(true);
    expect(localStorage.getItem(draftKey('test'))).toContain('Keep me');
    localStorage.setItem(draftKey('test'), 'broken');
    const recovered = createDashboardStore(testDashboard(), repo);
    expect(recovered.getState().draftError).toContain('kept');
    expect(localStorage.getItem(draftKey('test'))).toBe('broken');
  });

  it('isolates providers and excludes selection, mode and time from undo', () => {
    const one = createDashboardStore(testDashboard(), repository(), 'edit', false);
    const two = createDashboardStore({ ...testDashboard(), id: 'other' }, repository(), 'view', false);
    const actions = one.getState().actions;
    actions.setRange({ from: 'now-7d', to: 'now' });
    actions.openTool({ kind: 'palette' });
    actions.setMode('view');
    expect(one.temporal.getState().pastStates).toHaveLength(0);
    actions.editWidget('a', { title: 'One only' });
    actions.undo();
    expect(one.getState().timeRange.from).toBe('now-7d');
    expect(one.getState().tool?.kind).toBe('palette');
    expect(two.getState().doc.widgets.a?.title).toBe('First');
  });

  it('adds and duplicates at the bottom, removes with one step, and exports/imports identical documents', () => {
    const store = createDashboardStore(testDashboard(), repository(), 'edit', false);
    const actions = store.getState().actions;
    const copy = actions.duplicate('a');
    expect(store.getState().doc.layouts.lg.at(-1)?.i).toBe(copy);
    expect(store.getState().doc.layouts.lg.at(-1)?.y).toBe(3);
    actions.remove('b');
    expect(store.temporal.getState().pastStates).toHaveLength(2);
    actions.undo();
    const exported = orderWidgets(selectDashboard(store.getState()));
    expect(Object.keys(exported.widgets)).toEqual(['a', 'b', copy]);
    actions.editWidget('a', { description: 'Temporary' });
    actions.importDocument(dashboardSchema.parse(JSON.parse(JSON.stringify(exported))));
    expect(orderWidgets(selectDashboard(store.getState()))).toEqual(exported);
    expect(() => actions.importDocument({ ...testDashboard(), id: 'wrong' })).toThrow('same dashboard id');
  });

  it('rejects duplicate placement and out-of-bounds imports', () => {
    const dashboard = testDashboard();
    expect(
      dashboardSchema.safeParse({
        ...dashboard,
        layouts: { lg: [...dashboard.layouts.lg, dashboard.layouts.lg[0]] },
      }).success,
    ).toBe(false);
    expect(
      dashboardSchema.safeParse({
        ...dashboard,
        layouts: { lg: dashboard.layouts.lg.map((item) => ({ ...item, w: 13 })) },
      }).success,
    ).toBe(false);
  });
});
