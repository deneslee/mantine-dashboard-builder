import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dashboardDoc, dashboardListDto } from '@/core/dashboard/dashboardSchema';

/** The demo data in public/: every listed dashboard has a valid document that matches its summary. */
const dir = 'public/data/dashboards';
const read = (file: string): unknown => JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
const { items } = dashboardListDto.parse(read('index.json'));

describe('demo dashboards', () => {
  it.each(items.filter((item) => item.id !== 'broken'))(
    '$id.json is valid and matches index.json',
    (item) => {
      const doc = dashboardDoc.parse(read(`${item.id}.json`));
      expect(doc.id).toBe(item.id);
      expect(doc.title).toBe(item.title);
      expect(Object.keys(doc.widgets)).toHaveLength(item.widget_count);
    },
  );

  it('broken.json fails the schema on purpose', () => {
    expect(dashboardDoc.safeParse(read('broken.json')).success).toBe(false);
  });
});
