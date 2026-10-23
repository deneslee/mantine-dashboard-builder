import { globSync, readFileSync } from 'node:fs';
import { transformSync } from 'oxc-transform-react';
import { expect, it } from 'vite-plus/test';

// Babel 8 once made the React Compiler silently skip every component that destructures a prop with a
// default, so a third of the app ran without memoization. Keep proving the compiler in use handles it.
it('the React Compiler compiles a component with a destructured default', () => {
  const { code } = transformSync(
    'Box.tsx',
    'export function Box({ size = 1 }: { size?: number }) { return <div>{size}</div>; }',
  );
  expect(code).toContain('react/compiler-runtime');
});

// Every function the compiler skips, and why. A new entry means a component or hook lost memoization:
// make it compile, or add it here with its reason in docs/upgrades/react-compiler.md.
const SKIPPED = [
  // `VirtualBody`: TanStack Virtual, kept in that leaf so the table around it compiles.
  'src/plugins/widgets/table/FrameTable.tsx: Use of incompatible library',
];

it('the React Compiler skips only the functions we expect', () => {
  const skipped = globSync('src/**/*.{ts,tsx}').flatMap((file) =>
    transformSync(file, readFileSync(file, 'utf8'), {
      reactCompiler: { reportDiagnostics: true },
    }).errors.map((error) => `${file.replaceAll('\\', '/')}: ${error.message}`),
  );
  expect(skipped).toEqual(SKIPPED);
});
