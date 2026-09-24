import { RouterProvider } from '@tanstack/react-router';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AppCrash } from '@/components/errors/AppCrash';
import { reportError } from '@/lib/sentry/runtime';
import { Providers } from './Providers';
import { createQueryClient } from './queryClient';
import { createAppRouter } from './router';

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
    </Providers>
  );
}
