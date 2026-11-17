import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { GridLayout, useContainerWidth, type EventCallback } from 'react-grid-layout';
import { gridBounds, minMaxSize } from 'react-grid-layout/core';
import { fastVerticalCompactor } from 'react-grid-layout/extras';
import 'react-grid-layout/css/styles.css';
import { dimensions } from '@/ui/tokens/dimensions';
import { useDensity } from '@/lib/useDensity';
import { useDashboardActions, useDashboard } from '../state/useDashboard';
import {
  breakpointForWidth,
  compareReadingOrder,
  resolveLayouts,
  type Breakpoint,
} from '@/core/dashboard/layout';
import type { TimeRange } from '@/core/time/timeRange';
import { usePlugins } from '@/plugins/usePlugins';
import { WidgetTile } from './WidgetTile';
import classes from './DashboardGrid.module.css';

const { grid } = dimensions;
const noPadding = [0, 0] as const;
const drag = {
  enabled: true,
  handle: '[data-widget-drag]',
  cancel: 'button,a,input,textarea,[role="button"]',
};
const resize = { enabled: true, handles: ['se'] as ['se'] };
const disabled = { enabled: false };
const constraints = [gridBounds, minMaxSize];

export function DashboardGrid({
  range,
  timeZone,
  isEditing,
  isDataActive,
}: {
  range: TimeRange;
  timeZone: string;
  isEditing: boolean;
  /** False while the grid is hidden (one widget full screen): its tiles make no requests. */
  isDataActive: boolean;
}) {
  const { width, containerRef, mounted: isMounted } = useContainerWidth({ measureBeforeMount: true });
  const [density] = useDensity();
  const gap = grid.gap[density];
  const authored = useDashboard((state) => state.doc.layouts);
  const types = useDashboard(
    useShallow((s) =>
      Object.fromEntries(Object.entries(s.doc.widgets).map(([id, widget]) => [id, widget.type])),
    ),
  );
  const plugins = usePlugins();
  const actions = useDashboardActions();
  // Derived from the measured width in the same render, so columns and tile widths change together. Tile positions still settle one commit later (GridLayout syncs its layout prop in an effect).
  const breakpoint = breakpointForWidth(width, grid.breakpoints);
  const setBreakpoint = actions.setBreakpoint;
  useEffect(() => {
    if (isMounted) setBreakpoint(breakpoint);
  }, [isMounted, breakpoint, setBreakpoint]);
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
          <WidgetTile
            id={id}
            range={range}
            timeZone={timeZone}
            isEditing={isEditing}
            isDataActive={isDataActive}
          />
        </div>
      )),
    [ids, range, timeZone, isEditing, isDataActive],
  );
  // Below md the grid is a single reading-order column: no dragging, even in edit mode.
  const canEditLayout = isEditing && breakpoint !== 'sm';
  const gridConfig = useMemo(
    () => ({
      cols: grid.cols[breakpoint],
      rowHeight: grid.rowHeight,
      margin: [gap, gap] as const,
      containerPadding: noPadding,
    }),
    [breakpoint, gap],
  );
  const commit =
    (action: 'Moved' | 'Resized'): EventCallback =>
    (layout, _old, item) => {
      if (canEditLayout && item) actions.commitLayout(breakpoint, layout, item.i, action);
    };
  return (
    <div ref={containerRef} className={classes.root} data-editing={canEditLayout || undefined}>
      {isMounted ? (
        <GridLayout
          width={width}
          gridConfig={gridConfig}
          layout={layouts[breakpoint]}
          dragConfig={canEditLayout ? drag : disabled}
          resizeConfig={canEditLayout ? resize : disabled}
          constraints={constraints}
          compactor={ids.length > 100 ? fastVerticalCompactor : undefined}
          onDragStop={commit('Moved')}
          onResizeStop={commit('Resized')}
        >
          {children}
        </GridLayout>
      ) : null}
    </div>
  );
}
