# 02 research — Workspace layout and package boundaries

Baseline: branch `review` @ `a8d5c57`, 2026-11-21. Inputs: `docs/ecc/work/01-current-state.md` (§0, §1, §2 gap register, §3.1) plus the external sources cited below. Other repo docs were not used as evidence.

Labels:

- **[F]** observed in this repo;
- **[S]** found in an external source (URL and confidence given);
- **[R]** recommendation;
- **[?]** unverified or open.

---

## 1. Question and scope

How should this repo be laid out as an `apps/` + `packages/` workspace, and where should each package boundary sit?

Constraints (01 §0, §3.1):

- monorepo-style layout, with packages treated as real but not published (Q1, D1, D6);
- no second app now;
- plugins stay internal, with no package per plugin (D2);
- several implementations ship in the build, and the active one is chosen at runtime (Q5, D3);
- multi-user, but no live collaboration (Q2);
- credentials stay in the browser (Q3);
- keep Vite+ (U7);
- restructure first, then tooling (U10);
- Mantine is not a structure reference.

Pieces to place:

- the SPA (today the repo root);
- `relay/`;
- `convex/`;
- `apps/docs`;
- `lint/`;
- `src/core`;
- the plugin contracts and registry;
- the plugin implementations;
- `src/ui`;
- `src/shell`;
- the rest of `src/`: `app`, `features`, `lib`, `utils` and `testing`.

Out of scope:

- feature-internal conventions (Q11);
- the task-runner choice itself (Q12), beyond what layout implies;
- the naming of storage, place and record provider (G-001).

---

## 2. Observed facts that drive the layout [F]

| #   | Fact                                                                                                                                                                                                                                                                                                                                                               | Where                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| F1  | The root `package.json` _is_ the SPA (`dashboard-builder`). `pnpm-workspace.yaml` lists only `relay`. It already has a `catalog:` for the Vite+/Vitest family.                                                                                                                                                                                                     | `pnpm-workspace.yaml`                                             |
| F2  | `src/core` imports only `zod` (plus `vite-plus/test` in tests), and uses relative imports internally. `@/core` is imported by 55 `features`, 41 `plugins`, 6 `lib`, 4 `app`, 4 `ui` and 3 `testing` files. It is the cleanest extraction candidate.                                                                                                                | grep of `src/core`                                                |
| F3  | The plugin contracts (`WidgetPlugin`, `DatasourcePlugin`, `OptionalPlugin`, `RecordProviderPlugin`, `usePlugins`, `connectionDatasource`) import only `@/core`, `@/utils/wait`, `react` and `zod`. The implementations import `@/core`, `@/plugins/<contract>`, `@/ui/components` (4), `@/ui/tokens` (2) and `@/utils/wait`. None import `@tanstack/react-router`. | `src/plugins/*.ts`                                                |
| F4  | `src/shell` uses `@tanstack/react-router` throughout (`Link`, `useMatches`, `useRouterState`) and contains `declare module '@tanstack/react-router'` augmentations. `lib/sentry/router.ts` uses it too. `ui` is lint-banned from the router.                                                                                                                       | `src/shell/**`, `oxlint.config.ts:232`                            |
| F5  | `@/` aliases appear in 224 files. `tsconfig.app.json` maps `@/*` to `./src/*`, and Vite uses `resolve.tsconfigPaths: true`.                                                                                                                                                                                                                                        | `tsconfig.app.json`, `vitest.config.ts`                           |
| F6  | `relay` is built with `vp pack src/server.ts`. It imports `../../src/core/**` by relative path. The Dockerfile runs `pnpm --filter dashboard-relay deploy`, then `COPY src/core /build/src/core`, then builds.                                                                                                                                                     | `relay/package.json`, `relay/Dockerfile`                          |
| F7  | `convex/` sits at the root with no `convex.json`, and `convex/_generated` is committed. `convexProvider.ts` imports `../../../../convex/_generated/api`. `convex/records.test.ts` imports `src/core/records/RecordProvider`, `src/plugins/recordProviders/browserStorage/...` and `src/testing/recordProviderSuite`.                                               | `git ls-files convex`                                             |
| F8  | `layer()` keys each rule to `src/${dir}/**` and to `lint/fixtures/src/${dir}/**`. The relay rule bans `**/src/<dir>/**` relative paths. `jsPlugins: ['./lint/plugin.js']` loads the plugin by path.                                                                                                                                                                | `oxlint.config.ts:94-116, 222-300`                                |
| F9  | `NODE_TESTS` is an explicit list of 11 globs; everything else in `src/` runs in jsdom. The `convex` project globs `convex/**/*.test.ts`.                                                                                                                                                                                                                           | `vitest.config.ts:8-21`                                           |
| F10 | `routesDirectory: 'src/app/routes'` and `generatedRouteTree: 'src/app/routeTree.gen.ts'` are relative to the Vite root.                                                                                                                                                                                                                                            | `vite.config.ts:109-110`                                          |
| F11 | `plugins.json` lives at the repo root. The dev middleware writes it. `githubBuildList.ts:15` PUTs `FILE = 'plugins.json'`, a path relative to the repo root on GitHub. Pages publishes `dist/`.                                                                                                                                                                    | `githubBuildList.ts`, `.github/workflows/github-pages.yaml:43-49` |
| F12 | `pnpm-workspace.yaml` sets `virtualStoreType: global`, `strictPeerDependencies: true`, `minimumReleaseAge` and `allowBuilds`. These supply-chain settings are to be preserved (01 strengths).                                                                                                                                                                      | `pnpm-workspace.yaml`                                             |

