// Performance checks for the shell, the side panel and the charts, against a production build.
// Written Oct 29, 2026 for the restructure review (../restructure-and-stack.md) as four scripts, merged
// into this one with flags on Nov 6. What each check measures is unchanged; README.md lists the details.
//
// From the repo root, in any shell (PowerShell included):
//   pnpm build; pnpm preview            serves http://localhost:4173/mantine-dashboard-builder/
//   node docs/REVIEW/perf/shell-perf.mjs                        interactions, 3 runs, medians
//   node docs/REVIEW/perf/shell-perf.mjs load drag context-bar  other checks (or `all`)
//   --runs 1   --reduced (prefers-reduced-motion)   --out docs/REVIEW/perf/results/my-run.json   --base <url>
//
// Checks:
//   interactions  sidebar, context bar, Inspect panel, Add widget panel and a window resize: per interaction,
//                 for 1.5 s, how often each chart's container resized, React commits, frames and long frames
//   load          page load until 9 charts are drawn, and the long frames in the first 3 s
//   drag          20 pointer steps on the side panel's separator: chart layouts during the drag and after it
//   context-bar   the shell's lock: main's width and the context bar separator, before opening and when
//                 the lock pins main (pinned narrower than before is the 1 px leak)
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const CHECKS = ['interactions', 'load', 'drag', 'context-bar'];
const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    base: { type: 'string', default: 'http://localhost:4173/mantine-dashboard-builder' },
    runs: { type: 'string', default: '3' },
    reduced: { type: 'boolean', default: false },
    out: { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});
const checks = positionals.includes('all') ? CHECKS : positionals.length ? positionals : ['interactions'];
const unknown = checks.filter((check) => !CHECKS.includes(check));
if (flags.help || unknown.length) {
  if (unknown.length) console.error(`Unknown check: ${unknown.join(', ')}`);
  console.log(
    `node docs/REVIEW/perf/shell-perf.mjs [${CHECKS.join(' | ')} | all] [--runs N] [--reduced] [--out file.json] [--base url]`,
  );
  process.exit(unknown.length ? 1 : 0);
}

const RUNS = Number(flags.runs);
const WINDOW_MS = 1500;
const VIEWPORT = { width: 1600, height: 1000 };
// Recharts' containers, or any renderer's root marked with data-chart (the ECharts spike).
const CHARTS = '.recharts-responsive-container, .recharts-wrapper, .echarts-host, [data-chart]';
const DRAWN_CHARTS = '.recharts-surface, .echarts-host canvas, [data-chart] canvas';

/** Runs in the page before the app: long frames, long tasks and, optionally, React commits. */
const initScript = ({ countCommits }) => {
  const perf = { commits: [], loaf: [], longtasks: [] };
  window.__perf = perf;
  // A minimal DevTools hook: production React calls onCommitFiberRoot on every commit.
  if (countCommits)
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      renderers: new Map(),
      inject(renderer) {
        const id = this.renderers.size + 1;
        this.renderers.set(id, renderer);
        return id;
      },
      onCommitFiberRoot() {
        perf.commits.push(performance.now());
      },
      onCommitFiberUnmount() {},
      onPostCommitFiberRoot() {},
      checkDCE() {},
      isDisabled: false,
    };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        perf.loaf.push({
          start: e.startTime,
          duration: e.duration,
          blocking: e.blockingDuration,
          scripts: (e.scripts || []).map((s) => ({
            invoker: s.invoker,
            duration: Math.round(s.duration),
            forced: Math.round(s.forcedStyleAndLayoutDuration || 0),
          })),
        });
    }).observe({ type: 'long-animation-frame', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) perf.longtasks.push({ start: e.startTime, duration: e.duration });
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
};

