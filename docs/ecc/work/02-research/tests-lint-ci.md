# 02 research — Test strategy, lint scope and CI shape

Phase 2 research for the architecture review on branch `review`. Inputs are `01-current-state.md` (§1.7, §1.10, G-019, G-020, G-025, G-026, G-032, G-034, G-036), the configs listed below, sampled tests and stories, and primary docs.

Tags: **[F]** observed in this repo · **[S]** external source · **[U]** user requirement · **[R]** recommendation · **[?]** open question. Runtime budgets in §6 are **targets, not measurements**.

---

## 1. Question and scope

**[U] Requirements**

- **U8:** tests are too heavy and partly pointless. Shrink the suite to what is useful.
- **U9:** lint is too much and too strict, doc linting included. It should catch bugs, not style.
- **U7:** keep Vite+: oxlint with a type-aware backend, oxfmt, Vitest 5, and Storybook 10 with the vitest addon.
- **U10:** the order is restructure → tooling → simplification → CI and tests.
- Development happens on Windows. CI is GitHub Actions. The app deploys to GitHub Pages.

**Questions**

1. Inventory and classification of tests, with a keep/cut/merge rule per category.
2. Current guidance on test value for React SPAs.
3. Which oxlint rules catch bugs and which are noise; the cost of type-aware lint; whether the custom rules and layer rules are still worth having; stylelint scope.
4. CI shape: required vs optional checks, caching, gating the deploy, affected-only runs, storybook and convex.
5. Pre-commit.
6. A target, with each part marked by whether it depends on the restructure.

**Files read [F]:** `vitest.config.ts`, `vite.config.ts` (`run`, `lint`, `staged` blocks), `oxlint.config.ts`, `lint/plugin.js`, the 4 `lint/*.test.ts` files, `.stylelintrc.json`, `.github/workflows/{ci,github-pages}.yaml`, `.github/renovate.json5`, `.vite-hooks/pre-commit`, `.storybook/{main,preview}.tsx`, `src/testing/{setup.ts,recordProviderSuite.ts}`, `plugins.config.test.ts`, `convex/records.test.ts`, and about 15 sampled `src` tests and stories. I did not run the suite.

---

## 2. Findings

### 2.1 Repo facts [F]

**Test topology**

- `vitest.config.ts` defines 4 projects:
  - `node`: an explicit 11-glob `NODE_TESTS` list.
  - `dom`: jsdom, for every other `src/**/*.test.{ts,tsx}`.
  - `convex`: edge-runtime.
  - `storybook`: Playwright Chromium, 1600×1000.
- Every project inherits `react({ compiler: true })` and `optionalPlugins({ plugins: 'all' })`. Every test therefore goes through the React Compiler transform, and the plugin module lists every optional plugin.
- `check:unit` runs `--project node --project dom`. `check:stories` and the `convex` project are separate tasks, and CI calls neither (G-025).
- From §1.10: 269 s of test time, of which import is 49 %, environment 30 %, setup 14 % and tests 5 %. 52 jsdom environments are created.

**Environment mismatch**

- A grep heuristic (imports of testing-library, `@/testing/render`, `window`, `document` or `localStorage`) finds about **18 files in the `dom` project that use no DOM**. Examples: `ui/tokens/primitives.test.ts`, `ui/tokens/semantic.test.ts`, `ui/theme/theme.test.ts`, `app/router.test.ts`, `app/queryClient.test.ts`, `features/dashboards/header/formatRange.test.ts`, `features/datasources/buildList/githubBuildList.test.ts` and `plugins/widgets/chart/timeSeries.test.ts`.
- Each of these pays for a jsdom environment because it is not in `NODE_TESTS`. This is the G-019 hazard already happening.

**Test content (sampled)**

- _Behaviour or contract tests._ These test real behaviour through public APIs:
  - `relay/src/app.test.ts`: HTTP-level CORS, token, body limits and secret scrubbing.
  - `src/testing/recordProviderSuite.ts`: a contract suite shared by `browserStorageProvider.test.ts` and `convex/records.test.ts`.
  - `DashboardGrid.test.tsx`: lazy start, query dedupe, error isolation, keyboard shortcuts.
  - `Sidebar.test.tsx`, `Shell.test.tsx`: active states, flyout, persisted widths.
  - `useDensity.test.ts`, `createDashboardStore.test.ts`, `core/time/timeRange.test.ts`.
  - Mocking is rare: `vi.mock` appears in only 4 files (`queryClient`, `router`, `DashboardGrid`, `sentry/runtime`).
- _Change detectors._ These restate constants, so they fail on any intended design change and never on a bug:
  - `ui/tokens/primitives.test.ts`, e.g. `spacingPx.xs === 6` and `primitives.zIndex.navbar === 200`.
  - Most of `ui/tokens/semantic.test.ts` (244 lines, 20 cases). Its generator invariants (the `--app-` prefix, one variable per leaf) are real.
  - `ui/theme/theme.test.ts`: the `defaultProps.radius` of each component theme.
  - `features/integrations/getIntegrations.test.ts`: a list of feature strings.
  - `app/PluginsProvider.test.tsx` (one referential-identity check) is borderline.
