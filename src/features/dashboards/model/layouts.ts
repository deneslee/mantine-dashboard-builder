import { tokens } from '@/design-system';
import type { DashboardWidget } from './types';

const { cols } = tokens.grid;

export type Breakpoint = keyof typeof cols;

export interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Packs items left to right, starting a new row when the next one does not fit. */
function reflow(items: GridItem[], columns: number, width: (lgWidth: number) => number): GridItem[] {
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  return items.map((item) => {
    const w = width(item.w);
    if (x + w > columns) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    const placed = { ...item, x, y, w };
    x += w;
    rowHeight = Math.max(rowHeight, item.h);
    return placed;
  });
}

/**
 * Grid layouts for every breakpoint from the widgets' `lg` placement. Smaller canvases reflow in
 * reading order (row by row, left to right): on `md` a tile is half or full width, on `sm` full
 * width. Until phase 2 stores a layout per breakpoint, this keeps the order the author set.
 */
export function toLayouts(widgets: DashboardWidget[]): Record<Breakpoint, GridItem[]> {
  const lg = widgets.map((w) => ({ i: w.id, ...w.placement }));
  const readingOrder = lg.toSorted((a, b) => a.y - b.y || a.x - b.x);
  const half = cols.md / 2;
  return {
    lg,
    md: reflow(readingOrder, cols.md, (w) => ((w * cols.md) / cols.lg <= half ? half : cols.md)),
    sm: reflow(readingOrder, cols.sm, () => cols.sm),
  };
}
