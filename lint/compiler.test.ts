import { transformSync } from 'oxc-transform-react';
import { expect, it } from 'vitest';

// Babel 8 once made the React Compiler silently skip every component that destructures a prop with a
// default, so a third of the app ran without memoization. Keep proving the compiler in use handles it.
it('the React Compiler compiles a component with a destructured default', () => {
  const { code } = transformSync(
    'Box.tsx',
    'export function Box({ size = 1 }: { size?: number }) { return <div>{size}</div>; }',
  );
  expect(code).toContain('react/compiler-runtime');
});