- _Implementation-coupled._ `DashboardGrid.test.tsx` counts tile renders by mocking `../state/useEffectiveTime`. That asserts re-render isolation, a performance property, through an internal hook.
- _Tool and infra tests_ (`lint/`):
  - `docs.test.ts` checks markdown links. It is red because docs were archived.
  - `toolchain.test.ts` checks that installed Vitest and Vite match what vite-plus bundles.
  - `compiler.test.ts` has 2 cases. One is a cheap regression case (a destructured default compiles). The other compiles **every** `src` file and asserts a hard-coded skip list (`src/plugins/widgets/table/FrameTable.tsx`).
  - `rules.test.ts` spawns `vp lint --config oxlint.config.ts --no-ignore` 4 times, plus stylelint once, with 20 s timeouts.
  - **`rules.test.ts` lints with `oxlint.config.ts`, not the config CI runs.** `vite.config.ts` merges `oxlint.config.ts` and adds `typeCheck: true`, the `vite-plus/prefer-vite-plus-imports` rule and extra ignores.
- _Stories._ There are 20 story files.
  - 10 have no `play` function.
  - `DashboardPage.stories.tsx` has 27 `play` functions. In effect it is the app's integration suite, running in a real browser.
  - `.storybook/preview.tsx` sets `a11y: { test: 'error' }` with color-contrast disabled. So **every story, play or not, is an a11y gate** when the storybook project runs, but it never runs in CI.
- _Story/test duplication is small._ `DashboardGrid.stories.tsx` has no play, so the RTL test complements it. The clearest overlap is the compact-rail flyout: `Shell.stories.tsx` › `CompactFlyout` (play) and `Sidebar.test.tsx` › "opens a flyout…".
- _G-036._ `plugins.config.test.ts:74` expects `"/repo/plugins/beta/betaPlugin.ts"` from `root: '/repo'`. On Windows the code resolves this to `C:/repo/…`. The test is wrong, not the code.

**Lint**

- Config:
  - `categories: { correctness: 'error' }`.
  - Plugins: `typescript`, `react`, `unicorn`, `oxc`, `import`.
  - `typeAware: true`; `vite.config.ts` adds `typeCheck: true`.
  - About 40 hand-picked rules, `import/no-cycle`, 3 JS-plugin rules, and `layer()` `no-restricted-imports` overrides for 9 folders.
- `pnpm-lock.yaml` resolves `oxlint@1.93.0` with **`oxlint-tsgolint@7.0.2006`** and `vite-plus@1.6.0`. The backend in use is tsgolint, not tsrs.
- **No `tsc` is run.** `typeCheck` inside `vp lint` is the only type checker (`vite.config.ts` comment; `typecheck` is aliased to `check:lint`).
- **The cache key is `cacheInput = [{ auto: true }, …negations]`** for `check:lint`, `check:fmt`, `check:build` and `check:test*`. Auto-tracking records directory listings, so adding a `docs/ecc` folder invalidated the lint cache (§1.10: `'ecc' added in 'docs'`).
- `.stylelintrc.json` extends `stylelint-config-standard` and adds 4 token-policy rules (`color-no-hex`, `function-disallowed-list`, `declaration-property-value-disallowed-list`, `declaration-property-value-allowed-list`). It also has overrides keyed to folder paths (`src/ui/tokens`, `src/ui/theme`, `src/features/integrations`).

**CI and hooks**

- `ci.yaml` has one job: `check:lint`, `check:css`, `check:fmt`, `check:unit`, `check:build`. It uses `voidzero-dev/setup-vp@v1.22.0` with `cache: true`, which is the pnpm store. There is no Vite Task cache step.
- `github-pages.yaml` runs on push to `main` in parallel with CI and is not gated on it. It re-runs `vp check --no-fmt` and `vp build` directly. Those are not `vp run` tasks, so the task cache does not apply.
- `.vite-hooks/pre-commit` is `vp staged || echo …`, and `staged` is `'*': 'vp fmt --no-error-on-unmatched-pattern'`. It formats staged files and never blocks (G-026).
- G-034: `renovate.json5` limits `oxc-transform-react` to `~0.152.0` against the `0.156.0` pin. The version-drift risk that `toolchain.test.ts` guards belongs here, in the Renovate config.

