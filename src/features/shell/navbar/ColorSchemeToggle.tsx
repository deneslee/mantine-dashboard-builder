import { ActionIcon, Tooltip, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react';

const order = ['light', 'dark', 'auto'] as const;
const icons = { light: IconSun, dark: IconMoon, auto: IconDeviceDesktop };
const labels = { light: 'Light theme', dark: 'Dark theme', auto: 'System theme' };

/** Cycles light → dark → auto. Mantine persists the choice in localStorage. */
export function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('light');
  const next = order[(order.indexOf(colorScheme) + 1) % order.length] ?? 'light';
  const Icon = icons[colorScheme];

  return (
    <Tooltip label={`${labels[colorScheme]} · switch to ${labels[next].toLowerCase()}`}>
      <ActionIcon
        variant="chrome"
        aria-label={`Theme: ${labels[colorScheme]}. Switch to ${labels[next]}`}
        data-scheme={computed}
        onClick={() => setColorScheme(next)}
      >
        <Icon size={18} stroke={1.75} />
      </ActionIcon>
    </Tooltip>
  );
}