/** In the page: starts counting chart resizes and frames. */
const arm = (selector) => {
  const perf = window.__perf;
  const charts = [...document.querySelectorAll(selector)].filter(
    (el) => !el.parentElement?.closest('.recharts-responsive-container, [data-chart]'),
  );
  perf.resizes = [];
  perf.frames = [];
  perf.chartCount = charts.length;
  const seen = new WeakSet();
  perf.ro?.disconnect();
  perf.ro = new ResizeObserver((entries) => {
    const t = performance.now();
    for (const e of entries) {
      if (!seen.has(e.target)) {
        seen.add(e.target); // the first callback is observe() itself
        continue;
      }
      perf.resizes.push({ t, w: Math.round(e.contentRect.width), i: charts.indexOf(e.target) });
    }
  });
  charts.forEach((el) => perf.ro.observe(el));
  perf.running = true;
  const tick = (t) => {
    perf.frames.push(t);
    if (perf.running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  perf.t0 = performance.now();
};

/** In the page: stops counting and sums up since arm(). */
const collect = () => {
  const perf = window.__perf;
  perf.running = false;
  const t0 = perf.t0;
  const rel = (t) => Math.round(t - t0);
  const frames = perf.frames.filter((t) => t >= t0);
  const gaps = frames.slice(1).map((t, i) => t - frames[i]);
  const perChart = {};
  for (const r of perf.resizes) perChart[r.i] = (perChart[r.i] || 0) + 1;
  const loaf = perf.loaf.filter((e) => e.start >= t0 - 5);
  return {
    charts: perf.chartCount,
    chartResizes: perf.resizes.length,
    chartsResized: Object.keys(perChart).length,
    maxResizesPerChart: Math.max(0, ...Object.values(perChart)),
    firstResizeMs: perf.resizes.length ? rel(perf.resizes[0].t) : null,
    lastResizeMs: perf.resizes.length ? rel(perf.resizes.at(-1).t) : null,
    resizesBefore200ms: perf.resizes.filter((r) => r.t - t0 < 200).length,
    commits: perf.commits.filter((t) => t >= t0).length,
    commitsBefore200ms: perf.commits.filter((t) => t >= t0 && t - t0 < 200).length,
    frames: frames.length,
    framesOver20ms: gaps.filter((g) => g > 20).length,
    longestFrameMs: Math.round(Math.max(0, ...gaps)),
    loafCount: loaf.length,
    loafTotalMs: Math.round(loaf.reduce((s, e) => s + e.duration, 0)),
    loafMaxMs: Math.round(Math.max(0, ...loaf.map((e) => e.duration))),
    loafMaxBlockingMs: Math.round(Math.max(0, ...loaf.map((e) => e.blocking))),
    loafStarts: loaf.map((e) => `${rel(e.start)}+${Math.round(e.duration)}`).join(' '),
    longTasks: perf.longtasks
      .filter((e) => e.start >= t0 - 5)
      .map((e) => Math.round(e.duration))
      .join(' '),
  };
};

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function newPage(browser, { countCommits = true } = {}) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    reducedMotion: flags.reduced ? 'reduce' : 'no-preference',
  });
  await context.addInitScript(initScript, { countCommits });
  return { context, page: await context.newPage() };
}

