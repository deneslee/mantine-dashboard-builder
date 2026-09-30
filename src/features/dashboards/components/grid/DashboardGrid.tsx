import { useMemo, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { ResponsiveGridLayout, useContainerWidth, type EventCallback } from 'react-grid-layout';
import { gridBounds, minMaxSize } from 'react-grid-layout/core';
import { fastVerticalCompactor } from 'react-grid-layout/extras';
import 'react-grid-layout/css/styles.css';
import { tokens } from '@/design-system/tokens/tokens';
import { useDashboardActions, useDashboardState } from '../../hooks/useDashboard';
import { byReadingOrder, toLayouts, type Breakpoint } from '../../model/layouts';
import type { RawRange } from '../../model/timeRange';
import { useDashboardRegistry } from '../../registry';
import { WidgetTile } from './WidgetTile';
import classes from './DashboardGrid.module.css';

const { grid } = tokens;
const margin = [grid.gap, grid.gap] as const;
const noPadding = [0, 0] as const;
const drag = {
  enabled: true,
  handle: '[data-widget-drag]',
  cancel: 'button,a,input,textarea,[role="button"]',
};
const resize = { enabled: true, handles: ['se'] as ['se'] };
const disabled = { enabled: false };
const constraints = [gridBounds, minMaxSize];

export function DashboardGrid({ range }: { range: RawRange }) {
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const authored = useDashboardState((state) => state.doc.layouts);
  const mode = useDashboardState((state) => state.mode);
  const types = useDashboardState(
    useShallow((s) =>
      Object.fromEntries(Object.values(s.doc.widgets).map((widget) => [widget.id, widget.type])),
    ),
  );
  const registry = useDashboardRegistry();
  const actions = useDashboardActions();
  const breakpoint = useRef<Breakpoint>('lg');
  const layouts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(toLayouts(authored)).map(([key, items]) => [
          key,
          items.map((item) => ({
            ...item,
            minW: Math.min(
              registry.widgets[types[item.i] ?? '']?.minSize?.w ?? 1,
              grid.cols[key as Breakpoint],
            ),
            minH: registry.widgets[types[item.i] ?? '']?.minSize?.h ?? 1,
          })),
        ]),
      ),
    [authored, types, registry],
  );
  const ids = useMemo(() => authored.lg.toSorted(byReadingOrder).map((item) => item.i), [authored.lg]);
  const children = useMemo(
    () =>
      ids.map((id) => (
        <div key={id}>
          <WidgetTile id={id} range={range} />
        </div>
      )),
    [ids, range],
  );
  const editing = mode === 'edit' && width >= grid.breakpoints.md;
  const commit =
    (action: 'Moved' | 'Resized'): EventCallback =>
    (layout, _old, item) => {
      if (editing && item) actions.commitLayout(breakpoint.current, layout, item.i, action);
    };
  return (
    <div ref={containerRef} className={classes.root} data-editing={editing || undefined}>
      {mounted ? (
        <ResponsiveGridLayout<Breakpoint>
          width={width}
          breakpoints={grid.breakpoints}
          cols={grid.cols}
          layouts={layouts}
          rowHeight={grid.rowHeight}
          margin={margin}
          containerPadding={noPadding}
          dragConfig={editing ? drag : disabled}
          resizeConfig={editing ? resize : disabled}
          constraints={constraints}
          compactor={ids.length > 100 ? fastVerticalCompactor : undefined}
          onBreakpointChange={(next) => {
            breakpoint.current = next;
            actions.setBreakpoint(next);
          }}
          onDragStop={commit('Moved')}
          onResizeStop={commit('Resized')}
        >
          {children}
        </ResponsiveGridLayout>
      ) : null}
    </div>
  );
}
