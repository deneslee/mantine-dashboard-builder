import { RouterProvider } from '@tanstack/react-router';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AppCrash } from '@/features/errors';
import { captureException } from '@/integrations/sentry';
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
          captureException(e, { tags: { boundary: 'app_root' } });
        }}
      >
        <RouterProvider router={router} />
      </ErrorBoundary>
    </Providers>
  );
}
