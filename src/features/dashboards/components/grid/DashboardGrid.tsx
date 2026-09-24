import { useMemo } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { tokens } from '@/design-system/tokens/tokens';
import { toLayouts } from '../../model/layouts';
import type { DashboardWidget } from '../../model/types';
import { WidgetTile } from './WidgetTile';
import classes from './DashboardGrid.module.css';

const { grid } = tokens;

// Module constants: the grid gets the same config objects on every render (docs/grid-and-charts.md, rule 5).
const margin = [grid.gap, grid.gap] as const;
const noPadding = [0, 0] as const;
/** Read-only until editing lands (phase 3). */
const dragConfig = { enabled: false };
const resizeConfig = { enabled: false };

/**
 * The dashboard canvas: react-grid-layout v2 with breakpoints on the canvas width.
 * Widgets carry their `lg` placement; smaller breakpoints reflow in reading order (`toLayouts`).
 * The canvas width comes from `useContainerWidth`; the shell keeps it still while panels animate
 * or are dragged, so tiles re-lay out once per shell change. A width change that crosses a
 * breakpoint takes two commits (the grid switches breakpoints in an effect); both normally land
 * before the next frame, since the width is set after the frame that measured it.
 */
export function DashboardGrid({ dashboardId, widgets }: { dashboardId: string; widgets: DashboardWidget[] }) {
  // Measure before the first render: otherwise every chart renders once at a guessed width.
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });

  const layouts = useMemo(() => toLayouts(widgets), [widgets]);

  // Keyed by widget id, not by position: the grid positions the tiles (rule 4).
  const children = useMemo(
    () =>
      widgets.map((w) => (
        <div key={w.id}>
          <WidgetTile dashboardId={dashboardId} widget={w} />
        </div>
      )),
    [dashboardId, widgets],
  );

  return (
    <div ref={containerRef} className={classes.root}>
      {mounted ? (
        <ResponsiveGridLayout
          width={width}
          breakpoints={grid.breakpoints}
          cols={grid.cols}
          layouts={layouts}
          rowHeight={grid.rowHeight}
          margin={margin}
          containerPadding={noPadding}
          dragConfig={dragConfig}
          resizeConfig={resizeConfig}
        >
          {children}
        </ResponsiveGridLayout>
      ) : null}
    </div>
  );
}
