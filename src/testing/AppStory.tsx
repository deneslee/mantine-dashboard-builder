import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { useState } from 'react';
import { createQueryClient } from '@/app/queryClient';
import { createAppRouter } from '@/app/router';

/** The whole app at a URL: the real routes, loaders and plugins on a memory history. For page stories. */
export function AppStory({ url }: { url: string }) {
  const [app] = useState(() => {
    const queryClient = createQueryClient();
    const history = createMemoryHistory({ initialEntries: [url] });
    return { queryClient, router: createAppRouter(queryClient, { history, basepath: '/' }) };
  });
  return (
    <QueryClientProvider client={app.queryClient}>
      <RouterProvider router={app.router} />
    </QueryClientProvider>
  );
}
