import { MantineProvider, localStorageColorSchemeManager } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { cssVariablesResolver, theme, tokens } from '@/design-system';
import { CurrentUserContext, placeholderUser } from '@/shared/user';

const colorSchemeManager = localStorageColorSchemeManager({ key: 'color-scheme' });

/** App-wide providers. The color scheme is applied before paint by the inline script in index.html. */
export function Providers({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return (
    <MantineProvider
      theme={theme}
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
            />
            {children}
          </ModalsProvider>
        </CurrentUserContext>
      </QueryClientProvider>
    </MantineProvider>
  );
}
