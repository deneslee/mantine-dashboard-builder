import { z } from 'zod';
import { storageKey } from '@/lib/storage';

/** Where Add to build on the live site commits `plugins.json`: a GitHub repository and branch. */
export interface BuildTarget {
  /** `owner/name`. */
  repository: string;
  branch: string;
}

export const REPOSITORY = /^[\w.-]+\/[\w.-]+$/;

/** The target last used on this device, for builds that don't know their own (outside GitHub Actions). */
export const BUILD_TARGET_KEY = storageKey('build-repo');

const savedSchema = z.object({
  version: z.literal(1),
  repository: z.string().regex(REPOSITORY),
  branch: z.string().min(1),
});

/** The repository this build came from (CI says), else the one last used here, else none yet. */
export function defaultBuildTarget(
  build: { repository?: string; branch?: string },
  storage: Pick<Storage, 'getItem'> = localStorage,
): BuildTarget {
  if (build.repository) return { repository: build.repository, branch: build.branch ?? 'main' };
  try {
    const saved = savedSchema.safeParse(JSON.parse(storage.getItem(BUILD_TARGET_KEY) ?? 'null'));
    if (saved.success) return { repository: saved.data.repository, branch: saved.data.branch };
  } catch {
    // Unreadable or unavailable storage: start empty.
  }
  return { repository: '', branch: 'main' };
}

export function saveBuildTarget(target: BuildTarget, storage: Pick<Storage, 'setItem'> = localStorage) {
  try {
    storage.setItem(BUILD_TARGET_KEY, JSON.stringify({ version: 1, ...target }));
  } catch {
    // Private mode: it just isn't remembered.
  }
}
