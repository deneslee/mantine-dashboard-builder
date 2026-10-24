import { z } from 'zod';
import { buildInfoSchema, type BuildInfo } from '@/core/build/buildInfo';
import { formatPluginsFile, parsePluginsFile } from '@/core/build/pluginsFile';
import { AppError } from '@/core/errors/AppError';
import { wait } from '@/utils/wait';
import type { BuildTarget } from './buildTarget';

/**
 * Add to build on the live site: commits `plugins.json` through GitHub's API with the user's token,
 * then waits for the build that the commit starts. It works with any host that builds on push; the
 * dev server has its own way (devBuildList.ts).
 */

const API = 'https://api.github.com';
const FILE = 'plugins.json';
export const POLL_MS = 15_000;
export const MAX_WAIT_MS = 20 * 60_000;

/** One plugin into the build, or out of it. */
export interface BuildChange {
  id: string;
  isAdded: boolean;
}

/** The list once `change` is made: known ids in catalog order, then any this build doesn't know. */
export function nextBuildList(
  current: readonly string[],
  { id, isAdded }: BuildChange,
  order: readonly string[],
): string[] {
  const wanted = new Set(current);
  if (isAdded) wanted.add(id);
  else wanted.delete(id);
  return [
    ...order.filter((known) => wanted.has(known)),
    ...[...wanted].filter((other) => !order.includes(other)),
  ];
}

const isSameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

const decodeBase64 = (text: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\s/g, '')), (char) => char.charCodeAt(0)));
const encodeBase64 = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));

const contentsSchema = z.object({ sha: z.string(), content: z.string() });
const commitSchema = z.object({ commit: z.object({ sha: z.string(), html_url: z.string() }) });

async function github(
  path: string,
  {
    token,
    method = 'GET',
    body,
    signal,
  }: { token: string; method?: string; body?: unknown; signal?: AbortSignal },
): Promise<Response> {
  try {
    return await fetch(`${API}${path}`, {
      method,
      signal,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AppError('network', 'Could not reach GitHub. Check your connection.', { cause: error });
  }
}

/** A failed GitHub request as an AppError that says what to fix. */
export async function githubError(res: Response, { repository, branch }: BuildTarget): Promise<AppError> {
  const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === 'string' ? body.message : `GitHub answered ${res.status}.`;
  switch (res.status) {
    case 401:
      return new AppError(
        'forbidden',
        'GitHub didn’t accept the token. It may have expired: make a new one.',
        {
          isRetryable: false,
        },
      );
    case 403:
      if (res.headers.get('x-ratelimit-remaining') === '0')
        return new AppError(
          'datasource',
          'GitHub’s rate limit is used up for now. Try again in a few minutes.',
        );
      return new AppError(
        'forbidden',
        `GitHub refused: ${message.replace(/\.?$/, '.')} The token needs Contents: read and write on ${repository}.`,
        { isRetryable: false },
      );
    case 404:
      return new AppError(
        'not_found',
        `GitHub has no ${FILE} in ${repository} on ${branch}, or the token can’t see that repository.`,
        { isRetryable: false },
      );
    case 409:
    case 422:
      return new AppError('datasource', `GitHub refused the commit: ${message}`, { isRetryable: false });
    default:
      return new AppError('datasource', `GitHub: ${message}`);
  }
}

/** The list in the repository's `plugins.json`, and the file's sha to write it back with. */
export async function readRepoBuildList(
  target: BuildTarget,
  token: string,
  signal?: AbortSignal,
): Promise<{ plugins: string[]; sha: string }> {
  const res = await github(
    `/repos/${target.repository}/contents/${FILE}?ref=${encodeURIComponent(target.branch)}`,
    {
      token,
      signal,
    },
  );
  if (!res.ok) throw await githubError(res, target);
  const file = contentsSchema.safeParse(await res.json().catch(() => null));
  if (!file.success)
    throw new AppError('datasource', `GitHub sent ${FILE} in a shape this app doesn’t know.`, {
      isRetryable: false,
    });
  try {
    return { plugins: parsePluginsFile(decodeBase64(file.data.content)), sha: file.data.sha };
  } catch (error) {
    throw new AppError(
      'validation',
      `${FILE} in ${target.repository} isn’t { "plugins": […] }: fix it there first.`,
      {
        cause: error,
        isRetryable: false,
      },
    );
  }
}

/** What a commit did: the new list, and the commit, unless the repository already had that list. */
export interface BuildCommit {
  plugins: string[];
  commit?: { sha: string; url: string };
}

/**
 * Commits `plugins.json` with `change` made. The file is read first, so edits made elsewhere stay;
 * if it changes between the read and the write (409), it's read again, once.
 */
export async function commitBuildList({
  target,
  token,
  change,
  order,
  signal,
}: {
  target: BuildTarget;
  token: string;
  change: BuildChange;
  /** The catalog's ids, so the file keeps its order. */
  order: readonly string[];
  signal?: AbortSignal;
}): Promise<BuildCommit> {
  for (let attempt = 1; ; attempt += 1) {
    const { plugins: current, sha } = await readRepoBuildList(target, token, signal);
    const plugins = nextBuildList(current, change, order);
    // Already so in the repository: a build with it is on its way, or failed.
    if (isSameList(plugins, current)) return { plugins };
    const res = await github(`/repos/${target.repository}/contents/${FILE}`, {
      token,
      signal,
      method: 'PUT',
      body: {
        message: `build: ${change.isAdded ? 'add' : 'remove'} ${change.id} plugin`,
        content: encodeBase64(formatPluginsFile(plugins)),
        sha,
        branch: target.branch,
      },
    });
    if (res.status === 409 && attempt === 1) continue;
    if (!res.ok) throw await githubError(res, target);
    const written = commitSchema.safeParse(await res.json().catch(() => null));
    return {
      plugins,
      commit: written.success
        ? { sha: written.data.commit.sha, url: written.data.commit.html_url }
        : undefined,
    };
  }
}

/** The live site's `build-info.json`, past every cache. */
export async function fetchBuildInfo(signal?: AbortSignal): Promise<BuildInfo> {
  const res = await fetch(`${import.meta.env.BASE_URL}build-info.json?t=${Date.now()}`, {
    cache: 'no-store',
    signal,
  });
  if (!res.ok) throw new AppError('datasource', `build-info.json answered ${res.status}.`);
  return buildInfoSchema.parse(await res.json());
}

/**
 * Resolves once the site serves a build of `commit`, or one with `plugins` (a later commit may have
 * built on it). Checks every 15 seconds for up to 20 minutes; a failed check, as during a deploy,
 * just waits for the next.
 */
export async function waitForBuild(
  { commit, plugins }: { commit?: string; plugins: readonly string[] },
  { signal, fetchInfo = fetchBuildInfo }: { signal?: AbortSignal; fetchInfo?: typeof fetchBuildInfo } = {},
): Promise<BuildInfo> {
  const started = Date.now();
  for (;;) {
    const info = await fetchInfo(signal).catch((error: unknown) => {
      if (signal?.aborted) throw error;
      return undefined;
    });
    if (info && ((commit !== undefined && info.commit === commit) || isSameList(info.plugins, plugins)))
      return info;
    if (Date.now() - started >= MAX_WAIT_MS)
      throw new AppError(
        'timeout',
        'No new build after 20 minutes. Check the deploy in the repository’s Actions tab.',
        { isRetryable: false },
      );
    await wait(POLL_MS, signal);
  }
}