---

## 3. Findings (external sources)

### Q1. apps/ vs packages/ vs libs/, naming, and when something deserves a package

- **S1.1** Turborepo recommends `apps/` for applications _and services_, and `packages/` for everything else, both libraries and tooling.
  - Its globs are one level deep (`apps/*`, `packages/*`). Nested packages (`apps/a/b`) are unsupported.
  - To group packages, use a second glob such as `packages/group/*`, with no `package.json` in the group folder.
  - Internal packages should take a namespace prefix. Its docs use `@repo`, a scope that is "unused, unclaimable" on npm.
  - Source: https://turborepo.com/docs/crafting-your-repository/structuring-a-repository. **High.**
- **S1.2** Turborepo: install each dependency in the package that uses it, and keep few dependencies at the root, only repo tools.
  - Source: https://turborepo.com/docs/crafting-your-repository/managing-dependencies. **High.**
- **S1.3** Nx recommends a "modulith": one deployable whose code is split into separate projects.
  - Its goals are that each project has a well-defined purpose, that code is quick to locate, and that code changed together sits together.
  - It warns against "dump projects" named `util` or `components`.
  - Source: https://nx.dev/blog/virtuous-cycle-of-workspace-structure. **High** (official blog).
- **S1.4** Nx library types: **feature** (containers or pages, can depend on anything), **ui** (presentational only, depends on ui and util), **data-access** (backend calls and state, depends on data-access and util) and **util** (pure, depends on util only).
  - Naming is `feature-*`, `ui-*`, `data-access-*` and `util-*`, or the bare name when nested.
  - Nx advises keeping the number of types low and documenting each one.
  - Feature libraries are "almost always app-specific".
  - Source: https://nx.dev/docs/kb/project-dependency-rules. **High.**
- **S1.5** Nx folders: `apps/*` plus `libs/*` (older generators) or `packages/*` (newer TypeScript setup).
  - A root-level project, one whose root is `.`, "can't be added as a workspace entry".
  - Source: https://nx.dev/docs/kb/switch-to-workspaces-project-references. **High.**
- **S1.6** TanStack Router's monorepo examples use `packages/{app, router, post-feature}`, plus `post-query` in the React Query variant.
  - The router gets its own package because the `Register` type augmentation placed in the final app "won't be type-safe" for links inside libraries.
  - The app maps routes to feature components.
  - These example packages are _compiled_ (`vite build` + `vite-plugin-dts`, `main: ./dist/index.js`).
  - Source: https://github.com/TanStack/router/tree/main/examples/react/router-monorepo-simple (README and `packages/*/package.json`). **High.**
- **S1.7** TanStack Start's single-app examples keep `convex/` next to the app's `package.json`, as in `examples/react/start-convex-trellaux/convex/`. I found no official Start monorepo example.
  - Source: https://github.com/TanStack/router/tree/main/examples/react/start-convex-trellaux. **High** for the layout; **[?]** that no Start monorepo example exists, since only `examples/react` was listed.
- **S1.8** Vite+: `vp dev`, `vp build` and `vp preview` "never silently act on the workspace root, which usually has no app of its own".
  - `defaultPackage` in the root config points them at one app.
  - Source: https://viteplus.dev/guide/monorepo. **High.**
- **S1.9** On when something deserves a package, no primary source gives a hard rule. Two secondary sources (an Angular course and a Rust guide) agree:
  - a package needs a coherent public API and a real consumer;
  - or it should clearly enforce a boundary;
  - a large folder alone is not a reason.
  - Nx S1.3 adds "code updated together stays together".
  - Source: https://www.chamrong.com/courses/angular-a-to-z/libraries-monorepos-upgrades. **Low** (secondary).

