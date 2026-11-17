import { createFileRoute } from '@tanstack/react-router';
import { CONVEX_CONFIGURED } from '@/app/recordProviders';
import { StoragePage, type UnavailablePlace } from '@/features/storage/StoragePage';

/** Convex is a place only when the build names a deployment; otherwise the page says how to add one. */
const unavailable: UnavailablePlace[] = CONVEX_CONFIGURED
  ? []
  : [
      {
        id: 'convex',
        name: 'Convex',
        message: 'Not configured: set VITE_CONVEX_URL in .env.local and restart the dev server.',
      },
    ];

export const Route = createFileRoute('/storage/')({
  component: () => <StoragePage unavailable={unavailable} />,
});
