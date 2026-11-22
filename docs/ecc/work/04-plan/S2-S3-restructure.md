# S2–S3 — Restructure (moves and renames only)

Behaviour does not change. Each move re-keys its path-keyed config **in the same commit** (G-019); [workspace-layout.md](../02-research/workspace-layout.md) §5 has the full list. `@<scope>` is the S0 package scope.

## S2 — Workspace (workspace-layout §6 point 2, Option A)

| Step | Move                                                                                                                    | Re-key in the same commit                                                                                                                                                                                                 | Closes       |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| S2.1 | Root becomes the workspace root. SPA moves to `apps/web`. Root `package.json` keeps only repo tools                     | `layer()` globs, `NODE_TESTS` if still present, stylelint and storybook globs, tsconfig references, Pages `dist`, env file location, `plugins.json` path, `githubBuildList.ts:15` `FILE` (both still exist at this point) | —            |
| S2.2 | `relay/` → `apps/relay`                                                                                                 | Dockerfile `COPY`, the relay lint rule                                                                                                                                                                                    | —            |
| S2.3 | `src/core` → `packages/<C2 name>`: JIT, subpath exports. `core/build` stays in the app; `core/relay` goes where C4 says | `@/core` codemod (about 110 files). Relay takes the package as a **devDependency**, bundled. Dockerfile                                                                                                                   | G-012, G-021 |
| S2.4 | `convex/` → `packages/convex`: `convex/` at the package root, `_generated` committed                                    | `convex` Vitest project; `convexProvider.ts` imports `@<scope>/convex/api`; `.env.local` location                                                                                                                         | —            |
| S2.5 | `apps/docs` → `docs/catalog/`                                                                                           | —                                                                                                                                                                                                                         | G-033        |

## S3 — Packages and app folders (workspace-layout §6 point 3; app-structure §5)

The package rows depend on C1–C4. The baseline is workspace-layout Option B.

| Step | Move                                                           | Notes                                                                                                                           | Closes         |
| ---- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| S3.1 | `src/ui` → `packages/ui`                                       | Needs the S1b result on CSS from linked packages                                                                                | —              |
| S3.2 | `src/plugins` → `packages/plugins`. Contracts go where C3 says | Vendor SDKs move into its `package.json`. The existing rule "features may not import implementations" is re-keyed as specifiers | G-009 (partly) |
| S3.3 | `lib/` → `platform/` inside the app                            | Names per the S0 glossary                                                                                                       | G-001 (partly) |
| S3.4 | Group `app/` by job; route directory per C7                    | `recordSync` moves to its feature; `storageCollections` stays in the app (app-structure §5.4)                                   | G-008          |
| S3.5 | Feature folders per C6, plus the collision renames             | app-structure §5.1 and §5.3. URLs change only if S0 says so. Persisted localStorage keys stay unchanged                         | G-001, G-013   |
| S3.6 | Folder names become kebab-case                                 | app-structure §5.3                                                                                                              | —              |

## Exit

- The same tests pass, and the build is equivalent.
- For each step, the `ecc:change-impact` after-diff matches its before-plan.