### Q2. Internal TS-source packages without a build step

- **S2.1** Turborepo "Just-in-Time" packages export `.ts` or `.tsx` directly in `exports`, have no `build` script, and are compiled by the consuming bundler (Vite counts).
  - **No `compilerOptions.paths` inside them.** Use Node subpath imports (`"imports": { "#*": ... }`) instead.
  - Turborepo cannot cache a build for them, since there is none.
  - Type errors in the dependency surface in its consumers.
  - Source: https://turborepo.com/docs/core-concepts/internal-packages. **High.**
- **S2.2** Turborepo prefers subpath `exports` (`"./add": "./src/add.ts"`) because they let you add entrypoints "without creating dangerous barrel files".
  - Source: https://turborepo.com/docs/guides/tools/typescript. **High.**
- **S2.3** Vite treats a linked workspace dependency, one not resolved from `node_modules`, as source: it does not pre-bundle it, and it analyses its dependency list instead. The linked package must be ESM.
  - Source: https://vite.dev/guide/dep-pre-bundling#monorepos-and-linked-dependencies. **High.**
- **S2.4** Nx "non-buildable" libraries export source (`".": "./src/index.ts"`), and Nx says to start with them.
  - Its workspaces + project-references recipe (`composite`, `customConditions`, `declarationMap`) is meant for buildable or published libraries, and for `tsc -b` performance.
  - pnpm links only the workspace packages that are declared as dependencies.
  - Sources: https://nx.dev/docs/getting-started/tutorials/managing-dependencies, https://nx.dev/docs/kb/switch-to-workspaces-project-references. **High.**
- **S2.5** pnpm `workspace:*` refuses to resolve anywhere except the workspace.
  - Catalogs (`catalog:`) define versions once. Since v12.2 a catalog entry can hold a `workspace:` range.
  - Sources: https://pnpm.io/workspaces, https://pnpm.io/catalogs. **High.**
- **S2.6** Vitest `projects` accepts globs (`'packages/*'`). Each folder becomes a project, named after its `package.json` `name`.
  - Each project can have its own `vitest.config` (via `defineProject`) or an inline config.
  - `process.cwd()` stays at the root.
  - Source: https://vitest.dev/guide/projects. **High.**
- **S2.7** Vite+ lint and format run from the root with **root config plus `overrides` keyed to workspace paths**. Nested `lint` and `fmt` blocks are not applied per file, and package-level blocks are not recommended.
  - Package `vite.config.ts` files can still hold Vite and Vitest config.
  - `vp run -r`, `--filter` and `dependsOn: [{ task, from: 'dependencies' }]` follow `package.json` workspace dependencies.
  - Tasks in `vite.config.ts` are cached by default. `cache.input` globs are relative to the package unless `base: 'workspace'` is set.
  - Sources: https://viteplus.dev/guide/monorepo, https://viteplus.dev/guide/run, https://viteplus.dev/config/run. **High.**
- **S2.8** Node.js refuses to type-strip TypeScript files under any `node_modules` path, and ignores `tsconfig` `paths`.
  - Source: https://nodejs.org/api/typescript.html#type-stripping-in-dependencies. **High.**
- **S2.9** tsdown (behind `vp pack`) treats `dependencies`, `peerDependencies` and `optionalDependencies` as **external**. It bundles `devDependencies` only when they are imported.
  - `deps.alwaysBundle` overrides this.
  - Source: https://tsdown.dev/options/dependencies. **High.**
- **S2.10** `pnpm deploy` copies workspace dependencies into an isolated `node_modules`, ignores the global virtual store, and drops `devDependencies` with `--prod`.
  - Source: https://pnpm.io/cli/deploy. **High.**
- **S2.11** Windows pitfalls:
  - pnpm falls back to **junctions** when it cannot symlink (no Developer Mode). Source: https://pnpm.io/faq. **High.**
  - Vitest loaded a second runtime when the drive-letter case differed (`c:` vs `C:`); a fix was merged in 2026. Source: https://github.com/vitest-dev/vitest/pull/10843. **Med**: which release carries the fix is **[?]**.
  - Workspace-linked packages bypass Vitest's `__mocks__` convention. Source: https://github.com/vitest-dev/vitest/issues/7708. **Med**.
  - The repo already has its own Windows path bug: G-036, a POSIX path assertion.

**Inference [R], not verified here.**

- Wildcard exports such as `"./*": "./src/*.ts"` map to exactly one extension.
- So a package that mixes `.ts` and `.tsx` needs per-folder patterns (`"./components/*": "./src/components/*.tsx"`) or explicit entries.
- I did not test whether TypeScript or Vite treat array targets as file-existence fallbacks.

