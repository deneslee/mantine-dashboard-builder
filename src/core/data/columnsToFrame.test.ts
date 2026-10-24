import { describe, expect, it } from 'vite-plus/test';
import { columnsToFrame, inferFieldType, recordsToFrame, toEpochMs, toFieldValue } from './columnsToFrame';

const at = (iso: string) => Date.parse(iso);

describe('toEpochMs', () => {
  it.each([
    ['a date without a zone is UTC midnight', '2026-10-24', at('2026-10-24T00:00:00Z')],
    ['a SQL timestamp without a zone is UTC', '2026-10-24 09:30:00', at('2026-10-24T09:30:00Z')],
    ['minutes only', '2026-10-24 09:30', at('2026-10-24T09:30:00Z')],
    ['microseconds are cut to milliseconds', '2026-10-24 09:30:00.123456', at('2026-10-24T09:30:00.123Z')],
    ['an ISO time in UTC', '2026-10-24T09:30:00Z', at('2026-10-24T09:30:00Z')],
    ['a full offset', '2026-10-24T11:30:00+02:00', at('2026-10-24T09:30:00Z')],
    ['a Postgres offset in hours', '2026-10-24 11:30:00+02', at('2026-10-24T09:30:00Z')],
    ['an offset without a colon', '2026-10-24T15:00:00+0530', at('2026-10-24T09:30:00Z')],
    ['offset and microseconds', '2026-10-24 09:30:00.123456+00', at('2026-10-24T09:30:00.123Z')],
    ['a numeric string is epoch milliseconds', '1792834200000', 1792834200000],
  ])('%s', (_, value, expected) => {
    expect(toEpochMs(value)).toBe(expected);
  });

  it('reads numbers, bigints and dates, and gives null for anything else', () => {
    expect(toEpochMs(1792834200000)).toBe(1792834200000);
    expect(toEpochMs(1792834200000n)).toBe(1792834200000);
    expect(toEpochMs(new Date('2026-10-24T09:30:00Z'))).toBe(at('2026-10-24T09:30:00Z'));
    expect(toEpochMs('next tuesday')).toBeNull();
    expect(toEpochMs('')).toBeNull();
    expect(toEpochMs(Number.NaN)).toBeNull();
    expect(toEpochMs(new Date('nope'))).toBeNull();
    expect(toEpochMs({})).toBeNull();
  });
});

describe('inferFieldType', () => {
  it('picks the type every non-null value has, else string', () => {
    expect(inferFieldType([1, null, 2.5, 3n])).toBe('number');
    expect(inferFieldType([true, undefined, false])).toBe('boolean');
    expect(inferFieldType([new Date(), null])).toBe('time');
    expect(inferFieldType([1, 'a'])).toBe('string');
    expect(inferFieldType([null, undefined])).toBe('string');
  });
});

describe('toFieldValue', () => {
  it('converts to numbers, keeping null for what is not one', () => {
    expect(toFieldValue('12.5', 'number')).toBe(12.5);
    expect(toFieldValue(7n, 'number')).toBe(7);
    expect(toFieldValue('', 'number')).toBeNull();
    expect(toFieldValue('n/a', 'number')).toBeNull();
    expect(toFieldValue(Number.POSITIVE_INFINITY, 'number')).toBeNull();
  });

  it('converts booleans as SQL drivers print them', () => {
    expect(toFieldValue('t', 'boolean')).toBe(true);
    expect(toFieldValue(0, 'boolean')).toBe(false);
    expect(toFieldValue('maybe', 'boolean')).toBeNull();
  });

  it('turns anything into text for string fields', () => {
    expect(toFieldValue({ a: 1 }, 'string')).toBe('{"a":1}');
    expect(toFieldValue(new Date('2026-10-24T09:30:00Z'), 'string')).toBe('2026-10-24T09:30:00.000Z');
    expect(toFieldValue(3, 'string')).toBe('3');
    expect(toFieldValue(null, 'string')).toBeNull();
  });
});

describe('columnsToFrame', () => {
  it('makes one field per column, values converted, with labels and units when given', () => {
    const frame = columnsToFrame(
      [
        { name: 'day', type: 'time' },
        { name: 'revenue', type: 'number', unit: '€' },
      ],
      [
        ['2026-10-24', '120.5'],
        ['2026-10-25', null],
      ],
      'sales',
    );
    expect(frame).toEqual({
      name: 'sales',
      length: 2,
      fields: [
        { name: 'day', type: 'time', values: [at('2026-10-24T00:00:00Z'), at('2026-10-25T00:00:00Z')] },
        { name: 'revenue', type: 'number', values: [120.5, null], config: { label: undefined, unit: '€' } },
      ],
    });
  });
});

describe('recordsToFrame', () => {
  it('takes keys in the order they first appear and fills gaps with null', () => {
    const frame = recordsToFrame([{ a: 1 }, { b: 'x', a: 2 }]);
    expect(frame.fields.map((field) => [field.name, field.type, field.values])).toEqual([
      ['a', 'number', [1, 2]],
      ['b', 'string', [null, 'x']],
    ]);
    expect(frame.length).toBe(2);
  });

  it('reads `timeFields` as times from ISO strings or epoch numbers', () => {
    const frame = recordsToFrame([{ at: '2026-10-24T09:30:00Z' }, { at: 1792834200000 }], {
      timeFields: ['at'],
    });
    expect(frame.fields[0]).toEqual({
      name: 'at',
      type: 'time',
      values: [at('2026-10-24T09:30:00Z'), 1792834200000],
    });
  });
});
