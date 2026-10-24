import { columnsToFrame, type Column } from '@/core/data/columnsToFrame';
import type { DataFrame, FieldType } from '@/core/data/DataFrame';

/**
 * Results of the RDS and Redshift Data APIs as frames. Both return records of `Field` unions and a
 * type name per column (`int8`, `timestamptz`, `DECIMAL`, …).
 */

/** One Data API value: a union with one key set. */
export interface DataApiField {
  isNull?: boolean;
  booleanValue?: boolean;
  longValue?: number;
  doubleValue?: number;
  stringValue?: string;
  blobValue?: Uint8Array;
  arrayValue?: unknown;
}

// Whole words, so `interval` isn't `int` and `INT UNSIGNED` or `DECIMAL(10,2)` still are numbers.
const NUMBERS =
  /^(int[248]?|integer|bigint|smallint|tinyint|mediumint|bigserial|smallserial|serial[248]?|numeric|decimal|float[48]?|double|real|money|oid)\b/i;
const BOOLEANS = /^(bool|boolean|bit)$/i;
const TIMES = /^(timestamp|timestamptz|datetime|date)\b/i;

/** A SQL type name as a field type: numbers, booleans and dates; the rest is text. */
export function sqlTypeToFieldType(typeName = ''): FieldType {
  if (BOOLEANS.test(typeName)) return 'boolean';
  if (NUMBERS.test(typeName)) return 'number';
  if (TIMES.test(typeName)) return 'time';
  return 'string';
}

export function dataApiValue(field: DataApiField | undefined): unknown {
  if (!field || field.isNull) return null;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.longValue !== undefined) return field.longValue;
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.arrayValue !== undefined) return JSON.stringify(field.arrayValue);
  if (field.blobValue !== undefined) return `${field.blobValue.length} bytes`;
  return null;
}

export function dataApiToFrame(
  columns: { name?: string; label?: string; typeName?: string }[],
  records: DataApiField[][],
): DataFrame {
  const fields: Column[] = columns.map((column, i) => ({
    name: column.label || column.name || `column${i + 1}`,
    type: sqlTypeToFieldType(column.typeName),
  }));
  return columnsToFrame(
    fields,
    records.map((record) => record.map(dataApiValue)),
  );
}
