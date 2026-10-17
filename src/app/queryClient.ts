import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { notify } from '@/lib/notify/notify';
import { ERROR_TITLES, toAppError } from '@/core/errors/AppError';
import { reportError } from '@/lib/sentry/runtime';

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { source?: string; datasource?: string };
    mutationMeta: { successMessage?: string; errorTitle?: string; source?: string };
  }
}

/**
 * Global defaults and one place for error toasts:
 * - initial-load query errors render inline (no toast)
 * - background refetch errors toast, since there is no inline surface for them
 * - mutation errors always toast; success toasts are opt-in via `meta.successMessage`
 * - every failed query and mutation goes to `reportError`, which applies the reporting policy
 */
export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        const e = toAppError(error);
        const { source, datasource } = query.meta ?? {};
        reportError(error, {
          tags: { boundary: 'query', datasource, source },
          fingerprint: datasource ? ['query', datasource, e.code] : ['query', e.code],
        });
        if (query.state.data === undefined) return;
        notify.warning({
          title: 'Showing older data',
          message: e.message,
          source,
          dedupeKey: `refetch:${JSON.stringify(query.queryKey)}`,
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        const e = toAppError(error);
        const source = mutation.meta?.source;
        notify.error({
          title: mutation.meta?.errorTitle ?? ERROR_TITLES[e.code],
          message: e.message,
          source,
        });
        reportError(error, { tags: { boundary: 'mutation', source }, fingerprint: ['mutation', e.code] });
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
