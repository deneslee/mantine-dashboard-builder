import { AppError } from '../errors/AppError';
import type { ListFilter, ListQuery, ListResult, ListSort, StoredRecord } from './RecordProvider';

const fieldOf = (record: StoredRecord, field: string) => (field === 'id' ? record.id : record.data[field]);

const isComparable = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

/** Orders values of one type; anything else (missing, null, mixed types, objects) sorts last. */
function compareValues(a: unknown, b: unknown) {
  const isA = isComparable(a);
  const isB = isComparable(b);
  if (!isA || !isB) return Number(!isA) - Number(!isB);
  if (typeof a !== typeof b) return typeof a < typeof b ? -1 : 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function matchesFilter(record: StoredRecord, { field, operator, value }: ListFilter) {
  const actual = fieldOf(record, field);
  const isOrdered = isComparable(actual) && typeof actual === typeof value;
  switch (operator) {
    case 'eq':
      return actual === value;
    case 'ne':
      return actual !== value;
    case 'lt':
      return isOrdered && compareValues(actual, value) < 0;
    case 'lte':
      return isOrdered && compareValues(actual, value) <= 0;
    case 'gt':
      return isOrdered && compareValues(actual, value) > 0;
    case 'gte':
      return isOrdered && compareValues(actual, value) >= 0;
    case 'in':
      return Array.isArray(value) && value.includes(actual);
    case 'contains':
      if (Array.isArray(actual)) return actual.includes(value);
      return (
        typeof actual === 'string' &&
        typeof value === 'string' &&
        actual.toLowerCase().includes(value.toLowerCase())
      );
  }
}

function matchesText(record: StoredRecord, text: string) {
  const needle = text.trim().toLowerCase();
  if (!needle) return true;
  return Object.values(record.data).some(
    (value) => typeof value === 'string' && value.toLowerCase().includes(needle),
  );
}

function compareRecords(a: StoredRecord, b: StoredRecord, sort: ListSort[]) {
  for (const { field, direction } of sort) {
    const order = compareValues(fieldOf(a, field), fieldOf(b, field));
    if (order !== 0) return direction === 'asc' ? order : -order;
  }
  return compareValues(a.id, b.id);
}

/** The cursor is the offset of the next page, as text. */
function readCursor(cursor: string | undefined) {
  if (cursor === undefined) return 0;
  const offset = Number(cursor);
  if (!Number.isInteger(offset) || offset < 0)
    throw new AppError('validation', `"${cursor}" is not a cursor from an earlier page.`);
  return offset;
}

/** Filters, sorts and pages a whole collection in memory: the contract's list semantics, shared by providers. */
export function runListQuery(records: StoredRecord[], query: ListQuery): ListResult {
  let matches = records.filter(
    (record) =>
      (query.text === undefined || matchesText(record, query.text)) &&
      (query.filters ?? []).every((filter) => matchesFilter(record, filter)),
  );
  // Without a sort the order is the order of creation.
  if (query.sort?.length) matches = matches.toSorted((a, b) => compareRecords(a, b, query.sort!));
  const total = matches.length;
  if (!query.page) return { records: matches, total };
  const { size, cursor } = query.page;
  if (!Number.isInteger(size) || size < 1)
    throw new AppError('validation', 'A page holds at least one record.');
  const start = readCursor(cursor);
  const end = start + size;
  return {
    records: matches.slice(start, end),
    total,
    ...(end < total && { nextCursor: String(end) }),
  };
}
