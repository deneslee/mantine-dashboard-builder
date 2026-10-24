/** JSON with object keys sorted at every depth: equal values give equal text, whatever the key order. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : item,
  );
}