### Q3. Where Convex lives in a monorepo

- **S3.1** `convex.json` must sit at the project root, "in the same directory as your `package.json`". Its `functions` field relocates the folder, for example to `src/convex/`.
  - Source: https://docs.convex.dev/production/project-configuration. **High.**
- **S3.2** Commit `convex/_generated/`, so code type-checks without running `convex dev` or `convex codegen`.
  - Source: https://docs.convex.dev/understanding/best-practices/other-recommendations. **High.**
- **S3.3** The official Convex monorepo template uses `apps/web`, `apps/native` and `packages/backend`, with the backend package named `@packages/backend`.
  - `convex/` sits at the package root. No `convex.json` is used, and the default folder name applies.
  - The package has no `exports` map, so consumers deep-import `@packages/backend/convex/_generated/api`.
  - The CLI writes `packages/backend/.env.local`, and its `CONVEX_URL` is copied by hand into each app's env.
  - Deployment runs `convex deploy --cmd 'cd ../../apps/web && pnpm build'` from the backend package.
  - Sources: https://github.com/get-convex/turbo-expo-nextjs-clerk-convex-monorepo (README, `packages/backend/package.json`); DeepWiki on the import path. **High.**
  - The template's root `.gitignore` does not list `_generated`. DeepWiki claims it is excluded from version control. That conflicts with S3.2 and is unresolved (**[?]**).
- **S3.4** The Convex Stack article describes the backend as "a shared package. Both apps depend on it."
  - Source: https://stack.convex.dev/tables-convex-modules-rest-apis. **Med** (community article on the official blog).
- **[?]** I did not verify whether Convex's bundler handles imports of a TS-source workspace package from inside `convex/`, for example sharing `MAX_RECORDS` from domain (G-023). Plausible, since Convex bundles with esbuild, but untested.

### Q4. Enforcing boundaries between packages, and what carries over to oxlint

- **S4.1** Nx `@nx/enforce-module-boundaries` uses project tags (`scope:*`, `type:*`) and `depConstraints`. It checks imports and `package.json` deps, and has ESLint and **Oxlint** variants.
  - The Oxlint variant is `@nx/oxlint/boundaries-plugin` and is marked **experimental**, because the Oxlint JS-plugin API sits outside oxlint semver.
  - It needs the Nx project graph.
  - Source: https://nx.dev/docs/features/enforce-module-boundaries. **High.**
- **S4.2** `turbo boundaries` (experimental) flags imports of files outside the package's directory, and of packages not declared in `package.json`. It also supports tag allow and deny rules, applied transitively.
  - Source: https://turborepo.com/docs/reference/boundaries. **High.**
- **S4.3** `eslint-plugin-boundaries` runs under oxlint `jsPlugins` (tested on oxlint 1.88). It needs an explicit `import/resolver` setting, otherwise path aliases are silently treated as external.
  - Sources: https://www.jsboundaries.dev/docs/guides/oxlint-integration/, https://github.com/oxc-project/oxc/discussions/20245. **High.**
