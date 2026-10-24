import { z } from 'zod';

/**
 * `plugins.json` at the repo root: the optional plugins in the build. `plugins.config.ts` reads it
 * when building, and the Data sources page writes it (through the dev server, or a GitHub commit).
 */
export const pluginsFileSchema = z.object({
  plugins: z.array(z.string().regex(/^[a-z][a-z0-9-]*$/, 'Plugin ids are lowercase, e.g. azure-sql.')),
});

/** The ids the file lists. Throws when it isn't `{ "plugins": [...] }`. */
export function parsePluginsFile(text: string): string[] {
  return pluginsFileSchema.parse(JSON.parse(text)).plugins;
}

/** The file's text exactly as Oxfmt writes it, so a commit made from the app passes the format check. */
export function formatPluginsFile(ids: readonly string[]): string {
  return `{\n  "plugins": [${ids.map((id) => JSON.stringify(id)).join(', ')}]\n}\n`;
}
