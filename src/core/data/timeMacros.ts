import type { ResolvedRange } from '../time/timeRange';

/**
 * The time range in a query: `$__from` and `$__to` are the ends as timestamps, `$__fromMs` and
 * `$__toMs` as epoch milliseconds. Each datasource turns them into its own bound parameters.
 */
export type TimeMacro = 'from' | 'to' | 'fromMs' | 'toMs';

export const TIME_MACROS: readonly TimeMacro[] = ['from', 'to', 'fromMs', 'toMs'];

// Longest first, so `$__fromMs` isn't read as `$__from` followed by `Ms`.
const MACRO = /\$__(fromMs|toMs|from|to)\b/g;

/**
 * Replaces each macro in a query's text with what `replace` returns (a parameter name, or a literal
 * built from our own values). `used` lists the macros in the order they appear, repeats included,
 * for datasources with positional parameters.
 */
export function expandTimeMacros(
  text: string,
  replace: (macro: TimeMacro) => string,
): { text: string; used: TimeMacro[] } {
  const used: TimeMacro[] = [];
  const expanded = text.replace(MACRO, (_, macro: TimeMacro) => {
    used.push(macro);
    return replace(macro);
  });
  return { text: expanded, used };
}

/**
 * Replaces string values that are exactly a macro (`"$__from"`) anywhere in JSON, such as a MongoDB
 * pipeline or a Firestore structured query. Other values are copied as they are.
 */
export function replaceTimeTokens(value: unknown, replace: (macro: TimeMacro) => unknown): unknown {
  if (typeof value === 'string') {
    const match = /^\$__(fromMs|toMs|from|to)$/.exec(value);
    return match ? replace(match[1] as TimeMacro) : value;
  }
  if (Array.isArray(value)) return value.map((item) => replaceTimeTokens(item, replace));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceTimeTokens(item, replace)]),
    );
  return value;
}

/** A macro's value for a range: an ISO timestamp in UTC, or epoch milliseconds. */
export function timeMacroValue(macro: TimeMacro, range: ResolvedRange): string | number {
  switch (macro) {
    case 'from':
      return range.from.toISOString();
    case 'to':
      return range.to.toISOString();
    case 'fromMs':
      return range.from.getTime();
    case 'toMs':
      return range.to.getTime();
  }
}

/** `2026-10-24 09:30:00.000`: a UTC timestamp as SQL engines read a string literal. */
export const toSqlTimestamp = (date: Date) => date.toISOString().replace('T', ' ').replace('Z', '');
