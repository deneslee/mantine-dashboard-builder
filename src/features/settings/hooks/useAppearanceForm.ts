import { useMantineColorScheme, type MantineColorScheme } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useShellActions, useSidebar, type BurgerBehavior } from '@/features/shell';
import { useMotionPreference, type MotionPreference } from '@/hooks/useMotion';
import { wait } from '@/utils/wait';

export interface AppearanceValues {
  burger: BurgerBehavior;
  colorScheme: MantineColorScheme;
  motion: MotionPreference;
}

/**
 * Local writes finish instantly, so the button would flash its loading state for a single frame.
 * Holding it this long makes the save readable; a real API call replaces the wait, not the rule.
 */
const MIN_SAVING_MS = 500;

/**
 * Appearance settings as a draft that only takes effect on `save`.
 * The draft holds just the fields the user touched; everything else reads through to the live
 * value, so a theme switched from the navbar meanwhile is not overwritten by a stale copy.
 * Saving is a mutation: `saving` drives the button, the success toast comes from
 * `meta.successMessage` and errors toast from the global MutationCache.
 */
export function useAppearanceForm() {
  const { burger } = useSidebar();
  const { setBurgerBehavior } = useShellActions();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [motion, setMotion] = useMotionPreference();
  const [draft, setDraft] = useState<Partial<AppearanceValues>>({});

  const saved: AppearanceValues = { burger, colorScheme, motion };
  const values: AppearanceValues = { ...saved, ...draft };
  const dirty = (Object.keys(saved) as (keyof AppearanceValues)[]).some((key) => values[key] !== saved[key]);

  const mutation = useMutation({
    mutationFn: async (next: AppearanceValues) => {
      await wait(MIN_SAVING_MS);
      // Each setter persists: the shell store to `shell.v1`, Mantine to its color-scheme key, motion to `motion.v1`.
      setBurgerBehavior(next.burger);
      setColorScheme(next.colorScheme);
      setMotion(next.motion);
    },
    onSuccess: () => setDraft({}),
    meta: { successMessage: 'Settings saved', source: 'Settings' },
  });

  const setField = <K extends keyof AppearanceValues>(key: K, value: AppearanceValues[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return {
    values,
    dirty,
    saving: mutation.isPending,
    setField,
    save: () => mutation.mutate(values),
    reset: () => setDraft({}),
  };
}
