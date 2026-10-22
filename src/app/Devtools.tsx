import { TanStackDevtools } from '@tanstack/react-devtools';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import type { createAppRouter } from './router';

/**
 * TanStack Devtools with the Query and Router panels. Only `pnpm dev:devtools` loads this file
 * (see `App`); every other build drops it. Inside `Providers`, so the Query panel finds the client.
 */
export function Devtools({ router }: { router: ReturnType<typeof createAppRouter> }) {
  return (
    <TanStackDevtools
      plugins={[
        { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> },
        { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel router={router} /> },
      ]}
    />
  );
}
