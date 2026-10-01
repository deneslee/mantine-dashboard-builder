import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dashboardListSchema, dashboardSchema } from '@/core/dashboard/dashboardSchema';

/** The demo data in public/: every listed dashboard has a valid document that matches its summary. */
const dir = 'public/data/dashboards';
const read = (file: string): unknown => JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
const { items } = dashboardListSchema.parse(read('index.json'));

describe('demo dashboards', () => {
  it.each(items.filter((item) => item.id !== 'broken'))(
    '$id.json is valid and matches index.json',
    (item) => {
      const doc = dashboardSchema.parse(read(`${item.id}.json`));
      expect(doc.id).toBe(item.id);
      expect(doc.title).toBe(item.title);
      expect(Object.keys(doc.widgets)).toHaveLength(item.widgetCount);
    },
  );

  it('broken.json fails the schema on purpose', () => {
    expect(dashboardSchema.safeParse(read('broken.json')).success).toBe(false);
  });
});
