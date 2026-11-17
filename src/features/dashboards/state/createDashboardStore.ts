import { verticalCompactor } from 'react-grid-layout/core';
import { createStore } from 'zustand/vanilla';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import { toAppError } from '@/core/errors/AppError';
import { WRITE_NOTICE_MS } from '@/core/records/RecordProvider';
import { clearDraft, readDraft, writeDraft } from '../data/drafts';
import { dashboardSchema, orderWidgets, type Dashboard, type Widget } from '@/core/dashboard/dashboardSchema';
import { saveDashboard } from '../data/dashboardApi';
import type { DashboardSource, LoadedDashboard } from '../data/dashboardSource';
import { GRID_COLUMNS, resolveLayouts, type Breakpoint, type LayoutItem } from '@/core/dashboard/layout';
import type { TimeRange } from '@/core/time/timeRange';

export type EditorTool = { kind: 'palette' } | { kind: 'move' | 'resize'; id: string } | null;

/**
 * `saving`: a write is in flight. `waiting`: it has not resolved after `WRITE_NOTICE_MS`; nothing is
 * cancelled, the store keeps waiting. `failed`: the last save was refused or errored (the draft is kept).
 */
export type SaveState = 'idle' | 'saving' | 'waiting' | 'failed';

export interface DashboardState {
  doc: Dashboard;
  baseline: Dashboard;
  /** Where the baseline came from, and so where Save goes and against which revision. */
  source: DashboardSource;
  isDirty: boolean;
  saveState: SaveState;
  draftError: string | null;
  breakpoint: Breakpoint;
  /**
   * The dashboard's one `now` (epoch ms): every query resolves its range against it, so all widgets
   * cover the same window. Taken when the dashboard range or time zone changes and on each refresh.
   */
  now: number;
  tool: EditorTool;
  announcement: string;
  actions: {
    setBreakpoint(this: void, breakpoint: Breakpoint): void;
    takeNow(this: void): void;
    openTool(this: void, tool: EditorTool): void;
    /** Writes the time the viewer sees into the document as its saved default: one undo step. */
    setDefaultTime(this: void, timeRange: TimeRange, refresh: string): void;
    editWidget(
      this: void,
      id: string,
      patch: Partial<Pick<Widget, 'title' | 'description' | 'options' | 'queries' | 'time'>>,
    ): void;
    commitLayout(
      this: void,
      breakpoint: Breakpoint,
      layout: readonly LayoutItem[],
      id: string,
      action: 'Moved' | 'Resized',
    ): void;
    placeWidget(this: void, id: string, patch: Partial<Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>>): void;
    addWidget(this: void, id: string, widget: Widget, size: { w: number; h: number }): void;
    duplicate(this: void, id: string): string;
    remove(this: void, id: string): void;
    importDocument(this: void, document: Dashboard): void;
    save(this: void): Promise<void>;
    discard(this: void): void;
    undo(this: void): void;
    redo(this: void): void;
  };
}

export const selectDashboard = (state: Pick<DashboardState, 'doc'>): Dashboard => state.doc;
/** Whether a write is still unresolved: Save, Import and Discard wait for it. */
export const selectIsSavePending = (state: Pick<DashboardState, 'saveState'>) =>
  state.saveState === 'saving' || state.saveState === 'waiting';
/** For comparing with the baseline: parsing fixes the key order, `orderWidgets` the widget order. */
const serialized = (dashboard: Dashboard) => JSON.stringify(orderWidgets(dashboardSchema.parse(dashboard)));
const bottom = (items: readonly LayoutItem[]) => Math.max(0, ...items.map((item) => item.y + item.h));
const cleanLayout = (items: readonly LayoutItem[]): LayoutItem[] =>
  items.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }));

export interface DashboardStoreOptions {
  /** Off in stories and tests that must not read or write a draft. */
  shouldPersist?: boolean;
  /** Where Save goes; tests pass a fake. It gets the source the dashboard was loaded from. */
  save?: (dashboard: Dashboard, source: DashboardSource) => Promise<DashboardSource>;
  /** How long a write may be pending before the store says it is waiting. */
  noticeMs?: number;
}

