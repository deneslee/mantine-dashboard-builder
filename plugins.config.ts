import { readFileSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { basename, resolve } from 'node:path';
import type { Plugin } from 'vite-plus';
import { formatPluginsFile, parsePluginsFile } from './src/core/build/pluginsFile';

/**
 * Optional plugins: datasource plugins that are in the build only when `plugins.json` lists them.
 * The Data sources page edits that file, through the dev server or a GitHub commit from the live
 * site, so the next build has exactly what was chosen. Plan: .agents/planning/plans/11-optional-plugins.md.
 */

/** An optional plugin the app knows. */
export interface OptionalPluginEntry {
  name: string;
  /** One line for the Add to build list. */
  description: string;
  /** The module that defines it, from the repo root. It exports the plugin under the file's name. */
  module: string;
}

/**
 * Every optional plugin, in the order the Data sources page lists them. Their names and
 * descriptions are in every build, so Add to build can offer them; their code is only in builds
 * whose `plugins.json` lists them.
 */
export const OPTIONAL_PLUGINS: Record<string, OptionalPluginEntry> = {
  google: {
    name: 'Google Cloud',
    description: 'BigQuery and Firestore, called straight from the browser.',
    module: 'src/plugins/optional/google/googlePlugin.ts',
  },
};

export const VIRTUAL_ID = 'virtual:optional-plugins';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const DEV_ENDPOINT = '/__plugins';

/** The ids in table order, once each. Throws on an id the table doesn't know. */
export function checkPluginIds(ids: readonly string[], table = OPTIONAL_PLUGINS): string[] {
  const unknown = ids.filter((id) => !Object.hasOwn(table, id));
  if (unknown.length > 0)
    throw new Error(
      `Unknown optional plugins: ${unknown.join(', ')}. Known: ${Object.keys(table).join(', ') || 'none'}.`,
    );
  return Object.keys(table).filter((id) => ids.includes(id));
}

/** The plugins `plugins.json` lists; a missing file lists none. */
export function readPluginList(path: string, table = OPTIONAL_PLUGINS): string[] {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  let ids: string[];
  try {
    ids = parsePluginsFile(text);
  } catch (error) {
    throw new Error(`${path} must look like { "plugins": ["aws"] }. ${(error as Error).message}`, {
      cause: error,
    });
  }
  return checkPluginIds(ids, table);
}

/**
 * The source of `virtual:optional-plugins`. It imports only the listed plugins, so the others never
 * enter the module graph: their code can't reach `dist`, whatever tree-shaking does.
 */
export function optionalPluginsModule(
  ids: readonly string[],
  {
    root,
    table = OPTIONAL_PLUGINS,
    env = process.env,
  }: { root: string; table?: Record<string, OptionalPluginEntry>; env?: NodeJS.ProcessEnv },
): string {
  const imports = ids.map((id, i) => {
    const file = resolve(root, table[id]!.module).replaceAll('\\', '/');
    return `import { ${basename(file).replace(/\.tsx?$/, '')} as plugin${i} } from ${JSON.stringify(file)};`;
  });
  const catalog = Object.entries(table).map(([id, { name, description }]) => ({
    id,
    name,
    description,
    isInBuild: ids.includes(id),
  }));
  // GitHub Actions says where the build came from, so Add to build on the live site needn't ask.
  const build = {
    catalog,
    repository: env.GITHUB_REPOSITORY || undefined,
    branch: env.GITHUB_REF_NAME || undefined,
  };
  return [
    ...imports,
    `export const optionalPlugins = [${ids.map((_, i) => `plugin${i}`).join(', ')}];`,
    `export const build = ${JSON.stringify(build)};`,
    '',
  ].join('\n');
}

const MAX_BODY = 4096;

/**
 * The dev server's `POST /__plugins`: writes `plugins.json`, and the watcher reloads the page with
 * the new list. Same origin and JSON only, so another site open in the browser can't use it.
 */
export function createWriteHandler(path: string, table = OPTIONAL_PLUGINS) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const reply = (status: number, body: object) => {
      res.statusCode = status;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });
    const origin = req.headers.origin;
    if (!origin || URL.parse(origin)?.host !== req.headers.host)
      return reply(403, { error: 'Only the app itself can change the build.' });
    if (!req.headers['content-type']?.startsWith('application/json'))
      return reply(415, { error: 'Send JSON.' });
    let body = '';
    for await (const chunk of req) {
      body += String(chunk);
      if (body.length > MAX_BODY) return reply(413, { error: 'Too large.' });
    }
    let ids: string[];
    try {
      ids = checkPluginIds(parsePluginsFile(body), table);
    } catch (error) {
      return reply(400, { error: (error as Error).message });
    }
    writeFileSync(path, formatPluginsFile(ids));
    return reply(200, { plugins: ids });
  };
}

export interface OptionalPluginsOptions {
  /** A fixed list instead of `plugins.json`: `'all'` for tests and Storybook. */
  plugins?: 'all' | string[];
  table?: Record<string, OptionalPluginEntry>;
  /** From the root; `plugins.json` by default. */
  file?: string;
}

/**
 * Generates `virtual:optional-plugins` from `plugins.json` (or a fixed list), watches the file in
 * the dev server and serves `POST /__plugins` to write it, and emits `build-info.json` for the live
 * site to poll after Add to build.
 */
export function optionalPlugins({
  plugins,
  table = OPTIONAL_PLUGINS,
  file = 'plugins.json',
}: OptionalPluginsOptions = {}): Plugin {
  let root = process.cwd();
  let fixed = plugins;
  const list = () =>
    fixed === 'all'
      ? Object.keys(table)
      : fixed
        ? checkPluginIds(fixed, table)
        : readPluginList(resolve(root, file), table);
  return {
    name: 'app:optional-plugins',
    /** For `.storybook/main.ts`: stories show every plugin, as the tests do. */
    api: {
      includeAll() {
        fixed = 'all';
      },
    },
    configResolved(config) {
      root = config.root;
      list(); // An unknown id fails at startup, not on the first page load.
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      return id === RESOLVED_ID ? optionalPluginsModule(list(), { root, table }) : undefined;
    },
    configureServer(server) {
      if (fixed) return;
      const path = resolve(root, file);
      server.watcher.add(path);
      server.watcher.on('change', (changed) => {
        if (resolve(changed) !== path) return;
        for (const environment of Object.values(server.environments)) {
          const module = environment.moduleGraph.getModuleById(RESOLVED_ID);
          if (module) environment.moduleGraph.invalidateModule(module);
        }
        server.ws.send({ type: 'full-reload' });
      });
      const handleWrite = createWriteHandler(path, table);
      server.middlewares.use(DEV_ENDPOINT, (req, res) => void handleWrite(req, res));
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'build-info.json',
        source: JSON.stringify({
          plugins: list(),
          commit: process.env.GITHUB_SHA ?? null,
          builtAt: new Date().toISOString(),
        }),
      });
    },
  };
}
