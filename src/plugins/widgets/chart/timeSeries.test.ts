import { describe, expect, it } from 'vite-plus/test';
import type { DataFrame, Field } from '@/core/data/DataFrame';
import { formatTime } from '@/core/time/timeRange';
import { toTimeSeries } from './timeSeries';

const HOUR = 3_600_000;
const START = Date.UTC(2026, 0, 1);

function frameOf(times: number[], extra: Field[] = []): DataFrame {
  return {
    length: times.length,
    fields: [{ name: 'time', type: 'time', values: times }, ...extra],
  };
}

describe('toTimeSeries', () => {
  it('formats labels as times within a day', () => {
    const times = [START, START + HOUR];
    expect(toTimeSeries(frameOf(times), 'UTC').labels).toEqual(
      times.map((t) => formatTime(t, 'UTC', 'time')),
    );
  });

  it('formats labels with the day when the range spans more than a day', () => {
    const times = [START, START + 30 * HOUR];
    expect(toTimeSeries(frameOf(times), 'UTC').labels).toEqual(
      times.map((t) => formatTime(t, 'UTC', 'dayTime')),
    );
  });

  it('formats labels as days when the range spans more than two days', () => {
    const times = [START, START + 72 * HOUR];
    expect(toTimeSeries(frameOf(times), 'UTC').labels).toEqual(times.map((t) => formatTime(t, 'UTC', 'day')));
  });

  it('returns no labels without a time field', () => {
    const frame: DataFrame = { length: 1, fields: [{ name: 'a', type: 'number', values: [1] }] };
    const series = toTimeSeries(frame, 'UTC');
    expect(series.time).toBeUndefined();
    expect(series.labels).toEqual([]);
  });

  it('keeps only number fields as series', () => {
    const frame = frameOf(
      [START, START + HOUR],
      [
        { name: 'host', type: 'string', values: ['a', 'b'] },
        { name: 'x', type: 'number', values: [1, 2] },
        { name: 'y', type: 'number', values: [3, 4] },
      ],
    );
    expect(toTimeSeries(frame, 'UTC').numbers.map((f) => f.name)).toEqual(['x', 'y']);
  });

  it('puts a currency before the value and other units after', () => {
    const withUnit = (unit: string) =>
      toTimeSeries(
        frameOf([START], [{ name: 'v', type: 'number', values: [1200], config: { unit } }]),
        'UTC',
      ).formatValue(1200);
    const plain = (1200).toLocaleString();
    expect(withUnit('€').startsWith('€ ')).toBe(true);
    expect(withUnit('ms')).toBe(`${plain} ms`);
    expect(withUnit('%')).toBe(`${plain}%`);
  });
});