- **S4.4** Oxlint native import rules:
  - implemented: `no-restricted-imports`, `import/no-cycle`, `import/no-relative-parent-imports`;
  - not implemented: `import/no-extraneous-dependencies` (PR #15703 closed 2026-05 over performance), `import/no-relative-packages` and `import/no-restricted-paths`;
  - won't implement: `import/no-internal-modules`, deferred to `no-restricted-imports`.
  - Sources: https://github.com/oxc-project/oxc/issues/1117, https://github.com/oxc-project/oxc/pull/15703. **High.**
- **S4.5** "package.json deps as the boundary": pnpm links only declared workspace deps (S2.4).
  - Under the repo's isolated, global virtual store (F12), an undeclared bare import of a sibling package fails to resolve.
  - This is the strongest boundary and costs nothing.
  - **Caveat [R]:** it only governs what a _package_ may import outward. Code inside one app (features vs implementations) still needs lint rules. Relative-path escapes (`../../src/core`) and `@/*` aliases that cross a package bypass it.
- **[?]** dependency-cruiser was not researched: no source was fetched. It is a standalone, linter-independent option.

### Q5. Plugins: one package, folders in the app, or several packages

There is no direct external source for this question. The analysis below combines S1.3/S1.4 (Nx library types), S2.1 (JIT packages), S4.5 and D2/Q5.

**Observation.** Plugin implementations have the shape of a "feature or data-access" library that is _not_ app-specific:

- they import only contracts, `core`, `ui` and `utils` (F3);
- none touch the router or the app.

This is what makes extraction cheap.

---

## 4. Options compared

### 4.1 Plugin packaging (Q5)

The model is several implementations included at build time and one selected at runtime (Q5, D3). D2 requires no package per plugin.

| Option                                                                                                                                         | Boundary enforced by                                                                                                                                                                            | Cost                                                                                                                                                 | Fit with D2/D3                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1. Folders in the app** (as today, `apps/web/src/plugins`)                                                                                  | `no-restricted-imports` only                                                                                                                                                                    | Lowest; one path re-key                                                                                                                              | OK, but G-009 stays: contracts and vendor code share a folder, and only lint stops `features → implementation`.                                                                                               |
| **P2. One `packages/plugins`** (contracts + registry + all implementations; folders per kind: `widgets/`, `datasources/`, `record-providers/`) | Package deps: it cannot import the app, shell or features. Subpath `exports` make the public surface explicit (`./contracts/*`, `./widgets/*` …). Lint keeps contracts free of implementations. | Medium: one `package.json`, `exports`, and one Vitest project. Its dependency list is the union of all vendors (ECharts, Mantine charts, AWS SDK …). | **Good.** Satisfies D2 (internal folders, one package). Build-time inclusion is unchanged: the app imports what it lists, and `virtual:optional-plugins` stays in the app (F8 already confines it to `app/`). |
| **P3. Two packages: `plugin-api` (contracts, registry, `connectionDatasource`) + `plugins` (implementations)**                                 | Package deps also stop _implementations_ from being imported by the contracts. `plugins` depends on `plugin-api`.                                                                               | Medium-high: two packages, and features need both deps.                                                                                              | Good, and the strongest version of G-009's fix. But `features` live in the app, which depends on both packages, so package deps still cannot stop `features → implementation`. That still needs a lint rule.  |
| **P4. Package per plugin or vendor**                                                                                                           | Per-vendor deps                                                                                                                                                                                 | High: about 12 packages                                                                                                                              | **Violates D2.**                                                                                                                                                                                              |

### 4.2 Candidate trees (Q6)

Common to every option [R]:

- workspace globs `apps/*` and `packages/*`, plus `tooling/*` if lint becomes a package;
- scope `@repo/` (S1.1) or a project scope;
- kebab-case folder names;
- root `vite.config.ts` keeps `lint`, `fmt`, `staged` and the `run.tasks` checks (S2.7);
- `pnpm-workspace.yaml` keeps every supply-chain setting (F12);
- the catalog grows to cover React, Mantine, zod and TanStack, so versions stay single (S2.5).

#### Option A — "App moves, only `domain` is extracted" (minimal)

```text
apps/
  web/            SPA: index.html, vite.config.ts, public/, plugins.json, src/{app,features,shell,lib,plugins,ui,utils,testing}
  relay/          was relay/
packages/
  domain/         was src/core (minus core/build → apps/web); exports ./data/*, ./errors/*, ./records/*, ./relay/*, ./time/*, ./crypto/*, ./dashboard/*
  convex/         was convex/ (convex/ folder at package root; exports ./api, ./data-model)
tooling/
  oxlint-plugin/  was lint/ (path-loaded, no package needed)
docs/catalog/     was apps/docs (not a workspace member)
```

- Fixes G-012: relay imports `@repo/domain`. Fixes G-033 and G-021 (`core/build` leaves). Gives Convex a real home.
- Leaves G-009 (plugins), and the `ui`/`lib` grab-bags, to lint.

#### Option B — "Domain, UI and plugins are packages; app keeps everything router-bound" (recommended)

```text
apps/
  web/                    the only app; everything that touches the router or composes the app
    src/
      app/                bootstrap, providers, router, routes/ (routesDirectory stays src/app/routes)
      shell/              router-bound (F4) → stays in the app
      features/           app-specific (S1.4) and use typed links → stay in the app
      platform/           was lib/ (storage, vault, notify, sentry, active record provider)
      testing/
    plugins.json, plugins.config.ts, vite.config.ts, index.html, public/
  relay/
packages/
  domain/                 was src/core (+ src/utils if kept); framework-free; node tests
  ui/                     was src/ui: tokens, theme overrides, global.css, 7 components; jsdom tests + stories
  plugins/                contracts + registry + all implementations (P2), subpath exports
    src/contracts/        WidgetPlugin, DatasourcePlugin, OptionalPlugin, RecordProviderPlugin, registry (toRegistry/usePlugins)
    src/widgets/ src/datasources/ src/record-providers/ src/optional/
  convex/                 Convex functions; depends on nothing app-side; exports ./api
tooling/oxlint-plugin/
docs/catalog/
```

Dependency graph, enforced by `package.json`:

- `web → plugins, ui, domain, convex(types only via plugins)`;
- `plugins → ui, domain, convex`;
- `ui → domain`;
- `relay → domain` (devDependency, bundled);
- `convex → domain` (optional, G-023).

What it fixes:

- G-009, partly: contracts and implementations leave the app, and the package boundary stops plugins from reaching into the app.
- G-012, G-021 and G-033.
- G-019, partly: lint rules can target package _specifiers_ (`@repo/plugins/widgets/*`) instead of file globs.

#### Option C — "Fine-grained, Nx-typed" (maximal)

Option B plus:

- `packages/plugin-api` split from `packages/plugins` (P3);
- `packages/platform` (was `lib/`: data-access type);
- `packages/shell`, which would need a `packages/router` package to carry `Register`, per TanStack S1.6;
- per-feature packages such as `packages/feature-dashboards`.

This follows Nx's types (S1.4) literally. But features are "almost always app-specific" (S1.4), there is one app (Q1), and the router-in-a-package pattern forces compiled or extra packages (S1.6). The result is about 10 packages for one deployable. I do not recommend it now; it remains the growth path for D1.

### 4.3 Comparison table

| Criterion                                  | A                                      | B                                                                                  | C                                           |
| ------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| Packages (excluding apps)                  | 2                                      | 4                                                                                  | about 8–10                                  |
| Fixes G-012 (relay → `src/core` path)      | Yes                                    | Yes                                                                                | Yes                                         |
| Fixes G-009 (contracts mixed with vendors) | No (lint only)                         | Mostly (package + 1 lint rule)                                                     | Yes (package deps)                          |
| Router type-safety cost (S1.6)             | None                                   | None: router-bound code stays in the app                                           | Needs a router package or compiled packages |
| Matches D2 (no package per plugin)         | Yes                                    | Yes                                                                                | Yes, but a split is near the line           |
| Matches D6 (monorepo-like, no grab-bags)   | Partly (`lib`, `ui` remain in the app) | Yes (`lib` → `platform/`, `ui` is a package)                                       | Yes                                         |
| `@/` codemod (F5)                          | Only `@/core` (≈110 files)             | `@/core`, `@/ui`, `@/plugins` (most of the 224); `@/` stays inside `apps/web` only | Nearly all                                  |
| Vitest env by convention (G-019)           | Partly                                 | Yes: one project per package with a default env                                    | Yes                                         |
| Effort / risk                              | S / low                                | M / medium                                                                         | L / high                                    |

---

## 5. Implications for this repo (what each move breaks)

Every move below is path-keyed config, which G-019 says must move in the same commit as the code.

| Thing that breaks                                                                              | A                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | B                                                                                                                                                                                                              | C                              |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **`layer()` globs** (`oxlint.config.ts:94`): `src/${dir}/**` and `lint/fixtures/src/${dir}/**` | Re-key to `apps/web/src/${dir}/**`; the `core` layer becomes `packages/domain/**`                                                                                                                                                                                                                                                                                                                                                                                                | Same, plus `ui` and `plugins` become package-scoped overrides. Bans can be written as specifiers (`@repo/plugins/widgets/**` banned in `apps/web/src/features/**`) instead of paths.                           | Most rules become package deps |
| **Lint fixtures and counts** (`lint/fixtures/src/<layer>`, `lint/rules.test.ts`)               | Mirror the new paths, or drop the fixture mirror (U9)                                                                                                                                                                                                                                                                                                                                                                                                                            | Same                                                                                                                                                                                                           | Same                           |
| **Relay rule** (`oxlint.config.ts:~280`, bans `**/src/<dir>/**`)                               | Replace it with "relay may import only `@repo/domain`" and ban relative parent escapes (`import/no-relative-parent-imports` exists natively, S4.4)                                                                                                                                                                                                                                                                                                                               | Same                                                                                                                                                                                                           | Same                           |
| **`NODE_TESTS`** (`vitest.config.ts:8`)                                                        | Shrinks: `packages/domain` becomes its own `node` project. The rest of the list keeps app paths                                                                                                                                                                                                                                                                                                                                                                                  | **Removed.** `projects: ['apps/*', 'packages/*']`, with a default env per package (`domain` node, `ui` jsdom, `plugins` node plus jsdom by filename or folder). Moving a file no longer flips its env silently | Same as B                      |
| **`convex` Vitest project**                                                                    | Moves to `packages/convex/vitest.config.ts`. `records.test.ts`'s imports of `browserStorageProvider` and `recordProviderSuite` (F7) become `@repo/domain/testing/*` (the suite is a contract test) plus a devDep, or the cross-provider test moves into `plugins`                                                                                                                                                                                                                | Same                                                                                                                                                                                                           | Same                           |
| **Route dir** (F10)                                                                            | Unchanged _inside_ `apps/web` (`src/app/routes`) when `vite.config.ts` moves with the app                                                                                                                                                                                                                                                                                                                                                                                        | Same                                                                                                                                                                                                           | Same                           |
| **Relay Dockerfile** (F6)                                                                      | `COPY packages/domain` (with its `package.json`) **before** `pnpm deploy`, and drop `COPY src/core`. Relay must list `@repo/domain` in **devDependencies**, or set `alwaysBundle`: tsdown externalises `dependencies` (S2.9), and Node won't type-strip `.ts` under `node_modules` (S2.8), so a `dependencies` entry breaks the image at runtime                                                                                                                                 | Same                                                                                                                                                                                                           | Same                           |
| **Convex** (F7)                                                                                | `packages/convex/`: `convex/` at the package root, so no `convex.json` is needed (S3.1). `convex dev` and `convex deploy` run with the package as cwd (`vp run @repo/convex#dev`). `.env.local` is written there, while the app reads `VITE_CONVEX_URL` from `apps/web` (copied by hand, as in S3.3). `convexProvider.ts`'s 4-level relative import becomes `@repo/convex/api`, which must be in `exports` if an exports map is added (S3.3). Keep `_generated` committed (S3.2) | Same; the plugins package depends on `@repo/convex`                                                                                                                                                            | Same                           |
| **`plugins.json` / build list** (F11, G-030)                                                   | Moves to `apps/web/plugins.json`. `githubBuildList.ts:15` `FILE` must become `apps/web/plugins.json`, because it is a repo-relative GitHub path. The dev middleware path and `plugins.config.ts` move with the app                                                                                                                                                                                                                                                               | Same                                                                                                                                                                                                           | Same                           |
| **Pages workflow**                                                                             | `dist` becomes `apps/web/dist`; build with `vp -C apps/web build` or `defaultPackage` (S1.8)                                                                                                                                                                                                                                                                                                                                                                                     | Same                                                                                                                                                                                                           | Same                           |
| **Env files** **[?]**                                                                          | Vite reads `.env*` from its root, so root `.env.example` and `VITE_*` move to `apps/web` unless `envDir` is set. I did not check whether Sentry plugin env (`SENTRY_*` in the `check:build` cache env) is affected                                                                                                                                                                                                                                                               | Same                                                                                                                                                                                                           | Same                           |
| **`tsconfig.app.json` `@/*`** (F5)                                                             | Stays inside `apps/web`. `@/core/...` becomes `@repo/domain/...`                                                                                                                                                                                                                                                                                                                                                                                                                 | `@/` remains for app-internal code only. Packages use relative imports (as `core` already does, F2) or `#` subpath imports: no `paths` in JIT packages (S2.1)                                                  | Same                           |
| **Root `tsconfig.json` references**                                                            | Add the new packages' tsconfigs. **[?]** I did not verify how tsgolint (type-aware oxlint) picks a tsconfig per file across packages; the current root uses non-composite references and lint is green                                                                                                                                                                                                                                                                           | Same                                                                                                                                                                                                           | Same                           |
| **`.storybook/main.ts` glob, `.stylelintrc.json` overrides, `check:css` glob**                 | Re-key to `apps/web/src/**`                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Add `packages/ui/src/**` and `packages/plugins/src/**`. **[?]** PostCSS and Mantine CSS-module handling for `.css` in a linked package is not verified (S2.3 says it is treated as source)                     | Same                           |
| **`lint/compiler.test.ts`, `lint/toolchain.test.ts`, `plugins.config.test.ts`**                | Hardcoded `src/...` paths, including `src/plugins/widgets/table/FrameTable.tsx`, change. G-036's POSIX assertion should be fixed _before_ the move, as should G-035's dead links                                                                                                                                                                                                                                                                                                 | Same                                                                                                                                                                                                           | Same                           |
| **Dependencies**                                                                               | Split the root `package.json`: app deps go to `apps/web`, and the root keeps only repo tools (S1.2)                                                                                                                                                                                                                                                                                                                                                                              | Vendor SDKs (`echarts`, `@mantine/charts`, AWS …) go to `packages/plugins`                                                                                                                                     | Same                           |

Gap links:

- G-012: fixed by every option.
- G-009: B partly, C fully.
- G-019: B and C replace path globs with package boundaries and per-package Vitest projects.
- G-021: `core/build` moves to `apps/web`; `core/relay` stays in domain as the wire contract, used by relay and plugins.
- G-033: becomes `docs/catalog/`.
- G-008 and G-013: unaffected; they are app-internal (Q11).
- G-020: per-package `check:*` tasks give per-package caches (S2.7). That would stop a `docs/` change from invalidating lint, but **[?]** whether type-aware lint can run per package with the root config is unverified.
- G-018: lower priority per Q1.
- G-030: B keeps the mechanism working, with the new path.

---

## 6. Recommendation [R]

**Adopt Option B as the target, reached through Option A as the first stage** (D5, U10).

1. **Stage 0, before moving anything.**
   - Fix G-035 (dead links) and G-036 (the POSIX path test).
   - Optionally add a tiny rule to `lint/plugin.js` that bans relative imports leaving a package root. oxlint has no `no-relative-packages` (S4.4).
2. **Stage 1, which is Option A.**
   - Turn the root into a workspace root.
   - Move the SPA to `apps/web` and the relay to `apps/relay`.
   - Extract `packages/domain` (JIT, subpath exports, no barrel), and wire relay to it as a bundled devDependency.
   - Move Convex to `packages/convex`.
   - Re-key every path in §5 in the same commit.
   - The "app at root" layout is a migration stage only, not an end state: Vite+ (S1.8), Nx (S1.5) and Turborepo (S1.2) all assume the root is not an app.
3. **Stage 2.**
   - Extract `packages/ui`, then `packages/plugins` (P2).
   - Contracts sit under `src/contracts/`, with an oxlint `no-restricted-imports` rule that stops contracts importing implementations and stops `apps/web/src/features/**` importing `@repo/plugins/{widgets,datasources,record-providers,optional}/**` (today's `features` layer rule, F8, rewritten as specifiers).
   - Rename `lib/` to `platform/` inside the app.
   - Replace `NODE_TESTS` with per-package Vitest projects.
4. **Boundary enforcement** has three layers. Do not add Nx or Turborepo just for this.
   - **Between packages:** `package.json` workspace deps (S4.5). These cost nothing and are already strict under F12.
   - **Inside a package and inside the app:** the existing `no-restricted-imports` `layer()` mechanism, re-keyed (S4.4).
   - **Optional later:** `eslint-plugin-boundaries` under oxlint `jsPlugins` (S4.3), only if the layer config gets unwieldy. `@nx/oxlint` boundaries (S4.1) needs Nx and is experimental.
5. **Packages are Just-in-Time.**
   - `exports` point at `.ts` and `.tsx` source with per-folder subpaths (S2.1, S2.2); no `build` scripts.
   - No `compilerOptions.paths` inside packages (S2.1, S2.8).
   - Not Nx's `composite`/`customConditions` recipe (S2.4): this repo never runs `tsc -b`, and type checking is done by tsgolint.
   - `workspace:*` for internal deps; catalog entries for shared versions (S2.5).

**What would change this recommendation:**

- **A second app appears (Q1 changes).** Then `shell` and the router become candidates for packages. Use TanStack's `router` package pattern (S1.6), and move toward Option C.
- **Vite+ cannot run type-aware lint correctly across packages** with root config (the §5 **[?]**). Then keep `ui` and `plugins` as app folders (P1, Option A as the target) until tooling allows it.
- **G-030 is dropped.** The build-list machinery goes away, `plugins.json` loses its GitHub write path, and the move gets simpler. If it is kept, the repo-relative path must be updated.
- **Convex is dropped or replaced (G-004, Q2).** Then `packages/convex` disappears, or becomes another backend package behind the same `RecordProvider` contract (D4). Its location rule stays the same.
- **The vendor dependency union in `packages/plugins` becomes a problem** (install size, CI time). Then split by kind: `plugins-widgets`, `plugins-datasources` and so on. That still respects D2, since it is not one package per plugin.

## 7. Not verified

- TanStack Start monorepo guidance: none found, and only `examples/react` was listed.
- How tsgolint resolves a tsconfig per file across workspace packages.
- Whether Vite+ `resolve.tsconfigPaths` resolves aliases per file, using the nearest tsconfig.
- Whether wildcard `exports` can fall back between `.ts` and `.tsx`.
- Which Vitest release carries the Windows drive-letter fix.
- PostCSS and Mantine CSS behaviour for linked packages.
- Whether the Convex bundler can import a TS-source workspace package.
- dependency-cruiser: not researched.
- Whether the official Convex monorepo template actually commits `_generated`.
