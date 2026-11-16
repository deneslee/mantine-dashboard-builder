// The first two calls break the widget data rule; the query client's are fine (lint/rules.test.ts counts them).
import type { QueryClient } from '@tanstack/react-query';
import type { DatasourcePlugin, QueryContext } from '@/plugins/DatasourcePlugin';

export function run(
  datasource: DatasourcePlugin,
  datasources: Record<string, DatasourcePlugin>,
  ctx: QueryContext,
  queryClient: QueryClient,
  context: { queryClient: QueryClient },
) {
  void datasource.query({}, ctx);
  void datasources.mock?.query({}, ctx);
  void queryClient.query({ queryKey: ['x'], queryFn: () => 1 });
  void context.queryClient.query({ queryKey: ['x'], queryFn: () => 1 });
}
