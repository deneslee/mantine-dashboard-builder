import { useLocalStorage } from '@mantine/hooks';
import { storageKey } from './storage';

/** How tightly dashboards pack their widgets: the gap between them and the padding inside. */
export type Density = 'compact' | 'comfortable' | 'spacious';

export const DENSITY_STORAGE_KEY = storageKey('density');
const DENSITIES: readonly Density[] = ['compact', 'comfortable', 'spacious'];

/**
 * The stored density and its setter, a personal setting (dashboards don't store it). Every caller
 * stays in sync; anything unexpected in storage reads as `comfortable`.
 */
export function useDensity() {
  return useLocalStorage<Density>({
    key: DENSITY_STORAGE_KEY,
    defaultValue: 'comfortable',
    getInitialValueInEffect: false,
    serialize: (value) => value,
    deserialize: (value) => DENSITIES.find((density) => density === value) ?? 'comfortable',
  });
}
