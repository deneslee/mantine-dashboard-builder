# Perf checks and spikes

Nov 6, 2026 · Branch `review/perf-spikes` · The evidence behind [restructure-and-stack.md](../restructure-and-stack.md)

What's here, in plain words: the scripts that measured why the dashboard stutters when a panel opens, three experiments (spikes) that fix it in different ways, and what they measured. The scripts drive a real browser through the dashboard and count how often each chart has to lay itself out again, and how long the page freezes (long frames, over 50 ms). Nothing on this branch is meant to be merged as it is: the spikes are for trying and comparing, and what gets built is decided in the review.

## In short

- **main:** opening or closing the Inspect or Add widget panel lays every chart out about 6 times while the panel slides (50–54 layouts, 0.35–0.5 s of long frames). Opening the context bar lays each chart out twice. Dragging the panel's edge lays the charts out on every pointer step.
- **Quick fixes** (two CSS lines): each chart once, about 0.1 s of long frames; the panel no longer slides.
- **+ react-resizable-panels:** the slide is back, and each chart still lays out once, after it. A drag lays nothing out until release.
- **+ ECharts:** the same layouts cost almost nothing: no long frames in most runs.
- **New on Nov 6:** the grid can lay every chart out twice when the panel's width crosses a grid breakpoint ([below](#found-on-the-re-run)). That's for the grid step of the restructure, not the panel library.

## The branch

One commit per step. Each commit contains the ones before it, so the last one has all three spikes.

