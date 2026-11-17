import type { RecordProviderPlugin } from '@/plugins/RecordProviderPlugin';
import { CONVEX_CAPABILITIES } from './convexCapabilities';

/** The Convex provider as the app lists it; Convex's code loads only when the provider is first used. */
export function createConvexRecordProviderPlugin(url: string): RecordProviderPlugin {
  return {
    id: 'convex',
    name: 'Convex',
    description: 'Saves records on your Convex deployment, so they are shared across browsers and devices.',
    capabilities: CONVEX_CAPABILITIES,
    async load() {
      const [{ ConvexClient }, { createConvexProvider }] = await Promise.all([
        import('convex/browser'),
        import('./convexProvider'),
      ]);
      return createConvexProvider({ client: new ConvexClient(url) });
    },
  };
}