### 2.2 External sources [S]

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | URL                                                                                                                                                                                                    | Confidence                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| S1  | oxlint categories: `correctness` = "code that is definitely wrong or useless" (the default); `suspicious` = "likely to be wrong"; `pedantic` = "extra strict … may have false positives"; `style`, `restriction` and `nursery` are opt-in.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | https://oxc.rs/docs/guide/usage/linter/config.html , https://oxc.rs/docs/guide/usage/linter/cli.html                                                                                                   | High                                                                                |
| S2  | Rule table (fetched 2026-11-21). With type info on, 15 type-aware rules sit in `correctness`, e.g. `no-floating-promises`, `await-thenable`, `unbound-method`, `restrict-template-expressions`, `no-base-to-string`, `no-for-in-array`, `require-array-sort-compare`, `no-misused-spread`. `no-misused-promises`, `switch-exhaustiveness-check`, `only-throw-error` and the `no-unsafe-*` rules are `pedantic`. Category placement of rules this repo turns on: `consistent-type-imports`, `prefer-const` and `prefer-spread` are **style**; `no-var`, `no-explicit-any`, `typescript/no-namespace` and `import/no-cycle` are **restriction**; `ban-ts-comment` and `react/rules-of-hooks` are **pedantic**; `react/exhaustive-deps` is correctness. | https://oxc.rs/docs/guide/usage/linter/rules.html                                                                                                                                                      | High (table at fetch time)                                                          |
| S3  | `suspicious` mixes bug catchers (`react/no-unstable-nested-components`, `no-unmodified-loop-condition`, `preserve-caught-error`) and cleanup rules (`no-unnecessary-type-assertion`) with noise for this stack (`eslint/no-shadow`, `no-underscore-dangle`, `react/react-in-jsx-scope`, `import/no-unassigned-import`, which flags CSS side-effect imports). It does not suit a wholesale switch-on.                                                                                                                                                                                                                                                                                                                                                 | same as S2                                                                                                                                                                                             | High for membership; Medium for the "noise" judgement                               |
| S4  | Type-aware linting runs a separate backend (`tsgolint` or `tsrs`) that builds TS programs. `--debug timings` ranks rules by cost; the doc's example puts `unbound-method` and `no-floating-promises` at about 75 % of rule time. `--type-check` reports TS errors only in files oxlint lints; for the whole project, run `tsc --noEmit`.                                                                                                                                                                                                                                                                                                                                                                                                             | https://oxc.rs/docs/guide/usage/linter/type-aware.html                                                                                                                                                 | High                                                                                |
| S5  | `import/no-cycle` is a **restriction** rule with no depth limit by default (`maxDepth: Infinity`). Options are `ignoreTypes` (default true), `ignoreExternal` and `maxDepth`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | https://oxc.rs/docs/guide/usage/linter/rules/import/no-cycle.html                                                                                                                                      | High                                                                                |
| S6  | Vite+ recommends keeping the lint config in the `vite.config.ts` `lint` block, not in `oxlint.config.ts`. It recommends `typeAware` + `typeCheck`, and now uses **tsrs** (a Rust port of TS 7). For custom-rule tests it ships **`RuleTester` from `vite-plus/lint/plugins-dev`**, and `defineRule`/`definePlugin` from `vite-plus/lint/plugins`.                                                                                                                                                                                                                                                                                                                                                                                                    | https://viteplus.dev/guide/lint                                                                                                                                                                        | High                                                                                |
| S7  | Vite Task caching: tasks are cached by default; auto-tracking records file reads, **missing-file probes and directory listings**; `cache.input` overrides it; a miss prints its reason; the cache lives in `node_modules/.vite/task-cache`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | https://viteplus.dev/guide/cache                                                                                                                                                                       | High                                                                                |
| S8  | Restoring the Vite Task cache across GitHub Actions runs is **experimental**: "measure before caching". Restore it after `setup-vp`, with a rolling key such as `vite-task-${os}-${arch}-${run_id}-${attempt}` and a prefix restore-key. Keep inputs out of the Actions key. Only `vp run` commands use the cache.                                                                                                                                                                                                                                                                                                                                                                                                                                   | https://viteplus.dev/guide/github-actions-cache                                                                                                                                                        | High                                                                                |
| S9  | `setup-vp` with `cache: true` caches the pnpm store, keyed on the lockfile. `cache-save` can be limited to `main`, and `cache-toolchain` caches Node and Vite+. The docs advise exact versions, not the `v1` tag.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | https://github.com/voidzero-dev/setup-vp , https://viteplus.dev/guide/ci                                                                                                                               | High                                                                                |
| S10 | `vp run` supports `-r`, `-t`, pnpm-style `--filter` (including `...pkg` dependents), `dependsOn`, `--dry-run --json`, and `-v` miss reasons. **No git-based "changed since" filter is documented.** Affected-only runs come from per-package cache hits once packages exist.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | https://viteplus.dev/guide/run                                                                                                                                                                         | High that it is documented; **unverified** whether `--filter "[origin/main]"` works |
| S11 | `vp staged` bundles lint-staged 17 and runs the `staged` block. `vp hooks disable` turns hooks off per clone. `VP_GIT_HOOKS=0` skips hook install.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | https://viteplus.dev/guide/commit-hooks                                                                                                                                                                | High                                                                                |
| S12 | Vitest perf: the `Duration` phases are environment, import, transform, setup and tests. jsdom costs "roughly 200–500 ms per import", paid **per file** with the default isolating pool. Levers are `isolate: false` per project, `pool: 'vmThreads'`, `vitest doctor` (measures the alternative configurations), and `experimental.importDurations.print` to find slow imports.                                                                                                                                                                                                                                                                                                                                                                      | https://vitest.dev/guide/improving-performance , https://vitest.dev/guide/profiling-test-performance                                                                                                   | High                                                                                |
| S13 | Browser mode gives "more accurate and reliable" results than jsdom, at the cost of "longer initialization". It is not a replacement for E2E.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | https://vitest.dev/guide/browser/why                                                                                                                                                                   | High                                                                                |
| S14 | The Storybook Vitest addon "transforms your stories into component tests" in a real browser. The a11y addon runs alongside it. A separate Vitest project is recommended for Vitest ≥ 4. The CI recipe is `vitest --project=storybook` in a Playwright container or after `playwright install chromium --with-deps`.                                                                                                                                                                                                                                                                                                                                                                                                                                  | https://storybook.js.org/docs/writing-tests/integrations/vitest-addon , https://storybook.js.org/docs/writing-tests/in-ci                                                                              | High                                                                                |
| S15 | Testing trophy: static analysis, then unit, then **mostly integration**, then a few E2E, sized by return on investment. A "unit" is a unit with no collaborators or with them mocked; an "integration" test exercises several units together.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications                                                                                                                             | High (primary author)                                                               |
| S16 | Testing Library's guiding principle: "the more your tests resemble the way your software is used, the more confidence they can give you." Avoid testing implementation details.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | https://testing-library.com/docs/guiding-principles , https://kentcdodds.com/blog/testing-implementation-details                                                                                       | Medium (not re-fetched; well-known primary pages)                                   |
| S17 | GitHub: a **job skipped by `if` reports Success** and does not block a merge even when required. A **workflow skipped by `paths`/branch filter leaves its required checks Pending**, which blocks the merge.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions , https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax | High                                                                                |
| S18 | `stylelint-config-recommended` "turns on most of the Stylelint rules that help you avoid errors". `stylelint-config-standard` extends it with convention rules.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | https://github.com/stylelint/stylelint-config-recommended , https://github.com/stylelint/stylelint-config-standard                                                                                     | High                                                                                |

