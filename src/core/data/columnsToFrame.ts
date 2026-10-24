import type { DataFrame, Field, FieldType } from './DataFrame';

/** A result column as a datasource describes it, already mapped to a field type. */
export interface Column {
  name: string;
  type: FieldType;
  label?: string;
  unit?: string;
}

/** A date with no zone (`2026-10-24 09:30:00.123456`): SQL results mean UTC by it. */
const ZONELESS = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?)(\.\d+)?)?$/;
/** `+02` or `-0530` at the end, as Postgres and Redshift print offsets. */
const SHORT_OFFSET = /([+-]\d{2})(\d{2})?$/;

/**
 * A value as epoch milliseconds, or null. Numbers and numeric strings are epoch milliseconds, `Date`s
 * convert, and other strings parse as ISO 8601; a date without a zone is UTC, so the result doesn't
 * depend on the browser's zone.
 */
export function toEpochMs(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value !== 'string' || value.trim() === '') return null;
  const text = value.trim();
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  const zoneless = ZONELESS.exec(text);
  if (zoneless) {
    const [, date, time = '00:00:00', fraction = ''] = zoneless;
    return parse(`${date}T${time.length === 5 ? `${time}:00` : time}${fraction.slice(0, 4)}Z`);
  }
  const withOffset = text.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1');
  return parse(
    SHORT_OFFSET.test(withOffset) && !/[+-]\d{2}:\d{2}$/.test(withOffset)
      ? withOffset.replace(SHORT_OFFSET, (_, hours: string, minutes = '00') => `${hours}:${minutes}`)
      : withOffset,
  );
}

const parse = (text: string) => {
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? null : ms;
};

/** The field type that fits every non-null value: number, boolean or time, else string. */
export function inferFieldType(values: unknown[]): FieldType {
  const present = values.filter((value) => value !== null && value !== undefined);
  if (present.length === 0) return 'string';
  if (present.every((value) => typeof value === 'number' || typeof value === 'bigint')) return 'number';
  if (present.every((value) => typeof value === 'boolean')) return 'boolean';
  if (present.every((value) => value instanceof Date)) return 'time';
  return 'string';
}

/** One value converted to a field's type; anything that doesn't convert is null. */
export function toFieldValue(value: unknown, type: FieldType): unknown {
  if (value === null || value === undefined) return null;
  switch (type) {
    case 'time':
      return toEpochMs(value);
    case 'number': {
      if (typeof value === 'number') return Number.isFinite(value) ? value : null;
      if (typeof value === 'bigint') return Number(value);
      if (typeof value === 'string' && value.trim() !== '') {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
      }
      return null;
    }
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === 't' || value === 1 || value === '1') return true;
      if (value === 'false' || value === 'f' || value === 0 || value === '0') return false;
      return null;
    case 'string':
      if (typeof value === 'string') return value;
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value as number | boolean | bigint);
  }
}

const fieldOf = (column: Column, values: unknown[]): Field => ({
  name: column.name,
  type: column.type,
  values,
  ...(column.label || column.unit ? { config: { label: column.label, unit: column.unit } } : {}),
});

/** Rows of values in column order as a DataFrame, each value converted to its column's type. */
export function columnsToFrame(columns: Column[], rows: unknown[][], name?: string): DataFrame {
  return {
    name,
    length: rows.length,
    fields: columns.map((column, i) =>
      fieldOf(
        column,
        rows.map((row) => toFieldValue(row[i], column.type)),
      ),
    ),
  };
}

/**
 * Objects (documents, items) as a DataFrame: one field per key, in the order keys first appear, each
 * typed from its values. `timeFields` are read as times, from epoch numbers or ISO strings.
 */
export function recordsToFrame(
  records: Record<string, unknown>[],
  { timeFields = [], name }: { timeFields?: string[]; name?: string } = {},
): DataFrame {
  const keys = [...new Set(records.flatMap((record) => Object.keys(record)))];
  const columns = keys.map((key): Column => {
    const values = records.map((record) => record[key]);
    return { name: key, type: timeFields.includes(key) ? 'time' : inferFieldType(values) };
  });
  return columnsToFrame(
    columns,
    records.map((record) => keys.map((key) => record[key])),
    name,
  );
}
