import { tokens } from '@/design-system/tokens/tokens';

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

/** Row by row, left to right: the order a reader meets the tiles. */
export const byReadingOrder = (a: GridItem, b: GridItem) => a.y - b.y || a.x - b.x;

/** Layouts as a document stores them: `lg` always, `md` / `sm` only where the author wrote one. */
export interface AuthoredLayouts {
  lg: GridItem[];
  md?: GridItem[];
  sm?: GridItem[];
}

/**
 * A layout for every breakpoint. Authored `md` / `sm` layouts are kept; a missing one is reflowed
 * from `lg` in reading order: on `md` a tile is half or full width, on `sm` full width. Authors
 * only write a smaller layout where the reflow gets it wrong.
 */
export function toLayouts({ lg, md, sm }: AuthoredLayouts): Record<Breakpoint, GridItem[]> {
  const readingOrder = lg.toSorted(byReadingOrder);
  const half = cols.md / 2;
  return {
    lg,
    md: md ?? reflow(readingOrder, cols.md, (w) => ((w * cols.md) / cols.lg <= half ? half : cols.md)),
    sm: sm ?? reflow(readingOrder, cols.sm, () => cols.sm),
  };
}
