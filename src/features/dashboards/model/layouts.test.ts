import { describe, expect, it } from 'vitest';
import { demoWidgets } from '../api/demo';
import { toLayouts } from './layouts';

const cells = (items: { i: string; x: number; y: number; w: number }[]) =>
  items.map(({ i, x, y, w }) => `${i}@${x},${y}:${w}`);

describe('toLayouts', () => {
  it('keeps the lg placement as authored', () => {
    const widgets = demoWidgets('perf');
    expect(toLayouts(widgets).lg.map((l) => l.i)).toEqual(widgets.map((w) => w.id));
  });

  it('reflows thirds into halves on md, in reading order', () => {
    const { md } = toLayouts(demoWidgets('perf'));
    expect(cells(md.slice(0, 4))).toEqual([
      'chart-1@0,0:4',
      'chart-2@4,0:4',
      'chart-3@0,6:4',
      'chart-4@4,6:4',
    ]);
  });

  it('makes wide tiles full width on md and stacks everything on sm', () => {
    const { md, sm } = toLayouts(demoWidgets('sales'));
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
});
