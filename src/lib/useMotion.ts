import { useLocalStorage, useReducedMotion } from '@mantine/hooks';
import { storageKey } from './storage';

/** The user's motion setting: follow the operating system, or always reduce. */
export type MotionPreference = 'system' | 'reduce';

export const MOTION_STORAGE_KEY = storageKey('motion');

/**
 * The stored motion setting and its setter. Every caller stays in sync (Mantine's storage hook
 * broadcasts writes). Anything unexpected in storage reads as `system`.
 */
export function useMotionPreference() {
  return useLocalStorage<MotionPreference>({
    key: MOTION_STORAGE_KEY,
    defaultValue: 'system',
    getInitialValueInEffect: false,
    serialize: (value) => value,
    deserialize: (value) => (value === 'reduce' ? 'reduce' : 'system'),
  });
}

/**
 * Whether motion is reduced, by the user setting or by the operating system. Named apart from
 * Mantine's `useReducedMotion`, which only reads the operating system.
 */
export function useMotion() {
  const [preference] = useMotionPreference();
  const isSystemReduced = useReducedMotion(false, { getInitialValueInEffect: false });
  return { isReduced: preference === 'reduce' || isSystemReduced, preference };
}
