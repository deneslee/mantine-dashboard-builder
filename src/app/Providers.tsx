import { MantineProvider, localStorageColorSchemeManager } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { cssVariablesResolver, reducedMotionTheme, theme, tokens } from '@/design-system';
import { useMotion } from '@/hooks/useMotion';
import { CurrentUserContext, placeholderUser } from '@/lib/user';

const colorSchemeManager = localStorageColorSchemeManager({ key: 'color-scheme' });

/**
 * App-wide providers. The color scheme is applied before paint by the inline script in index.html.
 * Reduced motion (user setting or OS) sets `data-motion="reduce"` on <html> for CSS transitions and
 * swaps in a theme with Mantine's transitions at 0ms.
 */
export function Providers({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  const { reduced } = useMotion();

  useEffect(() => {
    const html = document.documentElement;
    if (reduced) html.setAttribute('data-motion', 'reduce');
    else html.removeAttribute('data-motion');
  }, [reduced]);

  return (
    <MantineProvider
      theme={reduced ? reducedMotionTheme : theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
      colorSchemeManager={colorSchemeManager}
    >
      <QueryClientProvider client={queryClient}>
        <CurrentUserContext value={placeholderUser}>
          <ModalsProvider>
            <Notifications
              limit={3}
              position="bottom-right"
              zIndex={tokens.zIndex.notification}
              containerWidth={380}
              transitionDuration={reduced ? 0 : undefined}
            />
            {children}
          </ModalsProvider>
        </CurrentUserContext>
      </QueryClientProvider>
    </MantineProvider>
  );
}
