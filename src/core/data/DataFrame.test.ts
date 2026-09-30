import { describe, expect, it } from 'vitest';
import { fieldLabel, toRows, type DataFrame } from './DataFrame';

describe('toRows', () => {
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
    expect(toRows(frame)).toEqual([
      { time: 1000, value: 1.5, site: 'A', ok: true },
      { time: 2000, value: 2.5, site: 'B', ok: false },
    ]);
  });

  it('returns no rows for an empty frame', () => {
    expect(toRows({ length: 0, fields: [{ name: 'value', type: 'number', values: [] }] })).toEqual([]);
    expect(toRows({ length: 0, fields: [] })).toEqual([]);
  });
});

describe('fieldLabel', () => {
  it('prefers the configured label', () => {
    expect(fieldLabel({ name: 'revenue', type: 'number', values: [], config: { label: 'Revenue' } })).toBe(
      'Revenue',
    );
    expect(fieldLabel({ name: 'revenue', type: 'number', values: [] })).toBe('revenue');
  });
});
