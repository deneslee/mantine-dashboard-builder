import { useQueryClient } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { useState } from 'react';
import { createAppRouter } from '@/app/router';

/**
 * The whole app at a URL: the real routes and loaders on a memory history, inside the Storybook
 * preview's `Providers`. For page stories.
 */
export function AppStory({ url }: { url: string }) {
  const queryClient = useQueryClient();
  const [router] = useState(() =>
    createAppRouter(queryClient, { history: createMemoryHistory({ initialEntries: [url] }), basepath: '/' }),
  );
  return <RouterProvider router={router} />;
}