async function openPerf(page, search = '') {
  await page.goto(`${flags.base}/dashboards/perf${search}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.recharts-wrapper, .echarts-host canvas, [data-chart] canvas', {
    timeout: 15000,
  });
  await page.waitForTimeout(2500); // the tiles near the viewport mount and draw
}

async function measure(page, label, action) {
  await page.waitForTimeout(800);
  await page.evaluate(arm, CHARTS);
  await action();
  await page.waitForTimeout(WINDOW_MS);
  return { label, ...(await page.evaluate(collect)) };
}

async function checkInteractions(browser) {
  const runs = [];
  for (let run = 0; run < RUNS; run++) {
    const { context, page } = await newPage(browser);
    await openPerf(page);
    runs.push(
      await measure(page, 'sidebar expanded → compact (Ctrl+B)', () => page.keyboard.press('Control+b')),
    );
    runs.push(
      await measure(page, 'sidebar compact → expanded (Ctrl+B)', () => page.keyboard.press('Control+b')),
    );
    runs.push(await measure(page, 'context bar open (Ctrl+.)', () => page.keyboard.press('Control+.')));
    runs.push(await measure(page, 'context bar close (Ctrl+.)', () => page.keyboard.press('Control+.')));

    // Inspect: the widget menu's Inspect item opens the side panel through the URL.
    await page.getByRole('button', { name: 'Actions for Series 1', exact: true }).click();
    const inspect = page.getByRole('menuitem', { name: 'Inspect' });
    await inspect.waitFor();
    runs.push(await measure(page, 'Inspect panel open', () => inspect.click()));
    runs.push(
      await measure(page, 'Inspect panel close (Escape)', async () => {
        await page
          .locator('[role="region"][aria-label="Inspect"]')
          .focus()
          .catch(() => {});
        await page.keyboard.press('Escape');
      }),
    );

    // Edit mode: Add widget opens the palette in the same side panel.
    await openPerf(page, '?mode=edit');
    const add = page.getByRole('button', { name: /add widget/i }).first();
    if (await add.count()) runs.push(await measure(page, 'edit: Add widget panel open', () => add.click()));
    runs.push(
      await measure(page, 'window resize 1600 → 1400', () =>
        page.setViewportSize({ width: 1400, height: 1000 }),
      ),
    );
    await context.close();
  }

  const byLabel = Map.groupBy(runs, (r) => r.label);
  const medians = [...byLabel].map(([label, rs]) => {
    const pick = (key) => median(rs.map((r) => r[key] ?? 0));
    return {
      label,
      charts: pick('charts'),
      chartResizes: pick('chartResizes'),
      maxPerChart: pick('maxResizesPerChart'),
      firstResize: pick('firstResizeMs'),
      lastResize: pick('lastResizeMs'),
      commits: pick('commits'),
      longestFrame: pick('longestFrameMs'),
      loafCount: pick('loafCount'),
      loafTotal: pick('loafTotalMs'),
    };
  });
  console.log('\ninteractions (medians; times in ms from the key press or click)');
  console.table(medians);
  return { medians, runs };
}

async function checkLoad(browser) {
  const runs = [];
  for (let run = 0; run < RUNS; run++) {
    const { context, page } = await newPage(browser, { countCommits: false });
    const started = Date.now();
    await page.goto(`${flags.base}/dashboards/perf`);
    await page.waitForFunction((selector) => document.querySelectorAll(selector).length >= 9, DRAWN_CHARTS, {
      timeout: 20000,
    });
    const drawnMs = Date.now() - started;
    await page.waitForTimeout(3000);
    const loaf = await page.evaluate(() => window.__perf.loaf.map((e) => e.duration));
    runs.push({
      drawnMs,
      loafCount: loaf.length,
      loafTotalMs: Math.round(loaf.reduce((a, b) => a + b, 0)),
      loafMaxMs: Math.round(Math.max(0, ...loaf)),
    });
    await context.close();
  }
  console.log('\nload (until 9 charts are drawn; long frames in the first 3 s)');
  console.table(runs);
  return { runs };
}

async function checkDrag(browser) {
  const { context, page } = await newPage(browser);
  await openPerf(page, '?inspect=chart-1');
  // The side panel's separator is the only one inside main; the shell's are outside it.
  const separators = page.locator('#main [role="separator"]');
  const count = await separators.count();
  if (count !== 1) console.warn(`drag: expected 1 separator inside #main, found ${count}; using the last`);
  const separator = separators.last();
  const runs = [];
  for (let run = 0; run < RUNS; run++) {
    await page.waitForTimeout(800);
    await page.evaluate(arm, CHARTS);
    const box = await separator.boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + Math.min(300, box.height / 2);
    const direction = run % 2 ? 1 : -1; // wider, then narrower: the side panel is on the right
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(x + direction * i * 6, y);
      await page.waitForTimeout(16);
    }
    const duringDrag = await page.evaluate(() => window.__perf.resizes.length);
    await page.mouse.up();
    await page.waitForTimeout(1200);
    const total = await page.evaluate(collect);
    runs.push({
      run,
      charts: total.charts,
      chartResizesDuringDrag: duringDrag,
      chartResizesTotal: total.chartResizes,
      longestFrameMs: total.longestFrameMs,
      loafMaxMs: total.loafMaxMs,
      loafStarts: total.loafStarts,
    });
  }
  await context.close();
  console.log('\ndrag (20 steps of 6 px, 16 ms apart, on the side panel separator)');
  console.table(runs);
  return { separators: count, runs };
}

