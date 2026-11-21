# Phase 2 research: task running and caching alongside Vite+

Researched 2026-11-21. Repo pins `vite-plus@1.6.0` and `vitest@5.1.0` (`pnpm-workspace.yaml` catalog). Version- and date-sensitive claims are marked **[date]**.

Confidence: **H** means a primary source or a local test, **M** means a primary source that this repo has not tested, **L** means a secondary source or an inference.

## 1. Question and scope

The user requirements are U7 and U9: keep Vite+ (`vp`, `vpr`, oxlint with tsgolint, oxfmt, Vitest 5), and look at better task running and caching **alongside** it. The developer OS is Windows and CI is GitHub Actions. The target is a pnpm monorepo with `apps/` and `packages/`. The packages are not published.

Measured baseline, from `01-current-state.md` §1.10 and G-020:

- Cold lint takes 164 s.
- Unit tests take 269 s. Import is 49 %, environment 30 %, setup 14 % and tests 5 %. jsdom is created 52 times.
- The lint cache is invalidated by changes under `docs/`.

Questions:

1. What does `vp run` offer?
2. How do vp run, Turborepo, Nx and moon compare for this repo?
3. How can the docs invalidation be fixed?
4. Which Vitest levers fit the measured split, and where should type-aware lint run?
5. What is the minimal tool set, and what would change it?

Out of scope: rule-set trimming (U9 lint strictness) and which tests to cut (U8, G-032). Both are referenced only where they interact with caching.

## 2. Findings (facts)

### 2.1 Local observations in this checkout (2026-11-21)

| #   | Observation                                                                                                                                                                                                                                                                                                                       | How it was obtained                                   | Conf. |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----- |
| L1  | `vp run --dry-run -v check:lint` reports `cache miss: 'work' added in 'docs/ecc'`. Creating this research folder invalidated lint again. The invalidation comes from a **directory listing**, not a file read.                                                                                                                    | Ran the dry run. It is read-only and writes no cache. | H     |
| L2  | `vp run --dry-run -v check:unit` reports `no previous cache entry found`. Only runs that exit 0 are cached (`node_modules/vite-plus/docs/guide/cache.md`, Overview). The unit suite is red: G-036 on Windows and `lint/docs.test.ts` through G-035/G-032. So **`check:unit` can never be a cache hit locally today.**             | Ran the dry run, then read the bundled docs.          | H     |
| L3  | `vp run --filter "[HEAD~1]" --dry-run check:lint` prints `No packages matched the filter: [HEAD~1]`. vp's `--filter` has **no pnpm-style git "changed since" selector**: the bracket is read as a name pattern. `vp run --help` lists only name, directory, `...` traversal and `!` exclusion.                                    | Ran the command and read `--help` (vp 1.6.0).         | H     |
| L4  | All `check:*` tasks share `cacheInput = [{auto:true}, '!.git', …]`. That list excludes agent and IDE folders but **not `docs/`**. `check:css` already uses explicit inputs.                                                                                                                                                       | Read `vite.config.ts`.                                | H     |
| L5  | `ci.yaml` runs `vp run check:*`, but it does not restore `node_modules/.vite/task-cache`. `setup-vp` with `cache: true` caches only package-manager data. So every CI run is task-cold. `github-pages.yaml` calls `vp check --no-fmt` and `vp build` directly, which bypasses the task cache and repeats CI's work (G-025).       | Read the workflows and `guide/ci.md`.                 | H     |
| L6  | The repo is a single root package. The only workspace member is `relay/`. One `check:lint` task and one `check:unit` task cover the whole app, so **any source edit reruns the whole 164 s or 269 s**. Caching helps only with byte-identical reruns: CI re-runs, switching branches back, and worktrees replaying main.          | Read the config and the `run` docs.                   | H     |
| L7  | `vitest.config.ts` runs `react({ compiler: true })` and `optionalPlugins({ plugins: 'all' })` for every project. Every test file passes through the React Compiler transform. The config comments say this is deliberate. The `dom` project's environment is decided by an explicit `NODE_TESTS` exclusion list (the G-019 trap). | Read `vitest.config.ts`.                              | H     |

### 2.2 Vite+ / Vite Task (`vp run`, `vpr`)

Primary sources are the docs bundled with the installed 1.6.0 (`node_modules/vite-plus/docs/guide/{run,cache,automatic-data-tracking,github-actions-cache,monorepo}.md`, `config/run.md`), mirrored at https://viteplus.dev/guide/run.

