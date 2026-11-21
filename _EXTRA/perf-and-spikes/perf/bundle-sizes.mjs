// What each library the review compares adds to a bundle: the exports the app would use, bundled and
// minified by esbuild, then gzipped. React, React DOM and TanStack Query's core are left out, because
// the app already ships them. These are the versions measured on Oct 29, 2026.
//
//   node docs/REVIEW/perf/bundle-sizes.mjs
//
// It installs the packages into a temporary folder (npm, a minute or so), so the repo stays as it is.
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const VERSIONS = {
  '@tanstack/query-db-collection': '1.5.0',
  '@tanstack/react-db': '1.0.0-rc.1',
  '@tanstack/react-query': '5.105.0',
  allotment: '1.20.6',
  dexie: '4.4.7',
  'dockview-react': '8.8.0',
  esbuild: '0.25.12',
  'flexlayout-react': '0.11.1',
  'idb-keyval': '6.3.0',
  motion: '14.8.0',
  react: '19.3.1',
  'react-dom': '19.3.1',
  'react-resizable-panels': '4.15.1',
};

const ENTRIES = {
  'react-resizable-panels': "export { Group, Panel, Separator } from 'react-resizable-panels';",
  allotment: "export { Allotment } from 'allotment';",
  'flexlayout-react': "export { Layout, Model, Actions } from 'flexlayout-react';",
  'dockview-react': "export { DockviewReact, SplitviewReact } from 'dockview-react';",
  'motion: LazyMotion + m': "export { LazyMotion, m } from 'motion/react';",
  'motion: domAnimation features': "export { domAnimation } from 'motion/react';",
  'motion: domMax features': "export { domMax } from 'motion/react';",
  'motion: m + domAnimation + AnimatePresence':
    "export { LazyMotion, m, domAnimation, AnimatePresence, MotionConfig } from 'motion/react';",
  'motion: animate()': "export { animate } from 'motion';",
  'motion/mini: animate()': "export { animate } from 'motion/mini';",
  '@tanstack/react-db':
    "export { useLiveQuery, createCollection, localOnlyCollectionOptions, eq, gt } from '@tanstack/react-db';",
  '@tanstack/query-db-collection': "export { queryCollectionOptions } from '@tanstack/query-db-collection';",
  'idb-keyval': "export { get, set, del, keys, values, createStore } from 'idb-keyval';",
  dexie: "export { default as Dexie, liveQuery } from 'dexie';",
};

const dir = mkdtempSync(join(tmpdir(), 'bundle-sizes-'));
try {
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ private: true, dependencies: VERSIONS }, null, 2),
  );
  console.log(`Installing ${Object.keys(VERSIONS).length} packages into ${dir} …`);
  execSync('npm install --no-audit --no-fund --loglevel=error', { cwd: dir, stdio: 'inherit' });
  const esbuild = createRequire(join(dir, 'package.json'))('esbuild');

  const rows = [];
  for (const [name, code] of Object.entries(ENTRIES)) {
    const result = await esbuild.build({
      stdin: { contents: code, resolveDir: dir, loader: 'js' },
      bundle: true,
      minify: true,
      format: 'esm',
      platform: 'browser',
      write: false,
      external: ['react', 'react/*', 'react-dom', 'react-dom/*', '@tanstack/query-core'],
      logLevel: 'error',
    });
    const bytes = result.outputFiles[0].contents;
    rows.push({ name, minifiedKB: kb(bytes.length), gzipKB: kb(gzipSync(bytes, { level: 9 }).length) });
  }
  console.table(rows);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

function kb(bytes) {
  return Math.round(bytes / 100) / 10;
}
