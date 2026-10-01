import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { notify } from '@/lib/notify/notify';
import { ERROR_TITLES, toAppError } from '@/core/errors/AppError';

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { source?: string };
    mutationMeta: { successMessage?: string; errorTitle?: string; source?: string };
  }
}

/**
 * Global defaults and one place for error toasts:
 * - initial-load query errors render inline (no toast)
 * - background refetch errors toast, since there is no inline surface for them
 * - mutation errors always toast; success toasts are opt-in via `meta.successMessage`
 */
export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.state.data === undefined) return;
        const e = toAppError(error);
        notify.warning({
          title: 'Showing older data',
          message: e.message,
          source: query.meta?.source,
          dedupeKey: `refetch:${JSON.stringify(query.queryKey)}`,
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        const e = toAppError(error);
        notify.error({
          title: mutation.meta?.errorTitle ?? ERROR_TITLES[e.code],
          message: e.message,
          source: mutation.meta?.source,
        });
      },
      onSuccess: (_data, _vars, _ctx, mutation) => {
        if (mutation.meta?.successMessage) notify.success({ title: mutation.meta.successMessage });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        networkMode: 'offlineFirst',
        retry: (count, error) => count < 1 && toAppError(error).isRetryable,
      },
      mutations: { networkMode: 'offlineFirst' },
    },
  });
}
