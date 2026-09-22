import { useMantineColorScheme, type MantineColorScheme } from '@mantine/core';
import { useState } from 'react';
import { notify } from '@/features/notifications';
import { useShellActions, useSidebar, type BurgerBehavior } from '@/features/shell';

export interface AppearanceValues {
  burger: BurgerBehavior;
  colorScheme: MantineColorScheme;
}

/**
 * Appearance settings as a draft that only takes effect on `save`.
 * The draft holds just the fields the user touched; everything else reads through to the live
 * value, so a theme switched from the navbar meanwhile is not overwritten by a stale copy.
 */
export function useAppearanceForm() {
  const { burger } = useSidebar();
  const { setBurgerBehavior } = useShellActions();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [draft, setDraft] = useState<Partial<AppearanceValues>>({});

  const saved: AppearanceValues = { burger, colorScheme };
  const values: AppearanceValues = { ...saved, ...draft };
  const dirty = values.burger !== saved.burger || values.colorScheme !== saved.colorScheme;

  const setField = <K extends keyof AppearanceValues>(key: K, value: AppearanceValues[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = () => {
    // Both setters persist: the shell store to `shell.v1`, Mantine to its color-scheme key.
    setBurgerBehavior(values.burger);
    setColorScheme(values.colorScheme);
    setDraft({});
    notify.success({ title: 'Settings saved', dedupeKey: 'settings:appearance' });
  };

  const reset = () => setDraft({});

  return { values, dirty, setField, save, reset };
}
