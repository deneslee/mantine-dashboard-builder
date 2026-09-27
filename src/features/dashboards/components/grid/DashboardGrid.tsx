import { useMemo } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { tokens } from '@/design-system/tokens/tokens';
import type { RawRange } from '../../model/timeRange';
import type { Dashboard } from '../../model/types';
import { WidgetTile } from './WidgetTile';
import classes from './DashboardGrid.module.css';

const { grid } = tokens;

// Module constants: the grid gets the same config objects on every render (docs/grid-and-charts.md, rule 5).
const margin = [grid.gap, grid.gap] as const;
const noPadding = [0, 0] as const;
/** Read-only until editing lands (phase 3). */
const dragConfig = { enabled: false };
const resizeConfig = { enabled: false };

interface GridProps {
  dashboard: Pick<Dashboard, 'widgets' | 'layouts'>;
  range: RawRange;
}

/**
 * The dashboard canvas: react-grid-layout v2 with breakpoints on the canvas width, one layout per
 * breakpoint from the document (`toLayouts` filled in the missing ones). The canvas width comes
 * from `useContainerWidth`; the shell keeps it still while panels animate or are dragged, so tiles
 * re-lay out once per shell change. A width change that crosses a breakpoint takes two commits
 * (the grid switches breakpoints in an effect); both normally land before the next frame, since
 * the width is set after the frame that measured it.
 */
export function DashboardGrid({ dashboard, range }: GridProps) {
  // Measure before the first render: otherwise every chart renders once at a guessed width.
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const { widgets, layouts } = dashboard;

  // Keyed by widget id, not by position: the grid positions the tiles (rule 4). A range change
  // re-renders the tiles in place; the grid and the tiles stay mounted.
  const children = useMemo(
    () =>
      widgets.map((w) => (
        <div key={w.id}>
          <WidgetTile widget={w} range={range} />
        </div>
      )),
    [widgets, range],
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
