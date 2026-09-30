import { transformSync } from '@babel/core';
import { expect, it } from 'vitest';

// With @babel/core 8, babel-plugin-react-compiler 1.0 silently skipped every component that
// destructures a prop with a default, so a third of the app ran without memoization.
it('the React Compiler compiles a component with a destructured default', () => {
  const output = transformSync(
    'export function Box({ size = 1 }: { size?: number }) { return <div>{size}</div>; }',
    {
      filename: 'Box.tsx',
      babelrc: false,
      configFile: false,
      parserOpts: { plugins: ['typescript', 'jsx'] },
      plugins: ['babel-plugin-react-compiler'],
    },
  );
  expect(output?.code).toContain('react/compiler-runtime');
});
