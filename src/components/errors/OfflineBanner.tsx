import { useNetwork } from '@mantine/hooks';
import { IconWifiOff } from '@tabler/icons-react';
import { ErrorState } from './ErrorState';

/** Shown above the content while the browser reports no connection. Queries pause meanwhile. */
export function OfflineBanner() {
  const { online } = useNetwork();
  if (online) return null;
  return (
    <ErrorState.Banner
      icon={IconWifiOff}
      title="You're offline"
      description="Showing cached data. Changes sync when the connection is back."
    />
  );
}
