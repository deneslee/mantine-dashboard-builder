import type { ComponentType } from 'react';

/** An icon a plugin shows in lists and menus: a Tabler icon or anything with the same props. Light, always loaded. */
export type PluginIcon = ComponentType<{ size?: number | string; stroke?: number }>;
