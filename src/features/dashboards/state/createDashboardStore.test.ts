import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { dashboardSchema, orderWidgets } from '@/core/dashboard/dashboardSchema';
import { AppError } from '@/core/errors/AppError';
import { configureRecordProviders, setActiveRecordProviderId } from '@/lib/records/activeRecordProvider';
import { testDashboard, testLoaded } from '@/testing/fixtures/dashboards';
import type { DashboardSource } from '../data/dashboardSource';
import { draftKey, hasDraft } from '../data/drafts';
import { createDashboardStore, selectDashboard } from './createDashboardStore';

const readingOrder = (store: ReturnType<typeof createDashboardStore>) =>
  Object.keys(orderWidgets(selectDashboard(store.getState())).widgets);

const record = (placeId: string, revision = 1): DashboardSource => ({ kind: 'record', placeId, revision });
const savedAs = (revision: number) =>
  vi.fn(async (): Promise<DashboardSource> => record('browser', revision));

afterEach(() => vi.useRealTimers());

describe('dashboard editing', () => {
  it('keeps one step per drag/resize or field blur and ignores identical updates', () => {
    const store = createDashboardStore(testLoaded(), { shouldPersist: false });
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

  it('saves a new baseline and source, keeps undo, and makes the dashboard dirty again on undo after Save', async () => {
    const save = savedAs(2);
    const store = createDashboardStore(testLoaded(), { save });
    const actions = store.getState().actions;
    actions.editWidget('a', { title: 'Saved title' });
    await actions.save();
    expect(store.getState().isDirty).toBe(false);
    // Save sent the source the dashboard was loaded from, and the store keeps what came back.
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        widgets: expect.objectContaining({ a: expect.objectContaining({ title: 'Saved title' }) }),
      }),
      record('browser', 1),
    );
    expect(store.getState().source).toEqual(record('browser', 2));
    expect(store.getState().saveState).toBe('idle');
    expect(localStorage.getItem(draftKey('browser', 'test'))).toBeNull();
    expect(store.temporal.getState().pastStates).toHaveLength(1);
    actions.undo();
    expect(store.getState().isDirty).toBe(true);
    expect(store.getState().doc.widgets.a?.title).toBe('First');
    actions.redo();
    expect(store.getState().isDirty).toBe(false);
  });

  it('preserves edits made while Save is pending', async () => {
    let finish!: () => void;
    const save = () =>
      new Promise<DashboardSource>((resolve) => {
        finish = () => resolve(record('browser', 2));
      });
    const store = createDashboardStore(testLoaded(), { save });
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

  it('restores a per-dashboard draft; Discard restores baseline and clears draft/history', () => {
    const first = createDashboardStore(testLoaded());
    first.getState().actions.editWidget('a', { title: 'Draft' });
    const reloaded = createDashboardStore(testLoaded());
    expect(hasDraft('browser', 'test')).toBe(true);
    expect(reloaded.getState().doc.widgets.a?.title).toBe('Draft');
    reloaded.getState().actions.editWidget('b', { description: 'Another change' });
    reloaded.getState().actions.discard();
    expect(selectDashboard(reloaded.getState())).toEqual(testDashboard());
    expect(reloaded.getState().isDirty).toBe(false);
    expect(reloaded.temporal.getState().pastStates).toHaveLength(0);
    expect(reloaded.temporal.getState().futureStates).toHaveLength(0);
    expect(localStorage.getItem(draftKey('browser', 'test'))).toBeNull();
  });

  it('leaves the dashboard dirty after a failed Save and preserves an unreadable draft', async () => {
    const save = async (): Promise<DashboardSource> => {
      throw new Error('Disk full');
    };
    const store = createDashboardStore(testLoaded(), { save });
    store.getState().actions.editWidget('a', { title: 'Keep me' });
    await expect(store.getState().actions.save()).rejects.toThrow('Disk full');
    expect(store.getState().isDirty).toBe(true);
    expect(localStorage.getItem(draftKey('browser', 'test'))).toContain('Keep me');
    localStorage.setItem(draftKey('browser', 'test'), 'broken');
    const recovered = createDashboardStore(testLoaded(), { save });
    expect(recovered.getState().draftError).toContain('kept');
    expect(localStorage.getItem(draftKey('browser', 'test'))).toBe('broken');
  });

  it('isolates providers and keeps selection, breakpoint and now out of undo', () => {
    const one = createDashboardStore(testLoaded(), { shouldPersist: false });
    const two = createDashboardStore(testLoaded({ ...testDashboard(), id: 'other' }), {
      shouldPersist: false,
    });
    const actions = one.getState().actions;
    actions.openTool({ kind: 'palette' });
    actions.setBreakpoint('md');
    actions.takeNow();
    expect(one.temporal.getState().pastStates).toHaveLength(0);
    actions.editWidget('a', { title: 'One only' });
    actions.undo();
    expect(one.getState().tool?.kind).toBe('palette');
    expect(one.getState().breakpoint).toBe('md');
    expect(two.getState().doc.widgets.a?.title).toBe('First');
  });

  it('sets the default time as one undoable document step that Save keeps', async () => {
    const save = savedAs(2);
    const store = createDashboardStore(testLoaded(), { shouldPersist: false, save });
    const actions = store.getState().actions;
    actions.setDefaultTime({ from: 'now-7d', to: 'now' }, '5m');
    actions.setDefaultTime({ from: 'now-7d', to: 'now' }, '5m');
    expect(store.temporal.getState().pastStates).toHaveLength(1);
    expect(store.getState().doc.timeRange).toEqual({ from: 'now-7d', to: 'now' });
    expect(store.getState().doc.refresh).toBe('5m');
    expect(store.getState().isDirty).toBe(true);
    await actions.save();
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ timeRange: { from: 'now-7d', to: 'now' }, refresh: '5m' }),
      expect.anything(),
    );
    actions.undo();
    expect(store.getState().doc.timeRange).toEqual(testDashboard().timeRange);
    expect(store.getState().doc.refresh).toBe(testDashboard().refresh);
  });

  it('adds and duplicates at the bottom, removes with one step, and exports/imports identical documents', () => {
    const store = createDashboardStore(testLoaded(), { shouldPersist: false });
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

describe('saving', () => {
  const deferred = () => {
    let resolve!: (source: DashboardSource) => void;
    const promise = new Promise<DashboardSource>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  };

  it('sends the place it was loaded from, even when the place in use changes during the save', async () => {
    const load = async () => ({}) as never;
    configureRecordProviders({ browser: { name: 'This browser', load }, convex: { name: 'Convex', load } });
    setActiveRecordProviderId('convex');
    const pending = deferred();
    const save = vi.fn(() => pending.promise);
    const store = createDashboardStore(
      { ...testLoaded(), source: record('browser') },
      { shouldPersist: false, save },
    );
    store.getState().actions.editWidget('a', { title: 'Edited' });
    const saving = store.getState().actions.save();

    setActiveRecordProviderId('browser');
    setActiveRecordProviderId('convex');
    pending.resolve(record('browser', 2));
    await saving;

    expect(save).toHaveBeenCalledWith(expect.anything(), record('browser'));
    expect(store.getState().source).toEqual(record('browser', 2));
  });

  it('says it is waiting after ten seconds, keeps waiting, and ends idle when the result arrives', async () => {
    vi.useFakeTimers();
    const pending = deferred();
    const store = createDashboardStore(testLoaded(), { shouldPersist: false, save: () => pending.promise });
    store.getState().actions.editWidget('a', { title: 'Edited' });
    const saving = store.getState().actions.save();
    expect(store.getState().saveState).toBe('saving');

    await vi.advanceTimersByTimeAsync(10_000);
    expect(store.getState().saveState).toBe('waiting');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(store.getState().saveState).toBe('waiting');

    pending.resolve(record('browser', 2));
    await saving;
    expect(store.getState().saveState).toBe('idle');
    expect(store.getState().isDirty).toBe(false);
  });

  it('refuses a second Save, and Discard and Import, while a write is pending', async () => {
    const pending = deferred();
    const save = vi.fn(() => pending.promise);
    const store = createDashboardStore(testLoaded(), { shouldPersist: false, save });
    const actions = store.getState().actions;
    actions.editWidget('a', { title: 'Edited' });
    const saving = actions.save();
    await actions.save();
    actions.discard();
    expect(() => actions.importDocument(testDashboard())).toThrow('Wait for the save');
    expect(save).toHaveBeenCalledTimes(1);
    expect(store.getState().doc.widgets.a?.title).toBe('Edited');
    pending.resolve(record('browser', 2));
    await saving;
  });

  it('keeps the draft and the edits on a conflict, and lets the user try again', async () => {
    const save = vi
      .fn<() => Promise<DashboardSource>>()
      .mockRejectedValueOnce(new AppError('conflict', 'This dashboard was changed elsewhere.'))
      .mockResolvedValueOnce(record('browser', 5));
    const store = createDashboardStore(testLoaded(), { save });
    const actions = store.getState().actions;
    actions.editWidget('a', { title: 'Mine' });
    await expect(actions.save()).rejects.toMatchObject({ code: 'conflict' });
    expect(store.getState()).toMatchObject({ saveState: 'failed', isDirty: true });
    expect(localStorage.getItem(draftKey('browser', 'test'))).toContain('Mine');

    await actions.save();
    expect(store.getState()).toMatchObject({ saveState: 'idle', isDirty: false });
  });
});