| Commit                                                                          | What it changes                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [8eea340](https://github.com/deneslee/mantine-dashboard-builder/commit/8eea340) | The scripts in this folder. The app is `main` as it is                                                                                                                                                                                                                  |
| [d5578f1](https://github.com/deneslee/mantine-dashboard-builder/commit/d5578f1) | Spike 1, the quick fixes: the side panel loses its width animation ([SplitView.module.css](../../../src/ui/components/SplitView/SplitView.module.css)), and the context bar's hidden separator keeps its 1 px ([Shell.module.css](../../../src/shell/Shell.module.css)) |
| [092f03c](https://github.com/deneslee/mantine-dashboard-builder/commit/092f03c) | Spike 2: the dashboard's side panel on react-resizable-panels 4.15.0 ([SidePanelSplit.tsx](../../../src/ui/components/Panels/SidePanelSplit.tsx)): the grid is frozen while the panel slides, then released once                                                        |
| [15290c6](https://github.com/deneslee/mantine-dashboard-builder/commit/15290c6) | Spike 3: the chart widget drawn by ECharts 6.1 on a canvas ([TimeSeriesEChart.tsx](../../../src/plugins/widgets/chart/TimeSeriesEChart.tsx))                                                                                                                            |
| The last commit                                                                 | This README, the results, the screenshots and a copy of the review doc                                                                                                                                                                                                  |

To try a step: `git fetch`, then `git switch --detach d5578f1` (or another commit), `pnpm install` (spikes 2 and 3 each add a package) and `pnpm dev`. `git switch review/perf-spikes` goes back to all three. To try one spike on its own, cherry-pick its commit onto a branch from `main`. All changes against `main`: [compare](https://github.com/deneslee/mantine-dashboard-builder/compare/main...review/perf-spikes).

## Files

| File                                                   | What it is                                                                                                                                                                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [shell-perf.mjs](shell-perf.mjs)                       | The main check. Playwright drives Chromium through `/dashboards/perf`; checks: `interactions` (the tables below), `load`, `drag`, `context-bar`, or `all`                                                                                                        |
| [chart-shots.mjs](chart-shots.mjs)                     | Screenshots of two builds side by side, light and dark                                                                                                                                                                                                           |
| [bundle-sizes.mjs](bundle-sizes.mjs)                   | What each library the review compares adds to a bundle; installs them in a temporary folder, not in the repo                                                                                                                                                     |
| [grid-breakpoint-probe.mjs](grid-breakpoint-probe.mjs) | The one-off probe behind the grid finding                                                                                                                                                                                                                        |
| [results/](results/)                                   | `2026-10-29-*`: the first runs, one spike at a time on `5bd5ced`. `2026-11-06-*`: the re-run on this branch, one file per commit (`main`, `quickfix`, `panels`, `echarts`, and `-reduced` for reduced motion), with the commit, build time and browser in `meta` |
| [screenshots/](screenshots/)                           | [charts-side-by-side.png](screenshots/charts-side-by-side.png) (Recharts and ECharts, light and dark) and the four pages behind it (Nov 6); `panels-inspect-open.png` and `panels-after-drag.png`, spike 2 on Oct 29                                             |

## Results

Nov 6: headless Chromium 153 at 1600 × 1000, a production build of each commit served by `vp preview`, three runs per commit. Each cell is the chart layouts (median, 9 charts on screen) · the long frames in ms (total per interaction, lowest to highest run).

| Interaction                       | main         | Quick fixes | + Panels        | + ECharts     |
| --------------------------------- | ------------ | ----------- | --------------- | ------------- |
| Inspect panel open                | 54 · 345–476 | 9 · 89–180  | 9 · 79–104      | 9–21\* · 0–52 |
| Inspect panel close (Escape)      | 50 · 418–518 | 9 · 69–109  | 9 · 61–72       | 9 · 0         |
| Add widget panel open (edit mode) | 54 · 390–503 | 9 · 79–101  | 9–18\* · 69–174 | 12–21\* · 0   |
| Context bar open (`Ctrl+.`)       | 18 · 176–256 | 9 · 94–138  | 9 · 82–95       | 9 · 0         |
| Context bar close                 | 14 · 131–163 | 9 · 68–89   | 9 · 76–97       | 9 · 0         |
| Sidebar (`Ctrl+B`), either way    | 9 · 92–113   | 9 · 84–109  | 9 · 68–116      | 9 · 0         |
| Window 1600 → 1400 px             | 9 · 72–91    | 9 · 68–104  | 9 · 66–76       | 9 · 0         |

\* The lowest and highest of the three runs: the grid finding below.

- **When the charts lay out:** on main, from about 0.1 s to 0.5 s after the click, up to 6 times each, while the panel slides. With the quick fixes, once, at 0.06–0.13 s, because nothing slides. With the panels spike, once, at 0.24–0.32 s, after the slide.
- **Drag** (20 pointer steps of 6 px on the side panel's edge, Inspect open, 6 charts on screen): on main and with the quick fixes, 114–120 layouts during the drag, each chart on every step, with 7–15 long frames. With the panels spike, none during the drag and 6 after release, with one 54–89 ms frame; with ECharts as well, no long frame.
- **Context bar lock:** on main, `<main>` is pinned at 1338 px while it was 1339: the 1 px leak. From the quick fixes on, it's pinned at its own width.
- **Page load** (until 9 charts are drawn): no clear difference, 1.25–1.63 s and 293–555 ms of long frames in all four.
- **Reduced motion** (main and the last commit): on main every interaction lays each chart out once, as nothing slides, with 63–140 ms of long frames; on the last commit there are none, or one of about 50 ms. One exception: a window resize there laid each chart out twice (18) in all runs, before and after the focus change; not looked into yet.
- **Chart chunk** (from the build): 121.5 kB gzipped for Recharts, 176.2 kB for ECharts.
- **Oct 29** measured each spike on its own; those numbers agree. The panels spike alone still had the context bar's leak (12 layouts), since the quick fixes weren't in it.
- Headless Chromium draws in software, so times on a real GPU differ; the counts don't.

### Found on the re-run

**The grid can lay every chart out twice.** The panels spike now moves focus into the panel when it opens, as SplitView does (its story test checks that). After that change, Add widget and Inspect sometimes laid each chart out two or three times after the slide (18–21) instead of once; the same spike without the focus move had 9 in every run. The [probe](grid-breakpoint-probe.mjs) shows why. Releasing the slide narrows the grid from 1289 to 929 px, which crosses react-grid-layout's `lg` → `md` breakpoint (12 → 8 columns). The charts first take the new width with the old columns (265 px wide), then the `md` layout (423 px) one commit later, because `onBreakpointChange` goes through the dashboard store before the `md` layout renders. When the focus move lands between the two commits, both reach the screen. On main this hides inside the 50+ layouts of the slide. The fix belongs to the grid: work out the breakpoint from the width in the same render.

### Bundle sizes

[bundle-sizes.mjs](bundle-sizes.mjs), Nov 6, the versions of Oct 29. React, React DOM and TanStack Query's core are left out, since the app already has them.

| Library (the exports measured)                                 | Minified (kB) | Gzipped (kB) |
| -------------------------------------------------------------- | ------------- | ------------ |
| react-resizable-panels 4.15 (`Group`, `Panel`, `Separator`)    | 61.2          | 20.9         |
| allotment 1.20                                                 | 33.7          | 10.4         |
| flexlayout-react 0.11                                          | 195.3         | 50.4         |
| dockview-react 8.8                                             | 419.5         | 97.9         |
| motion 14.8: `LazyMotion` + `m`                                | 13.2          | 5.4          |
| motion: `domAnimation` features                                | 76.0          | 27.7         |
| motion: `domMax` features                                      | 125.7         | 42.4         |
| motion: `m`, `domAnimation`, `AnimatePresence`, `MotionConfig` | 89.8          | 32.9         |
| motion: `animate()`                                            | 69.3          | 25.4         |
| motion/mini: `animate()`                                       | 8.3           | 3.3          |
| @tanstack/react-db 1.0.0-rc.1                                  | 283.0         | 84.0         |
| @tanstack/query-db-collection 1.5                              | 64.2          | 21.2         |
| idb-keyval 6.3                                                 | 1.1           | 0.5          |
| dexie 4.4                                                      | 100.3         | 32.8         |

## How to run

On your PC, from the repo root, in PowerShell or any other shell:

1. Once: `pnpm install` and `pnpm exec playwright install chromium`.
2. Build and serve the commit to measure: `pnpm build`, then `pnpm preview`, and leave it running (it serves http://localhost:4173/mantine-dashboard-builder/).
3. In a second terminal: `node docs/REVIEW/perf/shell-perf.mjs all --out docs/REVIEW/perf/results/<date>-<name>.json`.
   - Checks: `interactions` (the default), `load`, `drag`, `context-bar`, or `all`. `--runs 1` for a quick look, `--reduced` for reduced motion, `--base <url>` for another server.
   - It prints a table per check; `--out` also saves every run, with the commit and the build time.
4. Screenshots: two builds served on ports 4173 and 4174 (`pnpm preview --port 4174` in a second clone or worktree), then `node docs/REVIEW/perf/chart-shots.mjs`.
5. Bundle sizes: `node docs/REVIEW/perf/bundle-sizes.mjs` (needs npm and the network for about a minute).

## What changed since Oct 29

- The four Oct 29 scripts (interactions, page load, the drag and the context bar probe) are now [shell-perf.mjs](shell-perf.mjs), with flags in place of environment variables so they run in PowerShell, and results that record the commit, build time and browser. What they measure is the same.
- The labels say "panel"; the Oct 29 files say "pane" and "(SplitView)".
- The spikes changed only to pass `pnpm lint` and the story tests. The panels spike works out its "still closing" state instead of setting state in an effect, and moves focus into the panel and back, as SplitView does. The ECharts spike uses an Effect Event instead of writing a ref during render, a CSS module instead of an inline style, and a `data-chart` attribute instead of the `echarts-host` class.

## Not on the branch

- Three earlier versions of the context bar probe (`ctx-debug*.cjs`), steps towards the `context-bar` check.
- The console output of the Oct 29 runs (`*.txt`): the same runs as the JSON files.
- The bundles the size check built, the panel libraries' packages (downloaded to read their APIs) and server logs.

## Checks

On the last commit, `pnpm lint` and `pnpm format:check` pass. `pnpm test` fails the same tests as `main` (c7c56e1), and no others: `lint/docs.test.ts` (AGENTS.md links two skills that aren't in the repo), `lint/compiler.test.ts` (the React Compiler skips `SplitViewRoot`: "Handle UpdateExpression to variables captured within lambdas"), one test in `Sidebar.test.tsx` and four in `FrameTable.test.tsx`.
