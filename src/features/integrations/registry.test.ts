import { describe, expect, it } from 'vitest';
import { getIntegrations } from './registry';

describe('integrations registry', () => {
  it('registers Sentry in integrations catalog with route and features', () => {
    const integrations = getIntegrations();
    const sentry = integrations.find((i) => i.id === 'sentry');
    expect(sentry).toBeDefined();
    expect(sentry?.to).toBe('/integrations/sentry');
    expect(sentry?.features).toContain('Errors');
    expect(sentry?.features).toContain('Logs');
    expect(sentry?.features).toContain('App Metrics');
    expect(sentry?.features).toContain('Session Replay');
    expect(sentry?.features).toContain('Tracing');
  });
});
