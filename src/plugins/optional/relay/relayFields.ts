import { z } from 'zod';
import type { ConnectionField } from '@/plugins/OptionalPlugin';

/**
 * What Azure SQL and MongoDB connections share: the relay they go through (`relay/`, plan 11 §7).
 * Browsers can't speak those databases' protocols, so the relay does, one request at a time.
 */

const isLoopback = (hostname: string) =>
  hostname === 'localhost' || hostname === '[::1]' || /^127\.\d+\.\d+\.\d+$/.test(hostname);

/** https anywhere; http only for a relay on this machine, since the connection string travels in the request. */
export function isRelayUrl(text: string): boolean {
  const url = URL.parse(text);
  if (!url || url.search || url.hash || url.username || url.password) return false;
  return url.protocol === 'https:' || (url.protocol === 'http:' && isLoopback(url.hostname));
}

export const relayUrlSchema = z
  .string()
  .trim()
  .refine(isRelayUrl, 'Use https://…, or http://localhost:8787 for a relay on this machine.');

/** The relay's `RELAY_TOKEN`; blank reads as none. */
export const relayTokenSchema = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const relayFields: ConnectionField[] = [
  {
    name: 'relayUrl',
    label: 'Relay URL',
    kind: 'url',
    isRequired: true,
    placeholder: 'http://localhost:8787',
    description: '`vp run relay` starts one on this machine. Elsewhere it needs https.',
  },
  {
    name: 'relayToken',
    label: 'Relay token',
    kind: 'secret',
    description: 'The relay’s RELAY_TOKEN. A relay on this machine may have none.',
  },
];