---

## 3. Options compared

### 3.1 Test categories

| Category (count)                                                                                           | What it proves                                                                                        | Cost                                           | Rule [R]                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure logic in node (`core`, `utils`, datasource/optional runtimes, relay; about 40)                        | Real behaviour, cheap                                                                                 | Low                                            | **Keep.** Cut only cases that restate constants.                                                                                                                                                                                        |
| Pure logic that runs in jsdom by accident (about 18)                                                       | Same as above                                                                                         | Pays a jsdom env per file                      | **Keep the behaviour cases**, and run them in node by convention (§3.2).                                                                                                                                                                |
| Change detectors (`primitives`, most of `semantic`, `theme`, `getIntegrations`, one-assert identity tests) | Nothing a bug would break                                                                             | Low runtime, high churn                        | **Cut.** Keep the generator invariants in `semantic.test.ts`.                                                                                                                                                                           |
| RTL component and hook tests (`Sidebar`, `Shell`, `DashboardGrid`, forms, stores with storage; about 30)   | User-visible behaviour                                                                                | jsdom per file                                 | **Keep** if it asserts what a user sees or does. **Merge** into a story `play` when a story of the same state already exists (e.g. compact flyout). Drop mock-based render counting unless re-render isolation is a stated requirement. |
| Contract suites (`recordProviderSuite` ×2)                                                                 | Every provider honours one contract                                                                   | Low                                            | **Keep and extend.** This is the cheapest guard for a plugin/provider architecture.                                                                                                                                                     |
| Relay HTTP tests (5)                                                                                       | Security behaviour (origin, token, scrubbing)                                                         | Low (node)                                     | **Keep.** It moves with the relay package.                                                                                                                                                                                              |
| Convex test (1)                                                                                            | The same contract on `convex-test`                                                                    | Low (edge-runtime)                             | **Keep**; run it in CI with the unit job. Drop it only if Convex itself is dropped (G-004, G-024).                                                                                                                                      |
| Stories with `play` (10 files; `DashboardPage` has 27)                                                     | Integration flows in real Chromium, plus a11y                                                         | Browser start-up                               | **Keep as the integration tier.** It is the trophy's "mostly integration" layer here.                                                                                                                                                   |
| Stories without `play` (10)                                                                                | Renders without error + passes axe                                                                    | Same                                           | **Keep** while the a11y gate is wanted; they are cheap once the browser is up.                                                                                                                                                          |
| `lint/docs.test.ts`                                                                                        | Doc links                                                                                             | Red today                                      | **Cut.** If wanted, an optional script.                                                                                                                                                                                                 |
| `lint/toolchain.test.ts`                                                                                   | Installed versions                                                                                    | Low                                            | **Cut.** Fix G-034 in Renovate instead; `vp migrate` re-pins.                                                                                                                                                                           |
| `lint/compiler.test.ts`                                                                                    | Case 1: compiler handles destructured defaults. Case 2: whole-`src` skip list with a hard-coded path. | Case 2 compiles all of `src`                   | **Keep case 1. Move case 2 to an optional script** (`vp run audit:compiler`). It is path-coupled (G-019).                                                                                                                               |
| `lint/rules.test.ts`                                                                                       | Custom rules and layer rules fire                                                                     | 5 child processes, 20 s timeouts, wrong config | **Cut in its current form.** If any custom rule survives §3.4, test it in-process with `RuleTester` (S6).                                                                                                                               |
| `plugins.config.test.ts`                                                                                   | Plugin list/virtual module                                                                            | Low                                            | **Keep; fix G-036** by deriving the expected path from the same `join`/`resolve` the code uses. No Windows CI job is needed.                                                                                                            |

### 3.2 Test environment selection

