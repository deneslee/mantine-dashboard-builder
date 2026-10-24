import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { formatPluginsFile } from '@/core/build/pluginsFile';
import {
  MAX_WAIT_MS,
  POLL_MS,
  commitBuildList,
  fetchBuildInfo,
  nextBuildList,
  waitForBuild,
} from './githubBuildList';

const TARGET = { repository: 'deneslee/mantine-dashboard-builder', branch: 'main' };
const ORDER = ['azure-sql', 'mongodb', 'aws', 'google'];
const COMMIT = {
  sha: 'c0ffee1234',
  html_url: 'https://github.com/deneslee/mantine-dashboard-builder/commit/c0ffee1234',
};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });
const file = (plugins: string[], sha = 's1') =>
  json({ sha, encoding: 'base64', content: btoa(formatPluginsFile(plugins)) });

/** GitHub answering with `responses` in order, recording each request. */
function fakeGitHub(...responses: Response[]) {
  const fetch = vi.fn(
    async (_url: string, _init?: RequestInit) => responses.shift() ?? json({ message: 'unexpected' }, 500),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

const add = (id: string) => ({
  target: TARGET,
  token: 'github_pat_x',
  change: { id, isAdded: true },
  order: ORDER,
});
const putBody = (fetch: ReturnType<typeof fakeGitHub>, call: number) => {
  const body = JSON.parse(fetch.mock.calls[call]?.[1]?.body as string) as { content: string };
  return { ...body, content: atob(body.content) };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('nextBuildList', () => {
  it('adds and removes in catalog order, keeping ids this build doesn’t know', () => {
    expect(nextBuildList(['google'], { id: 'aws', isAdded: true }, ORDER)).toEqual(['aws', 'google']);
    expect(nextBuildList(['aws', 'google'], { id: 'aws', isAdded: false }, ORDER)).toEqual(['google']);
    expect(nextBuildList(['future', 'aws'], { id: 'google', isAdded: true }, ORDER)).toEqual([
      'aws',
      'google',
      'future',
    ]);
  });
});

describe('commitBuildList', () => {
  it('reads plugins.json, then commits the new list with its sha on the branch', async () => {
    const fetch = fakeGitHub(file(['google'], 'sha1'), json({ commit: COMMIT }));
    await expect(commitBuildList(add('aws'))).resolves.toEqual({
      plugins: ['aws', 'google'],
      commit: { sha: COMMIT.sha, url: COMMIT.html_url },
    });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(
      'https://api.github.com/repos/deneslee/mantine-dashboard-builder/contents/plugins.json?ref=main',
    );
    expect(init?.headers).toMatchObject({ authorization: 'Bearer github_pat_x' });
    expect(fetch.mock.calls[1]?.[1]?.method).toBe('PUT');
    expect(putBody(fetch, 1)).toEqual({
      message: 'build: add aws plugin',
      content: formatPluginsFile(['aws', 'google']),
      sha: 'sha1',
      branch: 'main',
    });
  });

  it('reads again and retries once when the file changed in between', async () => {
    const fetch = fakeGitHub(
      file(['google'], 's1'),
      json({ message: 'plugins.json does not match s1' }, 409),
      file(['mongodb', 'google'], 's2'),
      json({ commit: COMMIT }),
    );
    await expect(commitBuildList(add('aws'))).resolves.toMatchObject({
      plugins: ['mongodb', 'aws', 'google'],
    });
    expect(putBody(fetch, 3)).toMatchObject({
      sha: 's2',
      content: formatPluginsFile(['mongodb', 'aws', 'google']),
    });
  });

  it('gives up on a second refusal with GitHub’s reason, e.g. a protected branch', async () => {
    const refusal = () => json({ message: 'Changes must be made through a pull request.' }, 409);
    fakeGitHub(file([]), refusal(), file([]), refusal());
    await expect(commitBuildList(add('aws'))).rejects.toMatchObject({
      code: 'datasource',
      message: 'GitHub refused the commit: Changes must be made through a pull request.',
    });
  });

  it('commits nothing when the repository already has the list', async () => {
    const fetch = fakeGitHub(file(['aws']));
    await expect(commitBuildList(add('aws'))).resolves.toEqual({ plugins: ['aws'] });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('says what to fix when GitHub refuses the token or can’t find the file', async () => {
    const cases: [Response, object][] = [
      [
        json({ message: 'Bad credentials' }, 401),
        { code: 'forbidden', message: expect.stringContaining('expired') },
      ],
      [
        json({ message: 'Resource not accessible by personal access token' }, 403),
        {
          code: 'forbidden',
          message:
            'GitHub refused: Resource not accessible by personal access token. The token needs Contents: read and write on deneslee/mantine-dashboard-builder.',
        },
      ],
      [
        json({ message: 'API rate limit exceeded' }, 403, { 'x-ratelimit-remaining': '0' }),
        { code: 'datasource', isRetryable: true },
      ],
      [json({ message: 'Not Found' }, 404), { code: 'not_found', isRetryable: false }],
      [json({ sha: 's1', content: btoa('not json') }), { code: 'validation' }],
    ];
    for (const [response, error] of cases) {
      fakeGitHub(response);
      await expect(commitBuildList(add('aws'))).rejects.toMatchObject(error);
    }
  });
});

describe('fetchBuildInfo', () => {
  it('reads the site’s build-info.json past every cache', async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) =>
      json({ plugins: ['aws'], commit: 'c1', builtAt: '2026-10-24T12:00:00Z' }),
    );
    vi.stubGlobal('fetch', fetch);
    await expect(fetchBuildInfo()).resolves.toEqual({
      plugins: ['aws'],
      commit: 'c1',
      builtAt: '2026-10-24T12:00:00Z',
    });
    expect(fetch.mock.calls[0]?.[0]).toMatch(/build-info\.json\?t=\d+$/);
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ cache: 'no-store' });
  });
});

