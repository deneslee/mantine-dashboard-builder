import { MantineProvider, localStorageColorSchemeManager, type MantineProviderProps } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { cssVariablesResolver, reducedMotionTheme, theme } from '@/ui/theme/theme';
import { dimensions } from '@/ui/tokens/dimensions';
import { useMotion } from '@/lib/useMotion';
import { CurrentUserContext, placeholderUser } from '@/lib/useCurrentUser';
import { PluginsContext } from '@/plugins/usePlugins';
import { plugins } from './plugins';

const colorSchemeManager = localStorageColorSchemeManager({ key: 'color-scheme' });

/**
 * App-wide providers, the only provider stack: the app, `testing/render` and the Storybook preview
 * all use it. The color scheme is applied before paint by the inline script in index.html.
 * Reduced motion (user setting or OS) sets `data-motion="reduce"` on <html> for CSS transitions and
 * swaps in a theme with Mantine's transitions at 0ms.
 */
export function Providers({
  children,
  queryClient,
  env,
}: {
  children: ReactNode;
  queryClient: QueryClient;
  /** `test` in jsdom tests: no transitions. */
  env?: MantineProviderProps['env'];
}) {
  const { isReduced } = useMotion();

  useEffect(() => {
    const html = document.documentElement;
    if (isReduced) html.setAttribute('data-motion', 'reduce');
    else html.removeAttribute('data-motion');
  }, [isReduced]);

  return (
    <MantineProvider
      theme={isReduced ? reducedMotionTheme : theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
      colorSchemeManager={colorSchemeManager}
      env={env}
    >
      <QueryClientProvider client={queryClient}>
        <CurrentUserContext value={placeholderUser}>
          <PluginsContext value={plugins}>
            <ModalsProvider>
              <Notifications
                limit={3}
                position="bottom-right"
                zIndex={dimensions.zIndex.notification}
                containerWidth={380}
                transitionDuration={isReduced ? 0 : undefined}
              />
              {children}
            </ModalsProvider>
          </PluginsContext>
        </CurrentUserContext>
      </QueryClientProvider>
    </MantineProvider>
  );
}