async function checkContextBar(browser) {
  const { context, page } = await newPage(browser, { countCommits: false });
  await openPerf(page);
  // main's pane is followed by the context bar's separator.
  const before = await page.evaluate(() => {
    const main = document.getElementById('main');
    const separator = main.parentElement.nextElementSibling;
    window.__pin = null;
    new MutationObserver(() => {
      const pin = main.style.getPropertyValue('--shell-main-width');
      if (!window.__pin && pin)
        window.__pin = {
          pinnedWidth: parseFloat(pin),
          separatorWidth: separator.getBoundingClientRect().width,
          separatorVisibility: getComputedStyle(separator).visibility,
        };
    }).observe(main, { attributes: true, attributeFilter: ['style'] });
    return {
      mainWidth: main.getBoundingClientRect().width,
      separatorWidth: separator.getBoundingClientRect().width,
      separatorVisibility: getComputedStyle(separator).visibility,
    };
  });
  await page.keyboard.press('Control+.');
  await page.waitForTimeout(600);
  const atPin = await page.evaluate(() => window.__pin);
  await context.close();
  const result = {
    before,
    atPin,
    pinnedMinusBefore: atPin ? Math.round((atPin.pinnedWidth - before.mainWidth) * 100) / 100 : null,
  };
  console.log('\ncontext bar (pinnedMinusBefore below 0 is the leak: main was pinned narrower than it was)');
  console.log(JSON.stringify(result, null, 2));
  // useMainLock pins main only for a transition; reduced motion has none.
  if (!atPin) console.log('main was not pinned: no transition to wait for (reduced motion?)');
  return result;
}

function git(...args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

const browser = await chromium.launch();
const meta = {
  date: new Date().toISOString(),
  base: flags.base,
  // Every build writes build-info.json next to index.html: when the measured build was made.
  build: await fetch(`${flags.base}/build-info.json`)
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null),
  commit: git('rev-parse', '--short', 'HEAD'),
  isDirty: Boolean(git('status', '--porcelain')),
  browser: `Chromium ${browser.version()}`,
  viewport: VIEWPORT,
  reducedMotion: flags.reduced,
  runs: RUNS,
  checks,
};
console.log(
  `${meta.base} · built ${meta.build?.builtAt ?? '?'} · ${meta.commit}${meta.isDirty ? ' (uncommitted changes)' : ''}` +
    ` · ${meta.browser}${meta.reducedMotion ? ' · reduced motion' : ''}`,
);
const run = {
  interactions: checkInteractions,
  load: checkLoad,
  drag: checkDrag,
  'context-bar': checkContextBar,
};
const results = {};
for (const check of checks) results[check] = await run[check](browser);
await browser.close();

if (flags.out) {
  mkdirSync(dirname(flags.out), { recursive: true });
  writeFileSync(flags.out, `${JSON.stringify({ meta, results }, null, 2)}\n`);
  console.log(`\nEvery run: ${flags.out}`);
} else {
  console.log('\nAdd --out <file.json> to keep every run.');
}
