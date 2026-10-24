import { z } from 'zod';

/**
 * `build-info.json`, which every build emits (plugins.config.ts) next to `index.html`. After Add to
 * build commits a new list, the live site polls it to know when the new build is out.
 */
export const buildInfoSchema = z.object({
  plugins: z.array(z.string()),
  /** The commit it was built from, when CI says (`GITHUB_SHA`). */
  commit: z.string().nullable(),
  builtAt: z.string(),
});

export type BuildInfo = z.infer<typeof buildInfoSchema>;
