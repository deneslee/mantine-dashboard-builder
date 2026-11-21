import { AppError } from '@/core/errors/AppError';
import type { RecordProviderPlugin } from '@/plugins/RecordProviderPlugin';
import { CONVEX_CAPABILITIES } from './convexCapabilities';

/** Why a deployment URL is not acceptable, or null. */
export function validateConvexUrl(value: string): string | null {
  if (!value.trim()) return 'Enter the deployment URL, e.g. https://happy-animal-123.convex.cloud.';
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? null : 'Start the URL with https://.';
  } catch {
    return 'This is not a URL. Copy it from the Convex dashboard, e.g. https://happy-animal-123.convex.cloud.';
  }
}

/** A client for `url`, its code loaded on first use, with the provider around it. */
async function open(url: string) {
  const [{ ConvexClient }, { createConvexProvider }] = await Promise.all([
    import('convex/browser'),
    import('./convexProvider'),
  ]);
  const client = new ConvexClient(url);
  return { client, provider: createConvexProvider({ client, url }) };
}

/**
 * The Convex provider as the app lists it. `getUrl` says which deployment to use (saved by the user, or
 * the build's default); Convex's code loads only when the provider is first used or tested.
 */
export function createConvexRecordProviderPlugin(getUrl: () => string): RecordProviderPlugin {
  return {
    id: 'convex',
    name: 'Convex',
    description: 'Shared across browsers and devices.',
    note: 'No sign-in yet: anyone with the deployment URL can read and write.',
    capabilities: CONVEX_CAPABILITIES,
    isConfigured: () => getUrl() !== '',
    setup: {
      label: 'Deployment URL',
      description: 'From the Convex dashboard, or the output of `npx convex dev`. Not secret.',
      placeholder: 'https://happy-animal-123.convex.cloud',
      validate: validateConvexUrl,
      async test(value, signal) {
        const url = value.trim();
        const { client, provider } = await open(url);
        try {
          const status = await provider.checkStatus(signal);
          if (status.state !== 'ready') throw new AppError('unknown', status.message);
          return status.message;
        } finally {
          void client.close();
        }
      },
    },
    async load() {
      const url = getUrl();
      if (!url) throw new AppError('validation', 'Add the Convex deployment URL first.');
      return (await open(url)).provider;
    },
  };
}
