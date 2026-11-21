// Screenshots of /dashboards/perf from two builds, light and dark, plus one image with the first two
// tiles of each side by side. Made screenshots/charts-side-by-side.png on Oct 29: main (Recharts) on
// port 4173 against the ECharts spike on 4174.
//
// Build and preview each commit in its own folder (a clone or `git worktree add`), then:
//   pnpm build; pnpm preview --port 4173      in the folder with main
//   pnpm build; pnpm preview --port 4174      in the folder with the ECharts commit
//   node docs/REVIEW/perf/chart-shots.mjs [--out docs/REVIEW/perf/screenshots]
// --a <url> and --b <url> pick other servers; --a-name/--b-name (file names) and --a-label/--b-label
// (captions) describe them.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const { values: flags } = parseArgs({
  options: {
    a: { type: 'string', default: 'http://localhost:4173/mantine-dashboard-builder' },
    b: { type: 'string', default: 'http://localhost:4174/mantine-dashboard-builder' },
    'a-name': { type: 'string', default: 'recharts' },
    'b-name': { type: 'string', default: 'echarts' },
    'a-label': { type: 'string', default: 'Mantine charts (Recharts, SVG)' },
    'b-label': { type: 'string', default: 'ECharts spike (canvas)' },
    out: { type: 'string', default: 'docs/REVIEW/perf/screenshots' },
  },
});
const sides = [
  { base: flags.a, name: flags['a-name'], label: flags['a-label'] },
  { base: flags.b, name: flags['b-name'], label: flags['b-label'] },
];
mkdirSync(flags.out, { recursive: true });

const browser = await chromium.launch();
const tiles = [];
for (const scheme of ['light', 'dark']) {
  for (const side of sides) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      colorScheme: scheme,
    });
    const page = await context.newPage();
    await page.goto(`${side.base}/dashboards/perf`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.recharts-surface, .echarts-host canvas, [data-chart] canvas');
    await page.waitForTimeout(2500);
    // Hover the middle of the first chart, so both show a tooltip.
    const first = page.locator('.recharts-surface, .echarts-host, [data-chart]').first();
    const box = await first.boundingBox();
    if (box) await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
    await page.waitForTimeout(500);
    const file = join(flags.out, `${side.name}-${scheme}.png`);
    await page.screenshot({ path: file });
    console.log(file);
    // The first two tiles, for the side-by-side image.
    const a = await page.locator('.react-grid-item').nth(0).boundingBox();
    const b = await page.locator('.react-grid-item').nth(1).boundingBox();
    if (a && b) {
      const clip = {
        x: a.x - 8,
        y: a.y - 8,
        width: b.x + b.width - a.x + 16,
        height: Math.max(a.height, b.height) + 16,
      };
      tiles.push({ caption: `${side.label} · ${scheme}`, png: await page.screenshot({ clip }) });
    }
    await context.close();
  }
}

// Two columns (a, b), a row per scheme, each tile pair under its caption.
const page = await browser.newPage({ viewport: { width: 1600, height: 800 }, deviceScaleFactor: 1 });
const figures = tiles
  .map(
    ({ caption, png }) =>
      `<figure><figcaption>${caption}</figcaption><img src="data:image/png;base64,${png.toString('base64')}"></figure>`,
  )
  .join('');
await page.setContent(`<style>
  body { margin: 0; background: #f4f5f7; font: 18px system-ui, sans-serif; color: #1f2328; }
  main { display: inline-grid; grid-template-columns: auto auto; gap: 16px; padding: 8px 16px 16px; }
  figure { margin: 0; } figcaption { margin: 12px 0 8px; } img { display: block; }
</style><main>${figures}</main>`);
const composite = join(flags.out, 'charts-side-by-side.png');
writeFileSync(composite, await page.locator('main').screenshot());
console.log(composite);
await browser.close();
