# Target structure: today and the proposed options

**What this is.** The proposed repo layouts, side by side, so you can compare them. Every tree below is a **proposal** taken from [research/workspace-layout.md](research/workspace-layout.md) and [research/app-structure.md](research/app-structure.md). Nothing here is decided.

**Decided by:** [ADR-0003](../adr/0003-target-workspace-layout.md) (layout), [ADR-0004](../adr/0004-package-set-and-names.md) (package set and names), [ADR-0005](../adr/0005-app-folder-organisation.md) (folders inside the app), [ADR-0013](../adr/0013-urls-and-package-scope.md) (package scope).

ECC's `brownfield-retrospective` skill calls this document `target-design.md`: the target shape, the fix sequence and a "what does not change" list.

## Today (verified, 2026-11-22)

```text
/                     root package.json = the SPA "dashboard-builder"
├── src/              app, core, features, lib, plugins, shell, testing, ui, utils, main.tsx
├── relay/            "dashboard-relay"; imports src/core by relative path
├── convex/           Convex backend; _generated is committed; no convex.json
├── apps/docs/        capability catalog (unverified, see research/carry-over.md)
├── lint/  scripts/  public/  docs/
└── pnpm-workspace.yaml   lists only relay
```

The evidence is in [research/workspace-layout.md](research/workspace-layout.md) "Repo facts". `relay/src` imports `src/core` 16 times across 7 files, and `relay/Dockerfile` copies `src/core`.

## ADR-0003 layout options

### (a) Apps first, then packages (the research recommends this)

```text
apps/
├── web/              today's src/ (app, features, shell stay here)
└── relay/            today's relay/
packages/
└── …                 the set is ADR-0004 (see below)
```

Order: move the apps first, which is moves only, then extract the packages one at a time.

**What moves:** `src/` goes to `apps/web/src/` and `relay/` to `apps/relay/`. Convex becomes a package (ADR-0004).

**What must be re-keyed** (from workspace-layout):

- the `NODE_TESTS` globs (`vitest.config.ts:8-20`);
- the routes directory (`vite.config.ts:109-110`);
- the `plugins.json` path (`githubBuildList.ts:15`);
- the Pages `dist` path (`github-pages.yaml:47-49`);
- the `layer()` lint keys (`oxlint.config.ts:94-107`);
- the relay Dockerfile (`relay/Dockerfile:9,12-15`).

### (b) Apps only, no shared packages yet

```text
apps/
├── web/
└── relay/            still imports web's core through a relative path, or a copy (open)
```

**Open:** the research does not say how the relay would reach `core` without a package.

### (c) Keep today's single package

The tree is the one under "Today". Only the in-app folder changes (ADR-0005) apply.

## ADR-0004 package-set options (they apply only if ADR-0003 is (a))

| Option | `packages/`                                                                      | Source                                                       |
| ------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| (a)    | `domain`, `ui`, `plugins`, `convex`                                              | [workspace-layout](research/workspace-layout.md) "Proposals" |
| (b)    | `core`, `ui`, `shell`, `platform`, `plugin-api`, `relay-contract` (Convex: open) | [app-structure](research/app-structure.md) "Proposals"       |

The two research files disagree, so ADR-0004 needs one `ecc:council` run. Still open in both:

- `plugins` as one package or one per kind;
- where `src/utils` and `core/build` go;
- the package scope (ADR-0013).

## Inside `apps/web/src` (ADR-0005, proposal)

```text
apps/web/src/
├── routes/           moved from src/app/routes (TanStack default), thin route files
├── features/<name>/  api/ components/ hooks/ stores/ utils/
├── shell/  app/      app composition (storageCollections stays here)
```

The proposed renames (ADR-0005, ADR-0018) are:

- `features/datasources` to `features/connections`;
- `features/storage` to `record-storage`;
- "place" to record provider.

## What does not change (proposal)

- **Behaviour.** The move phase is moves only: the checks must pass before and after (ADR-0001).
- **Packages are not published.** This is your answer A-1.
- **Storage keys in the browser**, until a renaming step is approved. They are listed in [research/baseline-audit.md](research/baseline-audit.md#browser-storage-keys).
