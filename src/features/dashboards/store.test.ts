import { describe, expect, it, vi } from 'vitest';
import { dashboardDoc } from './api/dto';
import { toDashboard, toDocument } from './api/mapper';
import type { DashboardRepository } from './api/repository';
import { draftKey, readSaved, writeSaved } from './api/storage';
import { createDashboardStore, currentDocument, readingOrder } from './store';

const document = () =>
  toDashboard(
    dashboardDoc.parse({
      version: 1,
      id: 'test',
      title: 'Test',
      updatedAt: '2026-09-30T10:00:00Z',
      timeRange: { from: 'now-24h', to: 'now' },
      widgets: {
        a: { type: 'chart', title: 'First', queries: [] },
        b: { type: 'kpi', title: 'Second', queries: [] },
      },
      layouts: {
        lg: [
          { i: 'a', x: 0, y: 0, w: 6, h: 3 },
          { i: 'b', x: 6, y: 0, w: 6, h: 3 },
        ],
      },
    }),
  );
const repository = (): DashboardRepository => ({
  list: vi.fn(async () => []),
  load: vi.fn(async () => document()),
  save: vi.fn(async (doc) => writeSaved(doc)),
  remove: vi.fn(async () => {}),
});

describe('dashboard editing', () => {
  it('keeps one step per drag/resize or field blur and ignores identical updates', () => {
    const store = createDashboardStore(document(), repository(), 'edit', false);
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
    expect(readingOrder(store.getState().doc)).toEqual(['b', 'a']);
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

  it('saves a new baseline, keeps undo, and makes undo after Save dirty', async () => {
    const repo = repository();
    const store = createDashboardStore(document(), repo);
    const actions = store.getState().actions;
    actions.editWidget('a', { title: 'Saved title' });
    await actions.save();
    expect(store.getState().dirty).toBe(false);
    expect(readSaved('test')?.widgets.a?.title).toBe('Saved title');
    expect(localStorage.getItem(draftKey('test'))).toBeNull();
    expect(store.temporal.getState().pastStates).toHaveLength(1);
    actions.undo();
    expect(store.getState().dirty).toBe(true);
    expect(store.getState().doc.widgets.a?.title).toBe('First');
    actions.redo();
    expect(store.getState().dirty).toBe(false);
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
    const store = createDashboardStore(document(), repo);
    const actions = store.getState().actions;
    actions.editWidget('a', { title: 'Snapshot' });
    const saving = actions.save();
    actions.editWidget('a', { title: 'Newer edit' });
    finish();
    await saving;
    expect(store.getState().baseline.widgets.a?.title).toBe('Snapshot');
    expect(store.getState().doc.widgets.a?.title).toBe('Newer edit');
    expect(store.getState().dirty).toBe(true);
  });

  it('restores a per-dashboard draft and edit mode; Discard restores baseline and clears draft/history', () => {
    const first = createDashboardStore(document(), repository());
    first.getState().actions.editWidget('a', { title: 'Draft' });
    const reloaded = createDashboardStore(document(), repository(), 'view');
    expect(reloaded.getState().mode).toBe('edit');
    expect(reloaded.getState().doc.widgets.a?.title).toBe('Draft');
    reloaded.getState().actions.editWidget('b', { description: 'Another change' });
    reloaded.getState().actions.discard();
    expect(currentDocument(reloaded.getState())).toEqual(document());
    expect(reloaded.getState().dirty).toBe(false);
    expect(reloaded.temporal.getState().pastStates).toHaveLength(0);
    expect(reloaded.temporal.getState().futureStates).toHaveLength(0);
    expect(localStorage.getItem(draftKey('test'))).toBeNull();
  });

  it('leaves a failed Save dirty and preserves an unreadable draft', async () => {
    const repo = repository();
    repo.save = vi.fn(async () => {
      throw new Error('Disk full');
    });
    const store = createDashboardStore(document(), repo);
    store.getState().actions.editWidget('a', { title: 'Keep me' });
    await expect(store.getState().actions.save()).rejects.toThrow('Disk full');
    expect(store.getState().dirty).toBe(true);
    expect(localStorage.getItem(draftKey('test'))).toContain('Keep me');
    localStorage.setItem(draftKey('test'), 'broken');
    const recovered = createDashboardStore(document(), repo);
    expect(recovered.getState().draftError).toContain('kept');
    expect(localStorage.getItem(draftKey('test'))).toBe('broken');
  });

  it('isolates providers and excludes selection, mode and time from undo', () => {
    const one = createDashboardStore(document(), repository(), 'edit', false);
    const two = createDashboardStore({ ...document(), id: 'other' }, repository(), 'view', false);
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
    const store = createDashboardStore(document(), repository(), 'edit', false);
    const actions = store.getState().actions;
    const copy = actions.duplicate('a');
    expect(store.getState().doc.layouts.lg.at(-1)?.i).toBe(copy);
    expect(store.getState().doc.layouts.lg.at(-1)?.y).toBe(3);
    actions.remove('b');
    expect(store.temporal.getState().pastStates).toHaveLength(2);
    actions.undo();
    const exported = toDocument(currentDocument(store.getState()));
    expect(Object.keys(exported.widgets)).toEqual(readingOrder(store.getState().doc));
    actions.editWidget('a', { description: 'Temporary' });
    actions.importDocument(toDashboard(dashboardDoc.parse(JSON.parse(JSON.stringify(exported)))));
    expect(toDocument(currentDocument(store.getState()))).toEqual(exported);
    expect(() => actions.importDocument({ ...document(), id: 'wrong' })).toThrow('same dashboard id');
  });

  it('rejects duplicate placement and out-of-bounds imports', () => {
    const dto = toDocument(document());
    expect(
      dashboardDoc.safeParse({ ...dto, layouts: { lg: [...dto.layouts.lg, dto.layouts.lg[0]] } }).success,
    ).toBe(false);
    expect(
      dashboardDoc.safeParse({ ...dto, layouts: { lg: dto.layouts.lg.map((item) => ({ ...item, w: 13 })) } })
        .success,
    ).toBe(false);
  });
});
