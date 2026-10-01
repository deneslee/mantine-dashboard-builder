import type { QueryClient } from '@tanstack/react-query';
import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  type RenderHookOptions,
  type RenderOptions,
} from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { Providers } from '@/app/Providers';
import { createQueryClient } from '@/app/queryClient';

/** Pass `queryClient` to seed or spy on it; each render gets a fresh one otherwise. */
type WithQueryClient<T> = T & { queryClient?: QueryClient };

/** The app's providers in Mantine's test env (no transitions). */
function providers(queryClient = createQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Providers queryClient={queryClient} env="test">
        {children}
      </Providers>
    );
  };
}

export function render(ui: ReactElement, { queryClient, ...options }: WithQueryClient<RenderOptions> = {}) {
  return rtlRender(ui, { wrapper: providers(queryClient), ...options });
}

export function renderHook<Result, Props>(
  hook: (props: Props) => Result,
  { queryClient, ...options }: WithQueryClient<RenderHookOptions<Props>> = {},
) {
  return rtlRenderHook(hook, { wrapper: providers(queryClient), ...options });
}

export * from '@testing-library/react';
