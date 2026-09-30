import { Anchor, Breadcrumbs, Text } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { Page } from '@/ui/components/Page';
import { useBreadcrumbs } from '@/shell/breadcrumbs/useBreadcrumbs';

/**
 * The route trail above a page title, from `staticData.crumb`. Renders nothing on a top-level
 * page, where the only crumb would repeat the title.
 */
export function RouteBreadcrumbs() {
  const crumbs = useBreadcrumbs();
  if (crumbs.length < 2) return null;
  const last = crumbs.length - 1;
  return (
    <Page.Breadcrumbs>
      <Breadcrumbs>
        {crumbs.map((crumb, i) =>
          i === last ? (
            <Text key={crumb.to} span size="sm" aria-current="page">
              {crumb.label}
            </Text>
          ) : (
            // Exact match: the router would otherwise mark a parent crumb active (aria-current) on its children.
            <Anchor
              key={crumb.to}
              size="sm"
              renderRoot={(props) => <Link to={crumb.to} activeOptions={{ exact: true }} {...props} />}
            >
              {crumb.label}
            </Anchor>
          ),
        )}
      </Breadcrumbs>
    </Page.Breadcrumbs>
  );
}
