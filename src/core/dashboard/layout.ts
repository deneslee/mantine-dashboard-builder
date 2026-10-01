/** Grid columns per breakpoint. Part of the document format: layouts are validated against it. */
export const GRID_COLUMNS = { lg: 12, md: 8, sm: 4 } as const;

export type Breakpoint = keyof typeof GRID_COLUMNS;

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Packs items left to right, starting a new row when the next one does not fit. */
function reflow(items: LayoutItem[], columns: number, width: (lgWidth: number) => number): LayoutItem[] {
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

/** Row by row, left to right: the order a reader meets the tiles. */
export const compareReadingOrder = (a: LayoutItem, b: LayoutItem) => a.y - b.y || a.x - b.x;

/** Layouts as a document stores them: `lg` always, `md` / `sm` only where the author wrote one. */
export interface Layouts {
  lg: LayoutItem[];
  md?: LayoutItem[];
  sm?: LayoutItem[];
}

/**
 * A layout for every breakpoint. Authored `md` / `sm` layouts are kept; a missing one is reflowed
 * from `lg` in reading order: on `md` a tile is half or full width, on `sm` full width. Authors
 * only write a smaller layout where the reflow gets it wrong.
 */
export function resolveLayouts({ lg, md, sm }: Layouts): Record<Breakpoint, LayoutItem[]> {
  const readingOrder = lg.toSorted(compareReadingOrder);
  const half = GRID_COLUMNS.md / 2;
  return {
    lg,
    md:
      md ??
      reflow(readingOrder, GRID_COLUMNS.md, (w) =>
        (w * GRID_COLUMNS.md) / GRID_COLUMNS.lg <= half ? half : GRID_COLUMNS.md,
      ),
    sm: sm ?? reflow(readingOrder, GRID_COLUMNS.sm, () => GRID_COLUMNS.sm),
  };
}