- **V1. Per-package tasks and the workspace graph (H).**
  - Tasks are defined in each package's `vite.config.ts` under `run.tasks`, or as `package.json` scripts.
  - `dependsOn` takes `'pkg#task'` or `{ task, from: 'dependencies' | 'devDependencies' | … }`.
  - Package order comes from normal `package.json` workspace dependencies.
  - Selection flags: `-r` (all packages in topological order), `-t` (a package plus its dependencies), `--filter` (pnpm-like, including `...pkg` dependents).
  - Concurrency defaults to 4. `--parallel` is available.
  - Since 1.6, a package's config loads only when the run reaches one of its tasks.
- **V2. Hashing (H).** The fingerprint covers arguments, `cache.env`, and **automatically tracked inputs**: files read, missing-file probes and **directory listings**. Outputs are tracked automatically and restored on a hit.
  - `cache.input` and `cache.output` accept `{auto:true}`, globs, `!` exclusions, and `{pattern, base:'workspace'|'package'}`.
  - `vp build` and `vp test` report extra metadata ("cooperative tracking").
  - Tasks run with a clean environment by default.
  - Since 1.6.0 **[date]**:
    - `input` exclusions also apply to folders that the task lists (vite-task#919, #941).
    - Tasks that rewrite files they read can be cached.
    - `--dry-run`, `--json` and `-v`/`-vv` explain misses.
  - Release notes: https://github.com/voidzero-dev/vite-plus/releases/tag/v1.6.0
- **V3. Remote cache: not released (H) [date].**
  - Release tracking is vite-task#930 (https://github.com/voidzero-dev/vite-task/issues/930). It is a 2026 Q4 P0 item, open as of 2026-11-04.
  - Upload, restore and GitHub OIDC auth exist. Windows e2e is marked done. The Cloudflare Workers server lives in `vite-plus-remote-cache-cloudflare`.
  - Known gaps: a remote hit is never stored back (#924), and keys always include OS and architecture (#926).
  - VoidZero's own docs CI uses an unreleased preview build with `VP_REMOTE_CACHE_URL` (vite-plus PR #2926).
  - The 1.7.0 notes (2026-11-17) do not mention a remote cache release.
  - VoidZero states its intent to replace Turborepo and Nx (vite-plus#3277, https://github.com/voidzero-dev/vite-plus/issues/3277).
- **V4. GitHub Actions cache: documented, marked "experimental" (H).** Restore `node_modules/.vite/task-cache` after `setup-vp` with `actions/cache/restore`.
  - Key: `vite-task-${os}-${arch}-${run_id}-${attempt}`, with restore prefix `vite-task-${os}-${arch}-`.
  - Do not put lockfiles or sources in the key: Vite Task fingerprints them.
  - The cache grows without per-entry eviction.
  - The docs say to measure first, since transfer time can exceed the time saved.
  - Source: `guide/github-actions-cache.md`.
- **V5. Affected-only runs: none (H).** No `--affected` and no git-ref filter (L3). The closest equivalents are content-hash cache hits per package and `vp test --changed` inside Vitest. Neither the docs nor DeepWiki mention affected selection.
- **V6. Windows (M).**
  - Windows x64 and arm64 are supported targets.
  - Commands are parsed by Vite Task, not a shell, so they behave the same on every platform.
  - 1.6.0 fixed Windows treating deleted or moved files as inputs.
  - Open issue: "Windows reports the workspace root as a read-write overlap" (vite-task#548, listed under #929).
  - The Linux tracking backend misses direct-syscall reads and fails on WSL2. That matters for ubuntu CI (vite-plus#3277 P1, vite-task#932).
- **V7. 1.7.0 (2026-11-17) [date] (M).**
  - Type-aware lint and type check move to **tsrs**, a Rust port of the TypeScript 7 compiler. The vendor benchmark shows −18 % to −53 % time and about −50 % memory (Apple M4).
  - tsrs targets TypeScript 7.1.0-beta, so diagnostics can change.
  - `vp migrate` warns when it finds `turbo.json`, because `vp run` does not read Turborepo configuration.
  - Release notes: https://github.com/voidzero-dev/vite-plus/releases/tag/v1.7.0
- **V8. Root directory listing (M, inference from V2).** A root-level `vp lint` lists the repo root, so a **new top-level folder** still misses unless it is excluded. Only smaller per-package tasks shrink this surface.

### 2.3 Turborepo

Docs: https://turborepo.dev/docs.

- **T1 (H).** Inputs default to the package's git-tracked files. `inputs` replaces that default; `$TURBO_DEFAULT$` and `!` adjust it. `outputs` must be declared, otherwise only logs are cached. `$TURBO_ROOT$` gives root-relative globs. Sources: `/reference/configuration`, `/crafting-your-repository/caching`.
- **T2 (H).** `turbo run --affected` is equivalent to `--filter=...[main...HEAD]`. It reads `GITHUB_BASE_REF` and `GITHUB_EVENT_PATH` in Actions. A shallow clone selects everything, so use `fetch-depth: 0` with `filter: blob:none`. `futureFlags.affectedUsingTaskInputs` makes the selection task-level. Sources: `/reference/run`, `/crafting-your-repository/constructing-ci`.
- **T3 (H).** GitHub Actions: cache `.turbo` with `actions/cache`, as documented in `/guides/ci-vendors/github-actions`. A remote cache is Vercel's or a self-hosted one that implements the open API. `--cache=local:rw,remote:r` controls reads and writes.
- **T4 (L).** Windows binaries ship and turbo is commonly used on Windows. No Windows-specific blocker was found in this pass, so this is not verified.

### 2.4 Nx

- **N1 (H).** `nx affected` works without Nx Cloud. `nrwl/nx-set-shas` sets `NX_BASE` and `NX_HEAD`, which needs `fetch-depth: 0`. Source: https://nx.dev/docs/kb/github-integration
- **N2 (H) [date].** The self-hosted bucket caches (`@nx/s3-cache`, `gcs`, `azure`, `shared-fs`) were **deprecated 2026-05-21** because of CREEP (CVE-2025-36852, cache poisoning). Nx recommends Nx Cloud, or a self-built server that implements its OpenAPI spec and rejects overwrites with 409. Source: https://nx.dev/docs/reference/deprecated/self-hosted-cache-packages
- **N3 (M, vendor-authored).** Nx's "Nx vs Vite+" page says Vite+ has a local-only cache and that "every CI run starts with a cold task cache". The second claim ignores vp's experimental Actions cache guide (V4). Source: https://nx.dev/docs/kb/nx-vs-vite-plus
- **N4 (L).** Setup cost is higher: `nx.json` plus project inference plugins. It is not verified whether `@nx/vite` inference understands a `vite-plus` `defineConfig`.

### 2.5 moon

- **M1 (H).** `moon run --affected [local|remote]` and `moon ci` select tasks by comparing VCS changes with task inputs, and also run dependents. `moon ci` needs full history or a blobless clone. Source: https://moonrepo.dev/docs/guides/ci
- **M2 (H).** The remote cache is self-hosted on the Bazel Remote Execution v2 API (for example `bazel-remote`), or hosted by Depot. Manual Actions persistence of `.moon/cache/{hashes,outputs}` is possible but awkward to invalidate. Source: https://moonrepo.dev/docs/guides/remote-cache
- **M3 (M).** Windows is supported; hooks are generated as PowerShell on Windows. moon also wants to manage the toolchain through proto. That **overlaps with `vp env` and setup-vp's Node and pnpm management**. It is a second source of truth unless it is disabled.

### 2.6 Vitest 5 levers

Source: Context7 `/vitest-dev/vitest/v5.0.3`, `docs/guide/improving-performance.md` and `profiling-test-performance.md`.

- **VT1 (H). Environment cost.** jsdom takes about 200–500 ms per import and happy-dom about 90–200 ms, before the window is built. With the default isolating pool this is paid per file and shows up as the `environment` share. Options:
  - `isolate: false` with `threads`: the environment is created once per worker, with no isolation. This is fastest. Check tests with `vitest doctor`.
  - `pool: 'vmThreads'`: the environment is created once per worker, with a fresh VM context and `window` per file. It has cross-realm `instanceof` edge cases and weaker memory reclaim (`vmMemoryLimit`).
  - `vmThreads` **cannot** be combined with `isolate: false`.
  - "happy-dom is cheaper to create than jsdom in every setup."
- **VT2 (H). Import cost.** `experimental.importDurations.print` ranks the slowest imports. `deps.optimizer.client` (used for jsdom and happy-dom) pre-bundles deep UI libraries. Avoid barrel imports in tests.
- **VT3 (H).** `--shard=i/n --reporter=blob`, then `--merge-reports`. `--changed` runs tests related to changed files. This repo already has a `test:changed` script.

## 3. Options compared

|                                                                         | **vp run only** (today)                                                                         | **vp run + Turborepo**                                                                                              | **vp run + Nx**                                                                 | **vp run + moon**                                                          |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Setup cost here                                                         | Already in place. Per-package `run.tasks` after the split.                                      | `turbo.json` plus per-package scripts calling `vp lint` or `vp test`. `vp migrate` warns about it (V7).             | `nx init` plus `nx.json`. Inference plugins may not read vite-plus config (N4). | `.moon/workspace.yml` plus `moon.yml` per project. Toolchain overlap (M3). |
| Input model                                                             | Automatic tracking plus globs. Catches undeclared reads, but directory listings are sharp (L1). | Git-tracked files per package. Predictable, can miss reads outside the package.                                     | `namedInputs`. Explicit.                                                        | Declared `inputs`. Explicit.                                               |
| Local cache                                                             | Yes                                                                                             | Yes (`.turbo`)                                                                                                      | Yes (`.nx/cache`)                                                               | Yes (`.moon/cache`)                                                        |
| GitHub Actions cache                                                    | Documented, experimental (V4)                                                                   | Documented (T3)                                                                                                     | Possible. The official path is Nx Cloud.                                        | Manual and awkward (M2)                                                    |
| Remote cache                                                            | Unreleased, Q4 P0 (V3)                                                                          | Vercel or self-host API                                                                                             | Nx Cloud. Bucket self-hosting deprecated over CREEP (N2).                       | Bazel RE API self-host or Depot                                            |
| Affected detection                                                      | **None** (L3, V5)                                                                               | `--affected` (T2)                                                                                                   | `nx affected` (N1)                                                              | `--affected`, `moon ci` (M1)                                               |
| Windows                                                                 | Supported, one open overlap issue (V6)                                                          | Supported (L)                                                                                                       | Supported (L)                                                                   | Supported (M)                                                              |
| Coexistence with vp                                                     | Native                                                                                          | Turbo must call `vp lint` or `vp test` **directly**, not `vp run check:*`, or two caches fingerprint the same work. | Same rule as turbo                                                              | Same rule, plus disable the toolchain duplication                          |
| Value at today's size (1 SPA, 1 relay, a few internal packages, Convex) | Enough                                                                                          | Mainly `--affected`                                                                                                 | Mainly affected detection, plus a hosted cache                                  | Same as turbo, with more config                                            |

Convex: `convex dev` and `convex deploy` have remote side effects and must be `cache: false` in any runner. `convex codegen` writes `convex/_generated` and could be cached as an output. This applies to every runner.

## 4. Implications for this repo

- **G-020, docs invalidating lint (fix).**
  - Facts: the miss comes from a directory listing (L1), and since 1.6.0 an `input` exclusion also covers listed folders (V2).
  - Fix, applied to the `check:lint` task, and to `check:fmt` and `check:build` if they share the same miss:
    - Add `'!docs', '!docs/**'` to `cacheInput`. The two-entry form matches the existing `'!.git', '!.git/**'` style.
    - Also add `docs/**` to `lint.ignorePatterns`, if oxlint walks it today, so oxlint does not list it at all.
  - Leave `docs/` **in** `check:unit`'s inputs while `lint/docs.test.ts` exists: that test really reads docs. Removing it (G-032) is what makes the exclusion safe there too.
  - Residual limit (V8): a new top-level folder still invalidates a root-level task. The `apps/` and `packages/` split, with per-package tasks, is the structural fix.
  - Status: **not applied and not verified here.** Confirm with `vp run --dry-run -v check:lint` after creating a file under `docs/`.
- **G-020, test time (the real lever is Vitest, not caching).** Per L6, caching does not help the edit-rerun loop. Mapped to the measured buckets:
  - **Environment (30 %, 52 jsdom).**
    - Move tests that do not need a DOM to the `node` project by convention: `*.test.ts` runs in node, and `*.test.tsx` or `*.dom.test.ts` runs in a DOM environment. This replaces the `NODE_TESTS` list, which is the G-019 trap.
    - Then try happy-dom, or `isolate: false` with threads (vetted by `vitest doctor`), or `vmThreads` if isolation is needed.
    - happy-dom compatibility with Mantine and Testing Library is **unverified**. Treat it as an experiment.
  - **Import (49 %).**
    - Turn on `experimental.importDurations` first and act on the data.
    - Likely candidates for `deps.optimizer.client` are Mantine and `@tabler/icons-react`. These are hypotheses, not findings.
    - The React Compiler plugin in tests (L7) is a real transform cost. Keep it if "test what ships" is worth it, or measure with it off.
  - **Sharding (VT3).** Low value while cost is per-worker setup. Each GitHub Actions shard also repays install. Revisit only if tests stay above about 3 min after the above.
- **G-036, G-035, G-032: caching precondition.** A red suite is never cached (L2). Make `plugins.config.test.ts` OS-neutral (G-036), and fix or retire `lint/docs.test.ts` (G-035, G-032), before expecting any `check:unit` hits.
- **G-025, CI.**
  - Add the V4 restore and save steps around `vp run` (experimental). Measure the workflow with and without them.
  - Make `github-pages.yaml` reuse CI or call `vp run check:*`, instead of repeating lint and build uncached.
  - Fork-PR caches are restore-only, and PR caches are scoped to their merge ref. A PR's entry cannot be restored by `main` (GitHub cache scoping, per V4). This is the CREEP concern (N2) in a milder form for the Actions cache.
- **G-026 and Q12: where type-aware lint runs.** `typecheck` is an alias of `check:lint` (§1.7), so **dropping type-aware lint anywhere drops type checking there.** CI must keep it. Options for local runs:
  1. Pre-commit runs `vp fmt` plus non-type-aware `vp lint` on staged files. Non-type-aware oxlint is fast. The editor's TypeScript server covers types in between.
  2. Pre-push or `vp run check:lint` stays type-aware and is cached.
  - It is **unverified** how to switch off `typeCheck` and type-aware for staged files only. `vite.config.ts` sets `options.typeCheck: true` globally, so this may need an env-conditional config or a CLI flag. Check `vp lint --help` before designing it.
  - Before cutting scope, measure how much of the 164 s comes from tsgolint versus the JS plugins (`lint/`, `vite-plus/oxlint-plugin`). Upgrading to 1.7 (tsrs, V7) may change the type-aware share.
- **G-019.** After the split, per-package `run.tasks` with `dependsOn: [{task, from:'dependencies'}]` replace the path-keyed globs. Convention-based Vitest projects (`projects: ['apps/*', 'packages/*']`) remove `NODE_TESTS`.

## 5. Recommendation

**Minimal tool set: Vite+ `vp run` only. Do not add Turborepo, Nx or moon now.**

Reasons:

- At this size the measured pain (G-020) comes from tool cost inside single tasks: lint at 164 s and Vitest environment and import time. It does not come from orchestration across packages.
- A second runner would not shorten either number. It would add a second config and a second cache, and VoidZero is actively closing the remote-cache gap.

Staged:

1. **Now.** Fix the docs exclusion for lint, fmt and build (§4). Fix G-036 and retire or fix the docs test so the unit cache can hit. Use `vp run --dry-run -v` as the cache-debug tool.
2. **Tooling stage (U10).**
   - Restructure Vitest by convention.
   - Measure import durations, then try a cheaper DOM setup.
   - Decide type-aware placement: CI and pre-push full, pre-commit fast.
   - Try the vp 1.7 tsrs backend, and re-measure lint.
3. **CI stage.** Add the experimental Actions cache restore and save around `vp run`, and keep it only if measured faster. Stop the Pages workflow from repeating work.
4. **After the split.** Per-package `run.tasks` and `vp run -r` or `--filter`. Cache hits per package then give an "affected-like" effect without git logic.

**What would change this:**

- **A second app, or several packages where CI time is dominated by unaffected packages.** Package-level content caching then stops being enough, and git-based selection matters. Add **Turborepo**, the lightest add-on, for `--affected` only. Its tasks call `vp lint` and `vp test` directly, and `vp run` stays the local entry point. Re-check first whether vp has shipped affected selection.
- **A shared cache across developers and CI is needed before vp's remote cache ships (V3).** Choose Turborepo with a self-hosted or Vercel cache, or Nx Cloud. Avoid bucket-based self-hosting (N2).
- **vp's remote cache ships, with safe main/PR reuse (vite-task#931).** It becomes the default choice, and any added runner should be re-evaluated for removal.
- **Automatic tracking stays flaky on Linux CI (V6), so CI cache hits do not materialise.** That favours explicit `cache.input` globs, or a runner with declared inputs.

## 6. Unverified and open

- Whether `'!docs/**'` alone, without `'!docs'`, clears the listing miss on 1.6.0. The release note implies yes; this was not tested.
- How much of the 164 s is tsgolint, the JS plugins, or Windows I/O. Windows Defender or Dev Drive effects are an untested hypothesis.
- happy-dom compatibility with Mantine, Testing Library and the React Compiler output.
- Whether `isolate: false` is safe with zustand, zundo and Mantine module state. `vitest doctor` has not been run.
- A per-invocation switch to turn off type-aware and `typeCheck` in `vp lint`.
- Turborepo, Nx and moon Windows behaviour in this repo. Not tested; only general support was confirmed.
- The timing of the vp remote cache release **[date]**: it is Q4 2026 P0, but no released version has it as of 1.7.0.
