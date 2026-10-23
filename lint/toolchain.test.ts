import { readFileSync } from 'node:fs';
import { expect, it } from 'vite-plus/test';

const manifest = (name: string) =>
  JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8')) as {
    version: string;
    dependencies: Record<string, string>;
  };

// vite-plus bundles Vitest and its own Vite build at exact versions. pnpm-workspace.yaml lets any `vite` and
// `vitest` satisfy peers, so a Renovate update that moves one without the other still installs. Fix a
// failure here with `vp migrate`, which re-pins them to the vite-plus release.
it('Vitest and Vite are the versions vite-plus bundles', () => {
  const vitePlus = manifest('vite-plus');
  expect(manifest('vitest').version).toBe(vitePlus.dependencies.vitest);
  expect(manifest('@vitest/browser-playwright').version).toBe(vitePlus.dependencies.vitest);
  expect(manifest('vite').version).toBe(vitePlus.version);
});