describe('waitForBuild', () => {
  const info = (commit: string | null, plugins: string[]) => ({
    plugins,
    commit,
    builtAt: '2026-10-24T12:00:00Z',
  });

  it('checks every 15 seconds, riding out failed checks, until the commit is live', async () => {
    vi.useFakeTimers();
    const fetchInfo = vi
      .fn<typeof fetchBuildInfo>()
      .mockResolvedValueOnce(info('old', []))
      .mockRejectedValueOnce(new Error('deploying'))
      .mockResolvedValueOnce(info('c1', ['aws']));
    const live = waitForBuild({ commit: 'c1', plugins: ['aws'] }, { fetchInfo });
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);
    await expect(live).resolves.toMatchObject({ commit: 'c1' });
    expect(fetchInfo).toHaveBeenCalledTimes(3);
  });

  it('takes a later build with the same list, and a build without a commit', async () => {
    await expect(
      waitForBuild(
        { commit: 'c1', plugins: ['google', 'aws'] },
        { fetchInfo: async () => info('c2', ['aws', 'google']) },
      ),
    ).resolves.toMatchObject({ commit: 'c2' });
    await expect(
      waitForBuild({ plugins: ['aws'] }, { fetchInfo: async () => info(null, ['aws']) }),
    ).resolves.toMatchObject({
      commit: null,
    });
  });

  it('gives up after 20 minutes, and stops when nobody waits any more', async () => {
    vi.useFakeTimers();
    const old = async () => info('old', []);
    const timedOut = expect(
      waitForBuild({ commit: 'c1', plugins: ['aws'] }, { fetchInfo: old }),
    ).rejects.toMatchObject({
      code: 'timeout',
    });
    await vi.advanceTimersByTimeAsync(MAX_WAIT_MS + POLL_MS);
    await timedOut;

    const controller = new AbortController();
    const stopped = expect(
      waitForBuild({ commit: 'c1', plugins: ['aws'] }, { fetchInfo: old, signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(POLL_MS);
    controller.abort();
    await stopped;
  });
});
