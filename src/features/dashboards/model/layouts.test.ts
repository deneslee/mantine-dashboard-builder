import { describe, expect, it } from 'vitest';
import { toLayouts, type GridItem } from './layouts';

const cells = (items: GridItem[]) => items.map(({ i, x, y, w }) => `${i}@${x},${y}:${w}`);

/** 20 charts, three per row: the "Grid performance" dashboard. */
const thirds: GridItem[] = Array.from({ length: 20 }, (_, n) => ({
  i: `chart-${n + 1}`,
  x: (n % 3) * 4,
  y: Math.floor(n / 3) * 6,
  w: 4,
  h: 6,
}));

/** The sales dashboard: a full-width row, two-thirds + a third, two halves. */
const sales: GridItem[] = [
  { i: 'kpis', x: 0, y: 0, w: 12, h: 3 },
  { i: 'revenue', x: 0, y: 3, w: 8, h: 6 },
  { i: 'regions', x: 8, y: 3, w: 4, h: 6 },
  { i: 'alarms', x: 0, y: 9, w: 6, h: 6 },
  { i: 'occupancy', x: 6, y: 9, w: 6, h: 6 },
];

describe('toLayouts', () => {
  it('keeps the lg layout as authored', () => {
    expect(toLayouts({ lg: thirds }).lg).toBe(thirds);
  });

  it('reflows thirds into halves on md, in reading order', () => {
    const { md } = toLayouts({ lg: thirds });
    expect(cells(md.slice(0, 4))).toEqual([
      'chart-1@0,0:4',
      'chart-2@4,0:4',
      'chart-3@0,6:4',
      'chart-4@4,6:4',
    ]);
  });

  it('makes wide tiles full width on md and stacks everything on sm', () => {
    const { md, sm } = toLayouts({ lg: sales });
    expect(cells(md)).toEqual([
      'kpis@0,0:8',
      'revenue@0,3:8',
      'regions@0,9:4',
      'alarms@4,9:4',
      'occupancy@0,15:4',
    ]);
    expect(sm.map((l) => [l.i, l.x, l.w])).toEqual(
      ['kpis', 'revenue', 'regions', 'alarms', 'occupancy'].map((i) => [i, 0, 4]),
    );
  });

  it('keeps an authored breakpoint and reflows only the missing one', () => {
    const md: GridItem[] = sales.map((item, n) => ({ ...item, x: 0, y: n * 6, w: 8 }));
    const layouts = toLayouts({ lg: sales, md });
    expect(layouts.md).toBe(md);
    expect(layouts.sm.map((l) => l.w)).toEqual([4, 4, 4, 4, 4]);
  });
});