| Option                                                                                                                                                                                                                                                                                | Effect                                              | G-019 risk                                         | Note                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Today: explicit `NODE_TESTS` globs, everything else jsdom                                                                                                                                                                                                                          | 52 jsdom envs                                       | **High**: a moved pure test silently becomes jsdom | —                                                                                                                                                              |
| B. **By extension**: `*.test.ts` → node, `*.test.tsx` → jsdom; a `// @vitest-environment jsdom` docblock on the `.ts` tests that need a DOM (about 16 by the same grep: the stores, `useMainLock`, `useDensity`, `useMotion`, `sentry/runtime`, `dashboardApi`, `drafts`, `storage`…) | About 34 jsdom envs (estimate)                      | Low: convention, not paths                         | Smallest change. Works before and after the restructure. Confirm on vitest.dev that the per-file docblock works the same in Vitest 5 before the tooling stage. |
| C. B + `isolate: false` on the node project                                                                                                                                                                                                                                           | Less worker cost on about 60 files                  | Low                                                | Run `vitest doctor` first (S12).                                                                                                                               |
| D. Move RTL tests to Vitest browser mode, drop jsdom                                                                                                                                                                                                                                  | Removes the jsdom setup shims; more realistic (S13) | Low                                                | Browser start-up on every run; heavier for Windows dev and CI. Better done by **merging RTL tests into story plays** than by running RTL in a browser.         |
| E. `pool: 'vmThreads'` for dom                                                                                                                                                                                                                                                        | One env per worker                                  | Low                                                | Cross-realm `instanceof` caveats (S12). Measure first.                                                                                                         |

**Import share (49 %).** This is a **hypothesis, not measured**: the main drivers are likely `optionalPlugins({ plugins: 'all' })`, which pulls every optional plugin's SDK (AWS, Google) into the module graph, and `react({ compiler: true })`, which transforms every file. Phase 3 should measure this with `--experimental.importDurations.print` and `vitest doctor` before changing either.

### 3.3 Lint: bug-catching scope

| Rule group                                                                                                                                                                                                                                         | Category (S2)          | Verdict [R]                                                                                                                         | Why                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `correctness` category (including the 15 type-aware rules)                                                                                                                                                                                         | correctness            | **Keep, error**                                                                                                                     | Definitely-wrong code; `no-floating-promises`, `await-thenable` and `unbound-method` are real async/`this` bugs.                                 |
| `react/rules-of-hooks`, `react/exhaustive-deps`                                                                                                                                                                                                    | pedantic / correctness | **Keep**                                                                                                                            | Hook bugs.                                                                                                                                       |
| React Compiler rules (`purity`, `refs`, `immutability`, `set-state-in-render`, `set-state-in-effect`, `globals`, `static-components`, `use-memo`, `preserve-manual-memoization`, `error-boundaries`, `unsupported-syntax`, `incompatible-library`) | mixed                  | **Keep**                                                                                                                            | The app ships the compiler, so a violation means silently lost memoization or wrong output.                                                      |
| `no-unused-vars`                                                                                                                                                                                                                                   | correctness            | **Keep**                                                                                                                            | Dead code and typos.                                                                                                                             |
| Hand-picked `suspicious` bug rules (`react/no-unstable-nested-components`, `no-unmodified-loop-condition`, `preserve-caught-error`)                                                                                                                | suspicious             | **Optional add, as warn**                                                                                                           | Real bugs. Do not enable the whole category (S3). `no-unnecessary-type-assertion` (also suspicious) is cleanup, not a bug catcher: leave it off. |
| `typescript/no-misused-promises`, `switch-exhaustiveness-check`                                                                                                                                                                                    | pedantic               | **Optional add**                                                                                                                    | Strong bug catchers for async handlers and unions. Cost: type-aware; measure with `--debug timings`.                                             |
| `consistent-type-imports`, `prefer-const`, `prefer-spread`, `prefer-rest-params`                                                                                                                                                                   | style                  | **Drop, or leave to `--fix`**                                                                                                       | Style, not bugs. `verbatimModuleSyntax` (set in `tsconfig.app.json` and `tsconfig.node.json`) covers what matters for type imports.              |
| `prefer-as-const`, `triple-slash-reference`, `no-wrapper-object-types`                                                                                                                                                                             | correctness            | **Keep** (already on through the category; the explicit entries are redundant)                                                      | —                                                                                                                                                |
| `no-var`, `typescript/no-namespace`, `no-require-imports`, `no-explicit-any`, `no-empty-object-type` (restriction); `ban-ts-comment`, `no-unsafe-function-type` (pedantic)                                                                         | restriction / pedantic | **Mostly drop.** Keep `no-explicit-any` and `ban-ts-comment` only if the user wants type-safety policy.                             | Policy, rarely a bug in this codebase.                                                                                                           |
| `react/only-export-components`                                                                                                                                                                                                                     | restriction            | **Keep as warn** or drop                                                                                                            | HMR hygiene, not a bug.                                                                                                                          |
| `import/no-cycle`                                                                                                                                                                                                                                  | restriction            | **Keep, but measure.** Set `maxDepth`, keep `ignoreTypes`. After packages exist, it may be needed only inside a package.            | Cycles cause `undefined` imports (real bugs). The rule is graph-wide (S5); likely a large share of the 164 s, **unmeasured**.                    |
| `vite-plus/prefer-vite-plus-imports`                                                                                                                                                                                                               | —                      | **Keep**                                                                                                                            | Cheap; prevents a split toolchain.                                                                                                               |
| `app/no-inline-style`, `app/no-raw-style-props`                                                                                                                                                                                                    | —                      | **Drop, or warn-only**                                                                                                              | Design-system policy, not bugs (U9).                                                                                                             |
| `app/no-datasource-query`                                                                                                                                                                                                                          | —                      | **Drop after the restructure**                                                                                                      | Matches any `x.query(…)` by name; false-positive prone. A package export boundary replaces it.                                                   |
| `layer()` `no-restricted-imports` (9 folders)                                                                                                                                                                                                      | —                      | **Replace with package boundaries** (restructure-dependent)                                                                         | See §3.4.                                                                                                                                        |
| Non-layer `no-restricted-imports` groups (server packages in browser, Sentry SDK, `virtual:optional-plugins`, barrels, primitives)                                                                                                                 | —                      | **Keep the server-package and Sentry bans** (they protect bundle size and secrets); barrels and primitives are policy, so optional. | —                                                                                                                                                |

