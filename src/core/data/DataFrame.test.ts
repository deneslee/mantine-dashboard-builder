import { describe, expect, it } from 'vitest';
import { frameToCsv, getFieldLabel, frameToRows, type DataFrame } from './DataFrame';

describe('frameToCsv', () => {
  it('writes a header and a line per row, quoting only where needed', () => {
    const frame: DataFrame = {
      length: 2,
      fields: [
        { name: 'time', type: 'time', values: [Date.UTC(2026, 8, 20), null] },
        { name: 'site', type: 'string', values: ['Budapest, HQ', 'say "hi"'] },
        { name: 'value', type: 'number', values: [1.5, 2] },
      ],
    };
    expect(frameToCsv(frame)).toBe(
      'time,site,value\n2026-09-20T00:00:00.000Z,"Budapest, HQ",1.5\n,"say ""hi""",2',
    );
  });
});

describe('frameToRows', () => {
  it('turns columns into row objects for every field type', () => {
    const frame: DataFrame = {
      length: 2,
      fields: [
        { name: 'time', type: 'time', values: [1000, 2000] },
        { name: 'value', type: 'number', values: [1.5, 2.5] },
        { name: 'site', type: 'string', values: ['A', 'B'] },
        { name: 'ok', type: 'boolean', values: [true, false] },
      ],
    };
    expect(frameToRows(frame)).toEqual([
      { time: 1000, value: 1.5, site: 'A', ok: true },
      { time: 2000, value: 2.5, site: 'B', ok: false },
    ]);
  });

  it('returns no rows for an empty frame', () => {
    expect(frameToRows({ length: 0, fields: [{ name: 'value', type: 'number', values: [] }] })).toEqual([]);
    expect(frameToRows({ length: 0, fields: [] })).toEqual([]);
  });
});

describe('getFieldLabel', () => {
  it('prefers the configured label', () => {
    expect(getFieldLabel({ name: 'revenue', type: 'number', values: [], config: { label: 'Revenue' } })).toBe(
      'Revenue',
    );
    expect(getFieldLabel({ name: 'revenue', type: 'number', values: [] })).toBe('revenue');
  });
});
