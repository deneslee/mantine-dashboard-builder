import { verticalCompactor } from 'react-grid-layout/core';
import { createStore } from 'zustand/vanilla';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import { tokens } from '@/ui/tokens/tokens';
import { clearDraft, readDraft, writeDraft } from '../data/drafts';
import { toDocument } from '../data/mapper';
import { dashboardDoc } from '@/core/dashboard/dashboardSchema';
import type { DashboardRepository } from '../data/repository';
import { byReadingOrder, toLayouts, type Breakpoint, type GridItem } from '@/core/dashboard/layout';
import type { Dashboard, Widget } from './types';
import type { RawRange } from '@/core/time/timeRange';

type Content = Omit<Dashboard, 'timeRange' | 'refresh'>;
export type Tool = { kind: 'palette' } | { kind: 'move' | 'resize'; id: string } | null;
export interface DashboardState {
  doc: Content;
  timeRange: RawRange;
  refresh: string;
  baseline: Dashboard;
  dirty: boolean;
  draftError: string | null;
  mode: 'view' | 'edit';
  breakpoint: Breakpoint;
  tool: Tool;
  announcement: string;
  actions: {
    setMode(this: void, mode: 'view' | 'edit'): void;
    setBreakpoint(this: void, breakpoint: Breakpoint): void;
    openTool(this: void, tool: Tool): void;
    setRange(this: void, range: RawRange): void;
    setRefresh(this: void, refresh: string): void;
    editWidget(
      this: void,
      id: string,
      patch: Partial<Pick<Widget, 'title' | 'description' | 'options' | 'queries'>>,
    ): void;
    commitLayout(
      this: void,
      breakpoint: Breakpoint,
      layout: readonly GridItem[],
      id: string,
      action: 'Moved' | 'Resized',
    ): void;
    placeWidget(this: void, id: string, patch: Partial<Pick<GridItem, 'x' | 'y' | 'w' | 'h'>>): void;
    addWidget(this: void, widget: Widget, size: { w: number; h: number }): void;
    duplicate(this: void, id: string): string;
    remove(this: void, id: string): void;
    importDocument(this: void, document: Dashboard): void;
    save(this: void): Promise<void>;
    discard(this: void): void;
    undo(this: void): void;
    redo(this: void): void;
  };
}

const split = ({ timeRange, refresh, ...doc }: Dashboard) => ({ doc, timeRange, refresh });
export const currentDocument = (state: Pick<DashboardState, 'doc' | 'timeRange' | 'refresh'>): Dashboard => ({
  ...state.doc,
  timeRange: state.timeRange,
  refresh: state.refresh,
});
const serialized = (dashboard: Dashboard) => JSON.stringify(dashboardDoc.parse(toDocument(dashboard)));
const bottom = (items: readonly GridItem[]) => Math.max(0, ...items.map((item) => item.y + item.h));
const cleanLayout = (items: readonly GridItem[]): GridItem[] =>
  items.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }));

export function createDashboardStore(
  baseline: Dashboard,
  repository: DashboardRepository,
  mode: 'view' | 'edit' = 'view',
  persisted = true,
) {
  let restored: ReturnType<typeof readDraft> = undefined;
  let draftError: string | null = null;
  if (persisted) {
    try {
      restored = readDraft(baseline.id);
    } catch {
      draftError = 'The draft could not be restored. Its stored copy was kept.';
    }
  }
  const initial = restored?.document ?? baseline;
  const saved = restored?.baseline ?? baseline;
  const store = createStore<DashboardState>()(
    temporal(
      immer((set, get) => ({
        ...split(initial),
        baseline: saved,
        dirty: serialized(initial) !== serialized(saved),
        draftError,
        mode: restored ? 'edit' : mode,
        breakpoint: 'lg',
        tool: null,
        announcement: '',
        actions: {
          setMode: (next) => set({ mode: next }),
          setBreakpoint: (breakpoint) => set({ breakpoint }),
          openTool: (tool) => set({ tool }),
          setRange: (timeRange) => set({ timeRange }),
          setRefresh: (refresh) => set({ refresh }),
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
            dashboardDoc.parse({
              ...toDocument(currentDocument(get())),
              layouts: { ...get().doc.layouts, [breakpoint]: cleaned },
            });
            const previous = toLayouts(get().doc.layouts)[breakpoint];
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
            const items = cleanLayout(toLayouts(doc.layouts)[breakpoint]);
            const item = items.find((entry) => entry.i === id);
            if (!item) return;
            Object.assign(item, patch);
            get().actions.commitLayout(
              breakpoint,
              verticalCompactor.compact(items, tokens.grid.cols[breakpoint]),
              id,
              patch.w !== undefined || patch.h !== undefined ? 'Resized' : 'Moved',
            );
          },
          addWidget: (widget, size) =>
            set((s) => {
              s.doc.widgets[widget.id] = widget;
              for (const breakpoint of ['lg', 'md', 'sm'] as const) {
                const items = s.doc.layouts[breakpoint];
                if (items)
                  items.push({
                    i: widget.id,
                    x: 0,
                    y: bottom(items),
                    w: Math.min(size.w, tokens.grid.cols[breakpoint]),
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
              { ...structuredClone(widget), id: copyId, title: `${widget.title} copy` },
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
            if (document.id !== get().doc.id)
              throw new Error('Import a document with the same dashboard id.');
            set({ ...split(document), announcement: 'Imported dashboard.' });
          },
          save: async () => {
            const state = get();
            const document = { ...currentDocument(state), updatedAt: new Date().toISOString() };
            await repository.save(document);
            const unchanged = get().doc === state.doc;
            const history = store.temporal.getState();
            history.pause();
            set((s) => {
              s.baseline = document;
              if (unchanged) s.doc.updatedAt = document.updatedAt;
              s.announcement = 'Dashboard saved locally.';
            });
            history.resume();
          },
          discard: () => {
            const history = store.temporal.getState();
            history.pause();
            set({ ...split(get().baseline), tool: null, announcement: 'Discarded changes.' });
            history.clear();
            history.resume();
            if (persisted) clearDraft(get().doc.id);
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
      state.timeRange === previous.timeRange &&
      state.refresh === previous.refresh &&
      state.baseline === previous.baseline
    )
      return;
    const document = currentDocument(state);
    const dirty = serialized(document) !== serialized(state.baseline);
    if (dirty !== state.dirty) store.setState({ dirty });
    if (!persisted) return;
    try {
      if (dirty) writeDraft(state.baseline, document);
      else clearDraft(document.id);
      if (state.draftError) store.setState({ draftError: null });
    } catch {
      store.setState({ draftError: 'The draft could not be stored. Export JSON before leaving.' });
    }
  });
  return store;
}

export type DashboardStore = ReturnType<typeof createDashboardStore>;
export const readingOrder = (doc: Content) => doc.layouts.lg.toSorted(byReadingOrder).map((item) => item.i);