export function createDashboardStore(
  loaded: LoadedDashboard,
  { shouldPersist = true, save = saveDashboard, noticeMs = WRITE_NOTICE_MS }: DashboardStoreOptions = {},
) {
  const baseline = loaded.document;
  let restored: ReturnType<typeof readDraft> = undefined;
  let draftError: string | null = null;
  if (shouldPersist) {
    try {
      restored = readDraft(loaded.source.placeId, baseline.id);
    } catch {
      draftError = 'The draft could not be restored. Its stored copy was kept.';
    }
  }
  const initial = restored?.document ?? baseline;
  const saved = restored?.baseline ?? baseline;
  const store = createStore<DashboardState>()(
    temporal(
      immer((set, get) => ({
        doc: initial,
        baseline: saved,
        source: restored?.source ?? loaded.source,
        isDirty: serialized(initial) !== serialized(saved),
        saveState: 'idle',
        draftError,
        breakpoint: 'lg',
        now: Date.now(),
        tool: null,
        announcement: '',
        actions: {
          setBreakpoint: (breakpoint) => set({ breakpoint }),
          takeNow: () => set({ now: Date.now() }),
          openTool: (tool) => set({ tool }),
          setDefaultTime: (timeRange, refresh) => {
            const { doc } = get();
            if (
              doc.refresh === refresh &&
              doc.timeRange.from === timeRange.from &&
              doc.timeRange.to === timeRange.to
            )
              return;
            set((s) => {
              s.doc.timeRange = { ...timeRange };
              s.doc.refresh = refresh;
              s.announcement = 'Set the current time as the dashboard default.';
            });
          },
          editWidget: (id, patch) => {
            const widget = get().doc.widgets[id];
            if (
              !widget ||
              Object.entries(patch).every(
                ([key, value]) => JSON.stringify(widget[key as keyof Widget]) === JSON.stringify(value),
              )
            )
              return;
            set((s) => {
              Object.assign(s.doc.widgets[id]!, patch);
            });
          },
          commitLayout: (breakpoint, layout, id, action) => {
            const cleaned = cleanLayout(layout);
            dashboardSchema.parse({
              ...get().doc,
              layouts: { ...get().doc.layouts, [breakpoint]: cleaned },
            });
            const previous = resolveLayouts(get().doc.layouts)[breakpoint];
            if (JSON.stringify(cleaned) === JSON.stringify(previous)) return;
            const before = previous.find((item) => item.i === id);
            const after = cleaned.find((item) => item.i === id);
            set((s) => {
              s.doc.layouts[breakpoint] = cleaned;
              s.announcement = `${action} ${s.doc.widgets[id]?.title ?? 'widget'} from column ${before?.x}, row ${before?.y}, ${before?.w} by ${before?.h} to column ${after?.x}, row ${after?.y}, ${after?.w} by ${after?.h}.`;
            });
          },
          placeWidget: (id, patch) => {
            const { breakpoint, doc } = get();
            const items = cleanLayout(resolveLayouts(doc.layouts)[breakpoint]);
            const item = items.find((entry) => entry.i === id);
            if (!item) return;
            Object.assign(item, patch);
            get().actions.commitLayout(
              breakpoint,
              verticalCompactor.compact(items, GRID_COLUMNS[breakpoint]),
              id,
              patch.w !== undefined || patch.h !== undefined ? 'Resized' : 'Moved',
            );
          },
          addWidget: (id, widget, size) =>
            set((s) => {
              s.doc.widgets[id] = widget;
              for (const breakpoint of ['lg', 'md', 'sm'] as const) {
                const items = s.doc.layouts[breakpoint];
                if (items)
                  items.push({
                    i: id,
                    x: 0,
                    y: bottom(items),
                    w: Math.min(size.w, GRID_COLUMNS[breakpoint]),
                    h: size.h,
                  });
              }
              s.announcement = `Added ${widget.title} at the end of the grid.`;
            }),
          duplicate: (id) => {
            const widget = get().doc.widgets[id];
            const item = get().doc.layouts.lg.find((entry) => entry.i === id);
            if (!widget || !item) return id;
            const copyId = crypto.randomUUID();
            get().actions.addWidget(
              copyId,
              { ...structuredClone(widget), title: `${widget.title} copy` },
              item,
            );
            set({ announcement: `Duplicated ${widget.title} at the end of the grid.` });
            return copyId;
          },
          remove: (id) =>
            set((s) => {
              const title = s.doc.widgets[id]?.title;
              delete s.doc.widgets[id];
              for (const breakpoint of ['lg', 'md', 'sm'] as const) {
                if (s.doc.layouts[breakpoint])
                  s.doc.layouts[breakpoint] = s.doc.layouts[breakpoint].filter((item) => item.i !== id);
              }
              s.announcement = `Removed ${title}.`;
            }),
          importDocument: (document) => {
            if (selectIsSavePending(get())) throw new Error('Wait for the save to finish, then import.');
            if (document.id !== get().doc.id)
              throw new Error('Import a document with the same dashboard id.');
            set({ doc: document, announcement: 'Imported dashboard.' });
          },
          save: async () => {
            const state = get();
            // One write at a time: a second Save while one is unresolved does nothing.
            if (selectIsSavePending(state)) return;
            const document = { ...state.doc, updatedAt: new Date().toISOString() };
            set({ saveState: 'saving' });
            const timer = setTimeout(() => {
              if (get().saveState === 'saving') set({ saveState: 'waiting' });
            }, noticeMs);
            try {
              // The source is the one loaded or last saved: its place and revision, never the place now in use.
              const source = await save(document, state.source);
              const isUnchanged = get().doc === state.doc;
              const history = store.temporal.getState();
              history.pause();
              set((s) => {
                s.baseline = document;
                s.source = source;
                s.saveState = 'idle';
                if (isUnchanged) s.doc.updatedAt = document.updatedAt;
                s.announcement = 'Dashboard saved.';
              });
              history.resume();
            } catch (error) {
              // The draft is kept; the caller shows the message (a conflict says to export the JSON).
              set({ saveState: 'failed', announcement: toAppError(error).message });
              throw error;
            } finally {
              clearTimeout(timer);
            }
          },
          discard: () => {
            if (selectIsSavePending(get())) return;
            const history = store.temporal.getState();
            history.pause();
            set({ doc: get().baseline, tool: null, announcement: 'Discarded changes.' });
            history.clear();
            history.resume();
            if (shouldPersist) clearDraft(get().source.placeId, get().doc.id);
          },
          undo: () => {
            store.temporal.getState().undo();
            set({ announcement: 'Undid the last change.' });
          },
          redo: () => {
            store.temporal.getState().redo();
            set({ announcement: 'Redid the last change.' });
          },
        },
      })),
      { limit: 50, partialize: (s) => ({ doc: s.doc }), equality: (a, b) => a.doc === b.doc },
    ),
  );
  store.subscribe((state, previous) => {
    if (
      state.doc === previous.doc &&
      state.baseline === previous.baseline &&
      state.source === previous.source
    )
      return;
    const document = state.doc;
    const isDirty = serialized(document) !== serialized(state.baseline);
    if (isDirty !== state.isDirty) store.setState({ isDirty });
    if (!shouldPersist) return;
    try {
      if (isDirty) writeDraft({ source: state.source, baseline: state.baseline, document });
      else clearDraft(state.source.placeId, document.id);
      if (state.draftError) store.setState({ draftError: null });
    } catch {
      store.setState({ draftError: 'The draft could not be stored. Export JSON before leaving.' });
    }
  });
  return store;
}

export type DashboardStore = ReturnType<typeof createDashboardStore>;
