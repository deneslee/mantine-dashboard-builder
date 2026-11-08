# R4: TypeScript setup and packages

Reviewed Nov 8, 2026, at `main` commit [`168e45f`](https://github.com/deneslee/mantine-dashboard-builder/tree/168e45f43f83cf0c7c094d4333ec8e6de959e3e9). Read-only review: nothing was installed, linted or built for it.

## In short

The setup is in good shape. Three small fixes can go in one pull request now. The bigger change, a shared base config and `core` as a real package, belongs with the packages phase (P1).

**In plain words:** the rules that check the code are strict and the installed libraries are tidy. A few settings disagree with each other, and the relay borrows code from the app by reaching into its folders instead of using it as a package.

**Already solid:**

- One version of every key package in the lockfile (zod, React, TypeScript, the AWS core).
- New releases wait 24 hours before they install (`minimumReleaseAge`), and install scripts need explicit permission (`allowBuilds`).
- The app's TypeScript checks are strict, and the lint is type-aware (tsgolint).

## Findings

Score = (impact + risk) × (6 − effort), each from 1 to 5. Higher means do it sooner.

| #   | Finding                                 | Impact | Risk | Effort | Score |
| --- | --------------------------------------- | ------ | ---- | ------ | ----- |
| 1   | Test globals leak into app types        | 2      | 3    | 1      | 25    |
| 2   | Node types are newer than Node          | 2      | 3    | 1      | 25    |
| 3   | No shared base tsconfig                 | 3      | 2    | 2      | 20    |
| 4   | Mixed exact and caret versions          | 2      | 2    | 1      | 20    |
| 5   | The relay reaches into `../../src/core` | 3      | 2    | 3      | 15    |
| 6   | Updates waiting, one of them major      | 2      | 2    | 2      | 12    |
| 7   | Untyped JS files                        | 1      | 2    | 2      | 12    |
| 8   | Engine rules contradict each other      | 1      | 1    | 1      | 10    |

### 1. Test globals leak into app types

`tsconfig.app.json` loads `vitest/globals` and `@testing-library/jest-dom/vitest` types for all of `src`, and `vitest.config.ts` sets `globals: true`. So `describe`, `it` and `expect` type-check in production code too.

69 of the 71 tests already import from `vite-plus/test`. Only `src/ui/components/SplitView/splitViewLayout.test.ts` and `src/ui/components/Surface/surfaceLevel.test.ts` rely on globals.

**Look at:** importing in those two, then dropping `globals: true` and the two test type entries. `src/testing/setup.ts` already imports jest-dom, which is enough for its matchers.

### 2. Node types are newer than Node

`@types/node` is `^26.6.5` in the root and `26.6.5` in `relay/`. The runtime is Node 24: `engines` asks for `>=24.15.0`, the relay's Dockerfile uses `node:24.22.1-alpine` and `.nvmrc` says `24`. Code can use Node 26-only features that type-check but fail at runtime, which matters most for the relay.

**Look at:** `@types/node@^24` in both packages.

### 3. No shared base tsconfig

The three configs (`tsconfig.app.json`, `tsconfig.node.json`, `relay/tsconfig.json`) each copy their options and have drifted:

| Option                          | app | node | relay |
| ------------------------------- | --- | ---- | ----- |
| `noUncheckedIndexedAccess`      | yes | no   | yes   |
| `noUnusedLocals` / `Parameters` | yes | no   | yes   |
| `noFallthroughCasesInSwitch`    | yes | no   | no    |
| `noUncheckedSideEffectImports`  | yes | no   | no    |
| `@/*` alias                     | yes | no   | no    |

The root `tsconfig.json` only holds references, without the alias. Tools that read the root config alone miss the alias: the Floorplan scan resolved 517 imports instead of 1,004 until the alias was added for the scan.

**Look at:** a `tsconfig.base.json` with the shared strict options and the alias, extended by all three, and whether the root should carry the alias for such tools.

### 4. Mixed exact and caret versions

`pnpm-workspace.yaml` sets `saveExact: true`, but about 40 entries in `package.json` use `^` ranges, even within one family (`@fontsource-variable/jetbrains-mono` has `^`, its three siblings are exact). The lockfile keeps installs stable, so this is about a clear policy for Renovate and `pnpm up`.

**Look at:** one style for all, probably exact, since that's what the workspace asks for.

### 5. The relay reaches into `../../src/core`

The relay imports `../../src/core/...`. Core isn't a package, so `relay/Dockerfile` copies `src/core` in by hand, and the relay's own zod and the root's resolve separately. The layering is already right; the boundary just isn't a package yet.

**Look at:** `core` as a workspace package with `exports`, as part of P1, so the relay depends on it by name.

### 6. Updates waiting, one of them major

Latest on npm on Nov 8, 2026:

| Package         | In use  | Latest  | Kind  |
| --------------- | ------- | ------- | ----- |
| `@sentry/react` | 10.75.2 | 11.11.0 | major |
| `vite-plus`     | 1.4.0   | 1.5.0   | minor |
| `storybook`     | 10.6.4  | 10.6.6  | patch |
| `@mantine/core` | 9.7.4   | 9.7.5   | patch |

Renovate will open the small ones. Sentry 11 needs a look at its migration notes, together with `@sentry/vite-plugin`.

### 7. Untyped JS files

`lint/plugin.js`, `apps/docs/catalog/schema.mjs`, `apps/docs/scripts/generate-catalog.mjs` and `.agents/planning/current.mjs` get no type checking.

**Look at:** `// @ts-check` in each, or `checkJs` in the node config.

### 8. Engine rules contradict each other

`devEngines` says `onFail: warn`, while `pnpm-workspace.yaml` sets `pmOnFail: error` and `runtimeOnFail: error`. `.nvmrc` says `24`, while `engines` asks for `>=24.15.0`.

**Look at:** one answer for warn or error, and an `.nvmrc` that matches the pin.

## Order of work

1. **Now, one small pull request:** findings 1, 2 and 8.
2. **With the packages phase (P1):** findings 3 and 5 together. The base config is the first step before `core` moves out.
3. **Ongoing:** findings 4, 6 and 7, with Renovate and the next dependency pass.

These are directions, not decisions: each gets its specifics when it's picked up.
