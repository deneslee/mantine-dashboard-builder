import type { RecordProviderPlugin } from '@/plugins/RecordProviderPlugin';
import { CONVEX_CAPABILITIES } from './convexCapabilities';

/** The Convex provider as the app lists it; Convex's code loads only when the provider is first used. */
export function createConvexRecordProviderPlugin(url: string): RecordProviderPlugin {
  return {
    id: 'convex',
    name: 'Convex',
    description: 'Shared across browsers and devices.',
    note: 'No sign-in yet: anyone with the deployment URL can read and write.',
    capabilities: CONVEX_CAPABILITIES,
    async load() {
      const [{ ConvexClient }, { createConvexProvider }] = await Promise.all([
        import('convex/browser'),
        import('./convexProvider'),
      ]);
      return createConvexProvider({ client: new ConvexClient(url), url });
    },
  };
}
