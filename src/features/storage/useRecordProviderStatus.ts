import { useQuery } from '@tanstack/react-query';
import { toAppError } from '@/core/errors/AppError';
import type { RecordProviderStatus } from '@/core/records/RecordProvider';
import { loadRecordProvider } from '@/lib/records/activeRecordProvider';
import { usePlaceSetting } from '@/lib/records/placeSetting';
import { usePlugins } from '@/plugins/usePlugins';

export type StatusState = RecordProviderStatus['state'] | 'checking';

/** How each state reads in a badge. */
export const STORAGE_STATUS: Record<StatusState, { label: string; color: string }> = {
  checking: { label: 'Checking…', color: 'neutral' },
  ready: { label: 'Ready', color: 'success' },
  notConfigured: { label: 'Not set up', color: 'warning' },
  unreachable: { label: 'Unreachable', color: 'danger' },
  notDeployed: { label: 'Functions not deployed', color: 'danger' },
  failed: { label: 'Failed', color: 'danger' },
};

export const statusKey = (id: string) => ['recordProviderStatus', id] as const;

/**
 * A place's status: loads its provider and asks it to check itself (one 10 s budget, inside the
 * provider). A provider that cannot be loaded is `failed`. Fresh for 30 s; "Check again" refetches.
 */
export function useRecordProviderStatus(id: string) {
  const { recordProviders } = usePlugins();
  const plugin = recordProviders[id];
  // The saved setting is in the key, so saving a new one checks the place again.
  const setting = usePlaceSetting(id);
  const query = useQuery({
    queryKey: [...statusKey(id), setting],
    queryFn: async ({ signal }): Promise<RecordProviderStatus> => {
      if (plugin?.isConfigured && !plugin.isConfigured())
        return { state: 'notConfigured', message: 'Enter the deployment URL below, test it, then save.' };
      try {
        return await (await loadRecordProvider(id)).checkStatus(signal);
      } catch (error) {
        if (signal.aborted) throw error;
        return { state: 'failed', message: toAppError(error).message };
      }
    },
    staleTime: 30_000,
    retry: false,
    meta: { source: 'Storage' },
  });
  const state: StatusState = query.isFetching ? 'checking' : (query.data?.state ?? 'checking');
  return { state, message: query.data?.message ?? '', check: () => void query.refetch() };
}
