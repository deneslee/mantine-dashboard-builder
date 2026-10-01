import { useMemo, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { ResponsiveGridLayout, useContainerWidth, type EventCallback } from 'react-grid-layout';
import { gridBounds, minMaxSize } from 'react-grid-layout/core';
import { fastVerticalCompactor } from 'react-grid-layout/extras';
import 'react-grid-layout/css/styles.css';
import { dimensions } from '@/ui/tokens/dimensions';
import { useDashboardActions, useDashboard } from '../state/useDashboard';
import { compareReadingOrder, resolveLayouts, type Breakpoint } from '@/core/dashboard/layout';
import type { TimeRange } from '@/core/time/timeRange';
import { usePlugins } from '@/plugins/usePlugins';
import { WidgetTile } from './WidgetTile';
import classes from './DashboardGrid.module.css';

const { grid } = dimensions;
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

export function DashboardGrid({ range, isEditing }: { range: TimeRange; isEditing: boolean }) {
  const { width, containerRef, mounted: isMounted } = useContainerWidth({ measureBeforeMount: true });
  const authored = useDashboard((state) => state.doc.layouts);
  const types = useDashboard(
    useShallow((s) =>
      Object.fromEntries(Object.entries(s.doc.widgets).map(([id, widget]) => [id, widget.type])),
    ),
  );
  const plugins = usePlugins();
  const actions = useDashboardActions();
  const breakpoint = useRef<Breakpoint>('lg');
  const layouts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(resolveLayouts(authored)).map(([key, items]) => [
          key,
          items.map((item) => ({
            ...item,
            minW: Math.min(
              plugins.widgets[types[item.i] ?? '']?.minSize?.w ?? 1,
              grid.cols[key as Breakpoint],
            ),
            minH: plugins.widgets[types[item.i] ?? '']?.minSize?.h ?? 1,
          })),
        ]),
      ),
    [authored, types, plugins],
  );
  const ids = useMemo(() => authored.lg.toSorted(compareReadingOrder).map((item) => item.i), [authored.lg]);
  const children = useMemo(
    () =>
      ids.map((id) => (
        <div key={id}>
          <WidgetTile id={id} range={range} isEditing={isEditing} />
        </div>
      )),
    [ids, range, isEditing],
  );
  // Below md the grid is a single reading-order column: no dragging, even in edit mode.
  const canEditLayout = isEditing && width >= grid.breakpoints.md;
  const commit =
    (action: 'Moved' | 'Resized'): EventCallback =>
    (layout, _old, item) => {
      if (canEditLayout && item) actions.commitLayout(breakpoint.current, layout, item.i, action);
    };
  return (
    <div ref={containerRef} className={classes.root} data-editing={canEditLayout || undefined}>
      {isMounted ? (
        <ResponsiveGridLayout<Breakpoint>
          width={width}
          breakpoints={grid.breakpoints}
          cols={grid.cols}
          layouts={layouts}
          rowHeight={grid.rowHeight}
          margin={margin}
          containerPadding={noPadding}
          dragConfig={canEditLayout ? drag : disabled}
          resizeConfig={canEditLayout ? resize : disabled}
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
