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
export function toRows(frame: DataFrame): Row[] {
  return Array.from({ length: frame.length }, (_, i) =>
    Object.fromEntries(frame.fields.map((field) => [field.name, field.values[i]])),
  );
}

/** A field's display name. */
export const fieldLabel = (field: Field) => field.config?.label ?? field.name;

const leadingUnits = new Set(['€', '$', '£']);

/** Where a unit goes around a number: currencies before (`€ 1 200`), anything else after (`320 ms`, `55%`). */
export function unitAffix(unit?: string): { prefix?: string; suffix?: string } {
  if (!unit) return {};
  if (leadingUnits.has(unit)) return { prefix: `${unit} ` };
  return { suffix: unit === '%' ? '%' : ` ${unit}` };
}
