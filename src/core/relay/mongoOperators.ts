/**
 * Kept apart from relayContract.ts so the MongoDB plugin's manifest, which is in the main bundle,
 * can check pipelines without bringing the relay's routes and schemas with it.
 */

/**
 * Pipeline operators the relay refuses: they write (`$out`, `$merge`) or run JavaScript on the server.
 * The relay only reads; the database user should only be able to read as well.
 */
export const MONGO_DENIED_OPERATORS = ['$out', '$merge', '$function', '$accumulator', '$where'] as const;

/** The first refused operator used anywhere in a pipeline, as a key at any depth. */
export function findDeniedMongoOperator(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findDeniedMongoOperator(item);
      if (found) return found;
    }
    return undefined;
  }
  if (!value || typeof value !== 'object') return undefined;
  for (const [key, item] of Object.entries(value)) {
    if ((MONGO_DENIED_OPERATORS as readonly string[]).includes(key)) return key;
    const found = findDeniedMongoOperator(item);
    if (found) return found;
  }
  return undefined;
}
