import { MantineProvider } from '@mantine/core';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { cssVariablesResolver, theme } from '@/design-system';

/** Render inside the app theme. Router/query wrappers are added per test where needed. */
export function render(ui: ReactElement, options?: RenderOptions) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} env="test">
      {children}
    </MantineProvider>
  );
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';
