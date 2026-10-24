import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { build, type Rolldown } from 'vite-plus';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import {
  OPTIONAL_PLUGINS,
  checkPluginIds,
  createWriteHandler,
  optionalPlugins,
  optionalPluginsModule,
  readPluginList,
} from './plugins.config';

/** Two fixture plugins, each with a lazy runtime that holds a marker string. */
const TABLE = {
  alpha: { name: 'Alpha', description: 'The first.', module: 'plugins/alpha/alphaPlugin.ts' },
  beta: { name: 'Beta', description: 'The second.', module: 'plugins/beta/betaPlugin.ts' },
};

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'optional-plugins-'));
  for (const id of ['alpha', 'beta']) {
    mkdirSync(join(root, 'plugins', id), { recursive: true });
    writeFileSync(
      join(root, 'plugins', id, `${id}Plugin.ts`),
      `export const ${id}Plugin = { id: '${id}', types: [{ type: '${id}-type', load: () => import('./${id}Runtime') }] };\n`,
    );
    writeFileSync(
      join(root, 'plugins', id, `${id}Runtime.ts`),
      `export const marker = 'RUNTIME_OF_${id.toUpperCase()}';\n`,
    );
  }
  writeFileSync(
    join(root, 'main.ts'),
    `import { optionalPlugins, build } from 'virtual:optional-plugins';\n` +
      `console.log(build, optionalPlugins.map((p) => p.types.map((t) => t.load())));\n`,
  );
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('the plugin list', () => {
  it('keeps table order, drops repeats and rejects unknown ids', () => {
    expect(checkPluginIds(['beta', 'alpha', 'beta'], TABLE)).toEqual(['alpha', 'beta']);
    expect(() => checkPluginIds(['gamma'], TABLE)).toThrow(
      'Unknown optional plugins: gamma. Known: alpha, beta.',
    );
  });

  it('reads plugins.json, and a missing file lists none', () => {
    const file = join(root, 'list.json');
    expect(readPluginList(file, TABLE)).toEqual([]);
    writeFileSync(file, '{ "plugins": ["beta"] }');
    expect(readPluginList(file, TABLE)).toEqual(['beta']);
    writeFileSync(file, '["beta"]');
    expect(() => readPluginList(file, TABLE)).toThrow('must look like { "plugins": ["aws"] }');
  });

  it('ships with every known plugin listed in the table, and none chosen', () => {
    expect(readPluginList('plugins.json')).toEqual([]);
    for (const entry of Object.values(OPTIONAL_PLUGINS))
      expect(entry.module).toMatch(/^src\/plugins\/optional\//);
  });
});

describe('virtual:optional-plugins', () => {
  it('imports only the listed plugins and names every one in the catalog', () => {
    const code = optionalPluginsModule(['beta'], { root: '/repo', table: TABLE, env: {} });
    expect(code).toContain('import { betaPlugin as plugin0 } from "/repo/plugins/beta/betaPlugin.ts";');
    expect(code).not.toContain('alphaPlugin');
    expect(code).toContain('export const optionalPlugins = [plugin0];');
    expect(code).toContain(
      '"catalog":[{"id":"alpha","name":"Alpha","description":"The first.","isInBuild":false},' +
        '{"id":"beta","name":"Beta","description":"The second.","isInBuild":true}]',
    );
  });

  it('says where the build came from when CI does', () => {
    const code = optionalPluginsModule([], {
      root: '/repo',
      table: TABLE,
      env: { GITHUB_REPOSITORY: 'deneslee/mantine-dashboard-builder', GITHUB_REF_NAME: 'main' },
    });
    expect(code).toContain('"repository":"deneslee/mantine-dashboard-builder","branch":"main"');
  });
});

describe('a build', () => {
  const bundle = async (plugins: string[]) => {
    writeFileSync(join(root, 'plugins.json'), JSON.stringify({ plugins }));
    const result = (await build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [optionalPlugins({ table: TABLE })],
      build: { write: false, rolldownOptions: { input: join(root, 'main.ts') } },
    })) as Rolldown.RolldownOutput;
    return result.output;
  };
  const chunksWith = (output: Rolldown.RolldownOutput['output'], marker: string) =>
    output.filter((file) => file.type === 'chunk' && file.code.includes(marker));

  it(
    'holds no code of an unlisted plugin, and a listed one only in a lazy chunk',
    { timeout: 30_000 },
    async () => {
      const output = await bundle(['alpha']);
      expect(chunksWith(output, 'RUNTIME_OF_BETA')).toEqual([]);
      expect(output.some((file) => file.type === 'chunk' && file.code.includes('beta-type'))).toBe(false);
      const [alpha] = chunksWith(output, 'RUNTIME_OF_ALPHA');
      expect(alpha).toMatchObject({ isEntry: false, isDynamicEntry: true });
      const info = output.find((file) => file.fileName === 'build-info.json');
      expect(info?.type === 'asset' && JSON.parse(String(info.source))).toMatchObject({ plugins: ['alpha'] });
    },
  );

  it('holds neither with an empty list', { timeout: 30_000 }, async () => {
    const output = await bundle([]);
    expect(chunksWith(output, 'RUNTIME_OF_')).toEqual([]);
  });
});

describe('POST /__plugins', () => {
  const request = (body: string, headers: Record<string, string>, method = 'POST') =>
    Object.assign(Readable.from([body]), { method, headers }) as unknown as IncomingMessage;
  const response = () => {
    const res = { statusCode: 0, body: '', setHeader: () => res, end: (text: string) => (res.body = text) };
    return res;
  };
  const same = {
    origin: 'http://localhost:5173',
    host: 'localhost:5173',
    'content-type': 'application/json',
  };

  it('writes plugins.json as Oxfmt formats it', async () => {
    const file = join(root, 'written.json');
    const res = response();
    await createWriteHandler(file, TABLE)(
      request('{"plugins":["beta","alpha"]}', same),
      res as unknown as ServerResponse,
    );
    expect(res.statusCode).toBe(200);
    expect(readFileSync(file, 'utf8')).toBe('{\n  "plugins": ["alpha", "beta"]\n}\n');
  });

  it.each([
    ['another origin', { ...same, origin: 'https://evil.example' }, '{"plugins":[]}', 403],
    ['no origin', { host: same.host, 'content-type': 'application/json' }, '{"plugins":[]}', 403],
    ['not JSON', { ...same, 'content-type': 'text/plain' }, '{"plugins":[]}', 415],
    ['an unknown plugin', same, '{"plugins":["gamma"]}', 400],
    ['a body too large', same, `{"plugins":[${'"alpha",'.repeat(600)}"alpha"]}`, 413],
  ])('refuses %s', async (_, headers, body, status) => {
    const file = join(root, 'refused.json');
    const res = response();
    await createWriteHandler(file, TABLE)(
      request(body, headers as Record<string, string>),
      res as unknown as ServerResponse,
    );
    expect(res.statusCode).toBe(status);
    expect(() => readFileSync(file)).toThrow();
  });
});
