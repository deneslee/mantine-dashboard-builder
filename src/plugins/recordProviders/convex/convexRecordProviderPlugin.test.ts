import { describe, expect, it } from 'vite-plus/test';
import { createConvexRecordProviderPlugin, validateConvexUrl } from './convexRecordProviderPlugin';

describe('validateConvexUrl', () => {
  it('accepts a deployment URL', () => {
    expect(validateConvexUrl('https://happy-animal-123.convex.cloud')).toBeNull();
    expect(validateConvexUrl('http://127.0.0.1:3210')).toBeNull();
  });

  it('says what to fix', () => {
    expect(validateConvexUrl('  ')).toMatch(/Enter the deployment URL/);
    expect(validateConvexUrl('not a url')).toMatch(/not a URL/);
    expect(validateConvexUrl('ftp://x.convex.cloud')).toMatch(/https/);
  });
});

describe('createConvexRecordProviderPlugin', () => {
  it('is not configured without a URL, and refuses to load', async () => {
    const plugin = createConvexRecordProviderPlugin(() => '');
    expect(plugin.isConfigured?.()).toBe(false);
    await expect(plugin.load()).rejects.toThrow('Add the Convex deployment URL first.');
  });

  it('is configured once a URL is given', () => {
    expect(createConvexRecordProviderPlugin(() => 'https://x.convex.cloud').isConfigured?.()).toBe(true);
  });
});
