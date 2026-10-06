export type FieldType = 'time' | 'number' | 'string' | 'boolean';

export interface FieldConfig {
  /** Display name; the field name when missing. */
  label?: string;
  /** Unit shown with the values, e.g. `€` or `ms`. */
  unit?: string;
}

/** One column. `time` values are epoch milliseconds. */
export interface Field {
  name: string;
  type: FieldType;
  values: unknown[];
  config?: FieldConfig;
}

/**
 * Columnar data: the only thing a datasource hands to a widget (Grafana's DataFrame, trimmed).
 * `length` is the number of rows; every field has that many values.
 */
export interface DataFrame {
  name?: string;
  length: number;
  fields: Field[];
}

export type Row = Record<string, unknown>;

/** Row objects keyed by field name, the shape Mantine charts take. */
export function frameToRows(frame: DataFrame): Row[] {
  return Array.from({ length: frame.length }, (_, i) =>
    Object.fromEntries(frame.fields.map((field) => [field.name, field.values[i]])),
  );
}

const csvCell = (text: string) => (/[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text);

/** The frame as CSV: a header of field names, then one line per row. Times are ISO dates, nulls empty. */
export function frameToCsv(frame: DataFrame): string {
  const lines = [frame.fields.map((field) => csvCell(field.name)).join(',')];
  for (let i = 0; i < frame.length; i++)
    lines.push(
      frame.fields
        .map(({ type, values: { [i]: value } }) => {
          if (value === null || value === undefined) return '';
          if (type === 'time' && typeof value === 'number') return new Date(value).toISOString();
          return csvCell(
            typeof value === 'object' ? JSON.stringify(value) : String(value as string | number | boolean),
          );
        })
        .join(','),
    );
  return lines.join('\n');
}

/** A field's display name. */
export const getFieldLabel = (field: Field) => field.config?.label ?? field.name;

const LEADING_UNITS = new Set(['€', '$', '£']);

/** Where a unit goes around a number: currencies before (`€ 1 200`), anything else after (`320 ms`, `55%`). */
export function getUnitAffix(unit?: string): { prefix?: string; suffix?: string } {
  if (!unit) return {};
  if (LEADING_UNITS.has(unit)) return { prefix: `${unit} ` };
  return { suffix: unit === '%' ? '%' : ` ${unit}` };
}