### 3.4 Folder layer rules vs package boundaries

| Option                                                                       | Enforces                                                                                        | Needs                                                                                                             | Cost                                                                               |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| A. Today: `layer()` per folder + fixtures + `rules.test.ts`                  | Folder import direction                                                                         | Every path in 3 places (G-019)                                                                                    | High upkeep, slow test                                                             |
| B. **Workspace packages with `exports`**                                     | A package can import only what it declares in `package.json` and what the other package exports | Imports by package name, **no cross-package `@/*` alias**, pnpm strict resolution (no hoisting of workspace deps) | Upkeep is in `package.json`, checked by TS resolution and the build. No lint rule. |
| C. B + a small `no-restricted-imports` list for what packages cannot express | Things like "no `@sentry/*` outside its package", "no server drivers in the browser app"        | —                                                                                                                 | A handful of rules, no fixtures                                                    |

**[R]** Choose C after the restructure. Until then, keep A unchanged (do not invest in it) and drop `rules.test.ts`.

### 3.5 Type-aware cost

| Option                                                                                                                                                                                     | Type errors caught          | Lint time                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Today: `typeAware` + `typeCheck` on every `vp lint`, local and CI                                                                                                                       | Yes                         | 164 s cold                                                                                                                                                                                                                                    |
| B. **Keep both; fix cache inputs** by adding `'!docs/**'` (and other non-code folders) to the existing `{ auto: true }` + negations list for `check:lint`, `check:test*` and `check:build` | Yes                         | Cold unchanged; **no more misses from `docs/`**                                                                                                                                                                                               |
| B′. Alternative: an explicit `cache.input` list per task                                                                                                                                   | Yes                         | Same, but an input missing from the list gives a **stale cache hit that hides a real error**. The obvious first list already misses `lint/plugin.js`, `.storybook/**` and `plugins.json`. It is also path-coupled (G-019).                    |
| C. B + trim type-aware rules to the correctness set + measure `import/no-cycle` with `--debug timings`                                                                                     | Yes                         | Lower; amount **unknown until measured**                                                                                                                                                                                                      |
| D. Non-type-aware lint locally, type-aware + `typeCheck` in CI only                                                                                                                        | Locally only via editor LSP | Fast locally; type errors found late. **Unverified mechanics:** `typeAware` is set in the root config and the docs only show `--type-aware` turning it _on_. This would need a second config or an override flag I have not confirmed exists. |
| E. Drop `typeCheck`, add `tsc --noEmit`                                                                                                                                                    | Yes                         | Unmeasured here. (The repo comment's "4× slower" figure was for `vp check --no-fmt --no-lint`, not `tsc`.)                                                                                                                                    |

**[R]** B now (independent of the restructure), then C. Never reduce type-aware lint without keeping `typeCheck` somewhere: it is the only type checker. **Do not change `check:fmt` inputs the same way**: `vp fmt --check .` may format markdown, so `docs/` may be a real input for it. Check whether oxfmt formats `.md` first.

### 3.6 Stylelint

| Option                                                                                                       | Effect                                 |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| A. Today: `standard` + 4 token-policy rules + path overrides                                                 | Style and policy; path-coupled (G-019) |
| B. **`stylelint-config-recommended`** + the existing `ignoreFunctions`/`ignoreAtRules`/`ignorePseudoClasses` | Error-avoidance only (S18)             |
| C. B + `color-no-hex` only, as warn                                                                          | One cheap token reminder               |

**[R]** B, or C if the user still wants a token nudge. Remove the folder overrides with the policy rules.

### 3.7 CI shape

| Option                                                                                                                                                                                                                                                                                                                                                                | Deploy gated | Duplicate work                            | Optional checks safe                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| A. Today: one `check` job + a parallel Pages workflow                                                                                                                                                                                                                                                                                                                 | No           | lint + build twice                        | n/a                                                                                          |
| B. **One workflow**: parallel jobs `lint` (lint + fmt + css), `test` (node + dom + convex), `build` (uploads `dist` as a Pages artifact), optional `stories`; a `deploy` job `needs: [lint, test, build]`, `if: push to main`; one **aggregator job `ci-ok`** (`needs: all`, `if: always()`, fails if any required need failed) as the **only required status check** | Yes          | None                                      | Yes. Jobs skipped by `if` report Success (S17); never use `paths:` on the required workflow. |
| C. Separate deploy workflow on `workflow_run` of CI                                                                                                                                                                                                                                                                                                                   | Yes          | Rebuild, or artifact download across runs | More moving parts                                                                            |

**Caching**

- Keep `setup-vp cache: true` (pnpm store); add `cache-save` only on `main` (S9).
- Add the Vite Task cache only after `check:*` tasks hit locally with stable inputs, and measure it (S8 says experimental).
- Deploy from the build job's artifact, so the cache does not matter for deploy correctness.

**Build environment caveat (deploy through `vp run`).**

- [F] `plugins.config.ts:110-111` embeds `GITHUB_REPOSITORY` and `GITHUB_REF_NAME` in the build, and `:221` embeds `GITHUB_SHA`.
- [S7] Vite Task runs commands in a clean environment, and `check:build` has `cache.env: ['SENTRY_*']` only.
- Today's Pages workflow calls `vp build` directly, so the deployed build has that metadata.
- Deploying the artifact of `vp run check:build` would silently lose it, unless those variables are passed through.
- With a restored cross-run task cache, a PR build could also be replayed for a `main` deploy.
- **[R]** Add `GITHUB_REPOSITORY`, `GITHUB_REF_NAME` and `GITHUB_SHA` to `check:build` `cache.env`. Or build for deploy with `--no-cache`.

**Deploy job must keep, from today's `github-pages.yaml`:**

- the `cp dist/index.html dist/404.html` SPA fallback;
- `pages: write` + `id-token: write` and the `github-pages` environment, on the deploy job only (the other jobs stay `contents: read`);
- the non-cancelling `github-pages` concurrency group.

**Storybook in CI.** A `stories` job runs `playwright install chromium --with-deps`, then `vp run check:stories` (S14).

- **Option S-req:** required. It is the only integration and a11y tier, so leaving it out means it never runs.
- **Option S-opt:** run on PRs, not required, or nightly.
- This is the user's call [?]. The research leans to S-req once the story count is trimmed, because it holds the trophy's integration layer.

**Convex.** Add `--project convex` to the unit task. It is cheap and covers the provider contract (G-025).

**Relay.** Add `vp run -r build` or the relay's `build` to the build job. Build the image only if it is deployed (§3 Q9 in 01).

**Affected-only runs.** Not worth it before packages exist. Afterwards, rely on per-package `vp run -r` cache hits. Do not rely on git-ref filters until verified (S10).

---

## 4. Implications for this repo

- **G-020 (slow checks)** has 3 causes, each with a lever that does not need the restructure:
  1. `{ auto: true }` cache inputs see `docs/` folders: add `'!docs/**'` (§3.5 B).
  2. About 18 pure tests in jsdom: use the extension convention (§3.2 B).
  3. The lint tests spawning `vp lint`: cut (§3.1).

  The import share (49 %) needs measuring first (§3.2).

- **G-019 (path-keyed config)** shrinks if you:
  - delete `NODE_TESTS` (convention instead);
  - delete `lint/fixtures` and `rules.test.ts`;
  - delete `compiler.test.ts` case 2;
  - drop the stylelint folder overrides with the policy rules;
  - replace `layer()` with package boundaries.

  What stays path-keyed: `vite.config.ts` `routesDirectory`, `.storybook/main.ts` stories glob, `tsconfig` paths, CI `dist/`.

- **G-032:** cut `docs.test.ts` and `toolchain.test.ts`; move compiler case 2; replace `rules.test.ts` with in-process `RuleTester` tests (only for rules that survive) or nothing.
- **G-036:** fix the assertion in `plugins.config.test.ts:74`, so the Windows baseline goes green without a Windows CI leg.
- **G-034:** fix the Renovate constraint. That removes the need for `toolchain.test.ts`.
- **G-025:** one workflow with a gated deploy, plus convex in unit and relay build in build; storybook required or optional per decision.
- **G-026:** keeping a non-blocking format-only hook is a valid end state (§5). G-026 becomes "decided: intentional".
- **Two configs (finding):** `lint/rules.test.ts` tests `oxlint.config.ts`, which differs from the config CI runs (`vite.config.ts` merge). Vite+ advises a single `lint` block in `vite.config.ts` (S6). Folding `oxlint.config.ts` into `vite.config.ts` removes the split.
- **The tsgolint vs tsrs drift** is a version note for the tooling stage: Vite+ docs now describe tsrs; the lockfile has tsgolint.

---

## 5. Pre-commit

| Option                                                         | Friction                                                | Risk                                     |
| -------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------- |
| A. Today: `vp staged` → `vp fmt` on staged files, never blocks | Near zero                                               | None; CI `check:fmt` is the gate         |
| B. Nothing; rely on format-on-save + CI fmt                    | Zero                                                    | A CI fmt failure costs a push round-trip |
| C. Format + `vp lint` on staged files, blocking                | Seconds to minutes (type-aware lint builds the program) | Friction on Windows; against U8/U9       |

**[R]** A (keep as is). Do not add lint: `typeAware` is on in the root config, and I have not confirmed a flag that turns it off for one run (§3.5 D), so staged lint would be type-aware and slow. No tests in the hook.

---

## 6. Proposed target

### 6.1 Test suite

Budgets are targets (warm cache, dev machine, Windows).

| Tier               | Contents                                                                                                | Env                  | Target wall time                                           | Runs                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------- | ------------------------------------ |
| Static             | `vp lint` (correctness + hooks + compiler rules + `typeCheck`), `vp fmt --check`, stylelint recommended | —                    | Warm hit <5 s; cold: measure, aim well under today's 164 s | Local on demand, CI required         |
| Unit               | Pure logic + contract suites + relay                                                                    | node (`*.test.ts`)   | <30 s                                                      | Local, CI required                   |
| Component          | RTL tests that assert user behaviour and have no story equivalent                                       | jsdom (`*.test.tsx`) | <60 s                                                      | Local, CI required                   |
| Convex contract    | `convex/records.test.ts`                                                                                | edge-runtime         | <15 s                                                      | CI required (in unit task)           |
| Integration + a11y | Stories (plays + a11y)                                                                                  | Chromium             | Measure; aim <3 min in CI                                  | CI (required or optional: [?])       |
| Audits (optional)  | Compiler skip list, doc links, toolchain versions                                                       | node                 | —                                                          | Manual `vp run audit:*`, never in CI |

### 6.2 Lint rule set

- `categories: { correctness: 'error' }`
- Hooks and React Compiler rules as in §3.3
- `no-unused-vars`, `import/no-cycle` (with `maxDepth` once measured), `vite-plus/prefer-vite-plus-imports`
- `no-restricted-imports` limited to server packages in the browser and the Sentry SDK
- Optional, as warn: `typescript/no-misused-promises`, `switch-exhaustiveness-check`, the 4 suspicious rules in §3.3
- Off: style/restriction rules, `app/*` JS-plugin rules, `layer()` rules (after the restructure)
- Config in the `vite.config.ts` `lint` block only

### 6.3 CI jobs

One workflow on `pull_request` and push to `main`:

- `lint`: check:lint, check:fmt, check:css
- `test`: node, dom and convex projects
- `build`: app + relay; upload the Pages artifact
- `stories`: Playwright Chromium, check:stories
- `deploy`: `needs: [lint, test, build(, stories)]`, only on push to `main`; `actions/deploy-pages`
- `ci-ok`: aggregator, the single required check

Delete `github-pages.yaml`.

### 6.4 What depends on the restructure (U10)

| Item                                                                                                 | Depends on restructure?                                                                     |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Add `'!docs/**'` to the auto cache inputs for lint, test and build (not fmt)                         | **No.** It is G-020 cache hygiene and not path-coupled to `src/`, so it can land now.       |
| Fix G-036; cut `docs.test.ts`, `toolchain.test.ts`; fix G-034                                        | **No.** Do it now; it makes the baseline green before the restructure.                      |
| Cut the change-detector tests                                                                        | **No**                                                                                      |
| Environment by extension (`NODE_TESTS` removed)                                                      | **No**, but do it before the move so moved tests keep their environment (it de-risks G-019) |
| Cut `rules.test.ts` + fixtures; move compiler case 2                                                 | **No** (de-risks the move)                                                                  |
| Fold `oxlint.config.ts` into `vite.config.ts`; trim style/restriction rules; stylelint → recommended | Tooling stage; independent of the move but ordered after it per U10                         |
| Replace `layer()` and `no-datasource-query` with package boundaries                                  | **Yes.** Needs workspace packages, package-name imports, strict resolution.                 |
| Per-package tasks and affected-only CI via `vp run -r`                                               | **Yes**                                                                                     |
| Merge RTL tests into story plays                                                                     | After the simplification stage (story set settles)                                          |
| CI restructure (single workflow, gated deploy, aggregator)                                           | CI stage; independent of packages, ordered last per U10                                     |

---

## 7. Recommendation and what would change it

**[R] Summary**

1. **Green the baseline now:** fix G-036, cut `lint/docs.test.ts` and `lint/toolchain.test.ts`, fix G-034.
2. **Before the move:** pick test environments by extension; cut the change detectors and `rules.test.ts`; move the compiler skip-list audit to an optional script.
3. **Tooling stage:**
   - `'!docs/**'` in the cache inputs;
   - `GITHUB_*` variables in `check:build` `cache.env` (before the deploy goes through `vp run`);
   - a single `lint` block in `vite.config.ts`;
   - the correctness + hooks + compiler rule set, with `typeCheck` kept;
   - stylelint recommended;
   - measure `import/no-cycle` and the import share with `--debug timings`, `importDurations` and `vitest doctor`.
4. **After the restructure:** package boundaries replace the layer rules and `no-datasource-query`.
5. **CI stage:** one workflow, an aggregator required check, deploy gated on CI from the build artifact, convex and relay build added, stories in CI.
6. **Pre-commit:** keep format-only and non-blocking.

**What would change this**

- **The user wants design-system rules enforced.** Then keep `no-raw-style-props` and the stylelint token rules as **warn**, and test them with `RuleTester`, not spawned lint.
- **`--debug timings` shows `import/no-cycle` or a few type-aware rules dominate.** Then cap `maxDepth` or run `no-cycle` in CI only.
- **Storybook CI time is too high, or flaky on Linux runners.** Then make `stories` optional/nightly. The integration tier then rests on the RTL component tests, so fewer RTL tests can be cut.
- **Convex is dropped (G-004/G-024).** Then drop the convex project and `convex-test`.
- **The restructure does not produce workspace packages** (folders only). Then keep a reduced `layer()` set: about 3 directional rules, no fixtures, no test.
- **`vitest doctor` shows `isolate: false` passes.** Then adopt it for node, and possibly dom, before cutting more tests for speed.

**[?] Open questions for the user**

1. Is storybook a required CI check or optional?
2. Do any design-token lint rules stay, as warn?
3. Do `no-explicit-any` and `ban-ts-comment` stay as type-safety policy?
4. Is the relay image deployed anywhere? This decides whether CI builds the image.
