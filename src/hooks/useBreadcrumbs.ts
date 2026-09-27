import { useMatches } from '@tanstack/react-router';

export interface Crumb {
  label: string;
  to: string;
}

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    /** Breadcrumb label for this route. A function reads the match's loader data (a dashboard title). */
    crumb?: string | ((loaderData: unknown) => string | undefined);
  }
}

/** One crumb per matched route that declares `staticData.crumb`, root to leaf. */
export function useBreadcrumbs(): Crumb[] {
  return useMatches({
    select: (matches) =>
      matches.flatMap((m) => {
        const { crumb } = m.staticData;
        const label = typeof crumb === 'function' ? crumb(m.loaderData) : crumb;
        return label ? [{ label, to: m.pathname }] : [];
      }),
  });
}
