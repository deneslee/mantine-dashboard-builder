# Research: Project Structure (bulletproof-react, adapted)

Sep 24, 2026 · Reference: [plan-05.md](../plan-05.md)

---

## 1. bulletproof-react (current docs)

Sources:
- https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md
- https://github.com/alan2207/bulletproof-react/blob/master/AGENTS.md

```
src/
  app/          routes/, app.tsx, provider.tsx, router.tsx: the application layer
  assets/
  components/   shared components
  config/       global config, env
  features/     feature modules: api/ assets/ components/ hooks/ stores/ types/ utils/ (only the ones needed)
  hooks/        shared hooks
  lib/          preconfigured libraries
  stores/       global stores
  testing/      test utilities and mocks
  types/        shared types
  utils/        shared utilities
```

**Rules:**
1. **No imports across features.** Compose features in the app layer.
2. **Imports go one way:** shared (`components`, `hooks`, `lib`, `types`, `utils`) → `features` → `app`. Enforced with `import/no-restricted-paths` zones.
3. **No barrel files (changed from earlier versions):** *"In the past, it was recommended to use barrel files to export all the files from a feature. However, it can cause issues for Vite to do tree shaking and can lead to performance issues. Therefore, it is recommended to import the files directly."*

Rule 3 is exactly the cause of the 620 kB entry chunk found in Plan 01: the loader imports `dashboardQuery` through `features/dashboards/index.ts`, which drags in the grid and its CSS.

Feature-Sliced Design is **not** used (per the user). bulletproof-react has fewer layers and no slice or segment naming rules.

## 2. Current structure (Sep 24, 2026)

```
src/
  app/            App, Providers, router, queryClient, global.css
  design-system/  tokens, theme, components/Page, index.ts
  shared/         config.ts, errors/AppError, user/ ; hooks/ types/ utils/ are EMPTY folders
  features/       dashboards, debug, errors, loading, notifications, settings, shell (each with index.ts)
  routes/         TanStack file routes
  test/           render, setup, storyRouter
```

Imports between features, measured with a grep of `@/features/*` inside `src/features/*`:

| From | To |
|---|---|
| dashboards | errors, loading, notifications, shell |
| debug | errors, loading, notifications |
| settings | notifications, shell ×3 |
| shell | loading, **notifications** |
| notifications | **shell** (type `ContextTab`) |
| app | errors, loading, notifications |

**Findings:**
* **An import cycle:** `shell ↔ notifications`. The shell hard-codes `notificationsTab` (`useContextTabs.ts`), and notifications imports the `ContextTab` type from the shell.
* **Features that aren't features:** `errors` and `loading` are shared UI that 4–5 modules use, so they belong in the shared layer. `notify` and the inbox store are used by the query client, settings, dashboards and debug, which also makes them shared. Only the inbox *UI* is feature-specific.
* **App chrome:** `shell` works as app chrome: features read its hooks (`useSidebar`, `useShellActions`) and its `ContextTab` type. That places it in the shared layer too, provided it stops importing features.
* **`shared/`** mixes what bulletproof splits into `lib/` (errors, user), `config/` and `types/`/`utils/`/`hooks/` (empty for now).

## 3. Enforcement options
* **oxlint `no-restricted-imports` with overrides by folder:** works for "shared must not import `@/features/*` or `@/app/*`". It can't express "a feature may import itself but not other features" when both use the `@/features/` alias. Workaround: forbid the `@/features/**` alias inside features, so imports within a feature must be relative.
* **dependency-cruiser:** path rules with captured groups (`from: ^src/features/([^/]+)/`, `to: ^src/features/(?!$1)`) express "no imports across features" exactly, catch relative `../../` escapes, and detect cycles (`no-circular`). A good fit for CI as the authoritative check; oxlint gives fast feedback in the editor.

## 4. Config paths that must follow a move
* `vite.config.ts`: `tanstackRouter({ routesDirectory: 'src/routes' })`, and `generatedRouteTree` if routes move
* `vitest.config.ts`: `setupFiles: ['./src/test/setup.ts']`
* `.storybook/main.ts`: `../src/**/*.stories.@(ts|tsx)` (no change needed)
* `tsconfig.app.json`: `@/* → ./src/*` (no change needed)
* `oxlint.config.ts`: override globs (`src/design-system/**`, `src/test/**`, `src/routes/**/*.tsx`) and `allowExportNames`
* `.stylelintrc.json`: `ignoreFiles` for the tokens folder
* `AGENTS.md` › Structure, and `docs/*.md` path references
