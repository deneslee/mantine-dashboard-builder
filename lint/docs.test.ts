import { existsSync, globSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { expect, it } from 'vitest';

// Docs and plans move often; a moved file must not leave a dead link behind.
const DOCS = ['*.md', 'docs/**/*.md', '.agents/planning/**/*.md', 'src/**/*.md', 'lint/**/*.md'];
const LINK = /\]\(([^)\s]+)\)/g;

it('every relative link in the markdown docs points at an existing file', () => {
  const files = globSync(DOCS);
  const broken = files.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(LINK)]
      .map(([, link]) => link!.split('#')[0]!)
      .filter((target) => target && !/^(https?:|mailto:|\/)/.test(target))
      .filter((target) => !existsSync(join(dirname(file), decodeURI(target))))
      .map((target) => `${file} → ${target}`),
  );
  expect(files.length).toBeGreaterThan(10);
  expect(broken).toEqual([]);
});
