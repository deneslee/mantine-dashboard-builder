import { z } from 'zod';

/**
 * The shape of catalog.yaml. Plain JavaScript, so it runs with Node alone; the builder can import it
 * later for a features section, and a docs site can use it for its data collection.
 */

export const STATUSES = [
  'fixed',
  'built',
  'decided',
  'default',
  'option',
  'proposed',
  'later',
  'open',
  'reference',
];

const status = z.enum(STATUSES);
const text = z.string().min(1);
const list = z.array(text).default([]);
const tier = z.enum(['core', 'potential']);

const foundation = z.strictObject({
  id: text,
  area: text,
  choice: text,
  notes: text.optional(),
});

const capability = z.strictObject({
  id: text,
  name: text,
  tier,
  group: text,
  status,
  step: text.optional(),
  must: list,
  default: text.optional(),
  options: list,
  adds: text.optional(),
  candidates: list,
  notes: text.optional(),
});

const plugin = z.strictObject({
  id: text,
  name: text,
  tier,
  group: text,
  status,
  step: text.optional(),
  provides: list,
  adds: list,
  runs: text.optional(),
  notes: text.optional(),
});

const pattern = z.strictObject({
  id: text,
  name: text,
  source: text,
  use: text,
  status,
  url: z.url(),
});

export const catalogSchema = z
  .strictObject({
    foundations: z.array(foundation),
    capabilities: z.array(capability),
    plugins: z.array(plugin),
    patterns: z.array(pattern).default([]),
  })
  .superRefine((catalog, ctx) => {
    const seen = new Set();
    for (const kind of ['foundations', 'capabilities', 'plugins', 'patterns']) {
      catalog[kind].forEach((item, index) => {
        if (seen.has(item.id)) {
          ctx.addIssue({ code: 'custom', path: [kind, index, 'id'], message: `Duplicate id "${item.id}"` });
        }
        seen.add(item.id);
      });
    }
    const capabilities = new Set(catalog.capabilities.map((item) => item.id));
    catalog.plugins.forEach((item, index) => {
      item.provides.forEach((id, at) => {
        if (!capabilities.has(id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['plugins', index, 'provides', at],
            message: `"${item.id}" provides "${id}", which isn't a capability in the catalog`,
          });
        }
      });
    });
  });
