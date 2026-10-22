import { RouterProvider } from '@tanstack/react-router';
import { lazy, Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AppCrash } from '@/app/AppCrash';
import { reportError } from '@/lib/sentry/runtime';
import { Providers } from './Providers';
import { createQueryClient } from './queryClient';
import { createAppRouter } from './router';

// `pnpm dev:devtools` only. Both checks are static, so every other build drops the import entirely.
const Devtools =
  import.meta.env.DEV && import.meta.env.MODE === 'devtools'
    ? lazy(() => import('./Devtools').then((m) => ({ default: m.Devtools })))
    : null;

export function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(() => createAppRouter(queryClient));

  return (
    <Providers queryClient={queryClient}>
      <ErrorBoundary
        FallbackComponent={AppCrash}
        onError={(e) => {
          console.error('[app crash]', e);
          reportError(e, { tags: { boundary: 'app_root' } });
        }}
      >
        <RouterProvider router={router} />
      </ErrorBoundary>
      {Devtools && (
        <Suspense fallback={null}>
          <Devtools router={router} />
        </Suspense>
      )}
    </Providers>
  );
}
