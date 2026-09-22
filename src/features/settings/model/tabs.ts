export const settingsTabs = [
  { value: 'general', label: 'General' },
  { value: 'appearance', label: 'Appearance' },
] as const;

export type SettingsTab = (typeof settingsTabs)[number]['value'];

/** Narrows the `?tab=` search param; unknown values fall back to the default tab. */
export function parseSettingsTab(value: unknown): SettingsTab | undefined {
  return settingsTabs.find((t) => t.value === value)?.value;
}
