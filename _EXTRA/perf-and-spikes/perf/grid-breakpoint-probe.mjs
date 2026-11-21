// A one-off probe (Nov 6, 2026): why the panels spike sometimes lays every chart out twice after the
// side panel opens. It opens Add widget in edit mode and logs, as they change: the frozen width of the
// grid's container, data-animating, the focused element, the grid's width and the first chart's size.
//
//   pnpm build; pnpm preview        on the panels or ECharts commit (README.md › The branch)
//   node docs/REVIEW/perf/grid-breakpoint-probe.mjs [--base <url>]
//
// What it showed: the grid goes 1289 → 929 px when the slide is released, so react-grid-layout moves
// from the lg breakpoint (12 columns) to md (8). The chart first takes the new width with the old
// columns (265 px), then the md layout (423 px) one commit later, after onBreakpointChange has gone
// through the dashboard store. When the focus move into the panel lands between the two, they reach
// the screen as two layouts.
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const { values: flags } = parseArgs({
  options: { base: { type: 'string', default: 'http://localhost:4173/mantine-dashboard-builder' } },
});
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(`${flags.base}/dashboards/perf?mode=edit`, { waitUntil: 'networkidle' });
await page.waitForSelector('.recharts-wrapper, [data-chart] canvas');
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const log = (window.__log = []);
  const t0 = performance.now();
  const at = () => Math.round(performance.now() - t0);
  const group = document.querySelector('[data-group]');
  const content = document.querySelector('[class*="mainContent"]');
  const grid = document.querySelector('.react-grid-layout');
  const chart = document.querySelector('.recharts-responsive-container, [data-chart]');
  const describe = (el) =>
    !el || el === document.body
      ? 'body'
      : `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 24)}"`;
  new ResizeObserver(([e]) =>
    log.push({ t: at(), chart: `${Math.round(e.contentRect.width)} × ${Math.round(e.contentRect.height)}` }),
  ).observe(chart);
  new ResizeObserver(([e]) => log.push({ t: at(), grid: Math.round(e.contentRect.width) })).observe(grid);
  let frames = 0;
  let last = '';
  const tick = () => {
    const state = {
      animating: group?.hasAttribute('data-animating') ?? '-',
      frozenWidth: content?.style.width || '-',
      focus: describe(document.activeElement),
    };
    if (JSON.stringify(state) !== last) log.push({ t: at(), ...state });
    last = JSON.stringify(state);
    if (++frames < 60) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await page
  .getByRole('button', { name: /add widget/i })
  .first()
  .click();
await page.waitForTimeout(1200);
for (const entry of await page.evaluate(() => window.__log)) console.log(JSON.stringify(entry));
await browser.close();
