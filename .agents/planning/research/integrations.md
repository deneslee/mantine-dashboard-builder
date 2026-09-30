# Integrations: feature flags or a registry

Sep 29, 2026 · revised Sep 30 · Outcome: option B, adopted in [roadmap › Integrations](../roadmap.md#locked-decisions) and [06 Sentry](../plans/06-sentry.md)

**Question.** Can Sentry, Datadog, Haystack, Azure SQL, New Relic, AWS and the like be feature flags, switched on through a central service, so the app stays as light as possible and a fresh install only reads local files?

**Answer.** Make them integrations, not flags. What keeps the app light is that each integration is its own chunk, loaded with `import()` only when it's enabled. A flag guarding that `import()` would save the same bytes; the reason not to use a flag service is that which integrations a deployment has is long-lived configuration, not a rollout or an experiment, and a service adds an SDK and a server. Sentry already works that way since `1cc521f` (first-load JS from 1085 to 809 KiB).

## Flags and plugins are different tools

- **Grafana has both.** Feature toggles turn features on or off, mostly to try new functionality before it's generally available. Plugins are separate: the frontend fetches a plugin's `module.js` only when a dashboard or screen needs it.
- **Flag types.** Pete Hodgson's taxonomy has release, experiment, ops and permissioning toggles, each with its own expected lifespan. "Which integrations this install has" is none of them: it's long-lived configuration, set per deployment.
- **Cost.** A flag service adds an SDK to first load and a server to run (self-hosted Unleash or Flagsmith need PostgreSQL). That works against the goal.

## How others do it

| Product   | Unit                                            | Turned on by                               | Loaded                                          | Note                                                                   |
| --------- | ----------------------------------------------- | ------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------- |
| Grafana   | Plugin: `plugin.json` + `module.js`             | Installing it                              | `module.js` fetched when a screen needs it      | Feature toggles are a separate mechanism                               |
| Redash    | Query runner                                    | An env var listing the non-default runners | Server start                                    | The Python runner is off by default for security                       |
| Metabase  | Driver JAR in the plugins directory             | The file being there (`MB_PLUGINS_DIR`)    | Lazily: a driver initializes on first connect   | Community drivers aren't offered on Metabase Cloud                     |
| Backstage | Extension                                       | `app.extensions` in `app-config.yaml`      | Bundled; module federation remotes are optional | Every extension can be disabled or configured without code changes     |
| Perses    | Plugin module: an archive with frontend+backend | Installing it on the server                | The UI loads it through module federation       | Plugins run independently of the main code                             |
| ToolJet   | Marketplace plugin (a datasource)               | An Install button in the UI                | —                                               | The list is `plugins.json` on the server; removing one means a rebuild |
| Kibana    | Plugin                                          | `<plugin>.enabled` in `kibana.yml`         | Server start                                    | Disabling one also disables the plugins that depend on it              |

Closest to "local files only by default": Redash (an explicit opt-in list) and Metabase (nothing initialized until first use). ToolJet shows that an Install button can be UI over code that's already in the build.

## Options

| Option                                          | Chosen when                 | The browser downloads                    | Adding an integration | Like                                                |
| ----------------------------------------------- | --------------------------- | ---------------------------------------- | --------------------- | --------------------------------------------------- |
| A. Build-time list                              | `vite build`                | Only what was built in                   | Code and a rebuild    | Compile-time flags                                  |
| B. Static registry, lazy chunks, runtime config | At load, from config        | Only enabled chunks                      | Code and a rebuild    | Grafana core, Metabase, Redash, ToolJet             |
| C. Runtime plugins                              | At load, from a server      | Only enabled remotes                     | No app rebuild        | Perses, Backstage remotes, Grafana external plugins |
| D. Flag service                                 | At load, from a flag server | The flag SDK always, plus enabled chunks | As B                  | Unleash, GrowthBook, Flagsmith                      |

In B, adding a new integration needs code, but enabling one that exists doesn't: the same build serves any config.

**A. Build-time list.** Something like `VITE_INTEGRATIONS=sentry,datadog`. Vite replaces `import.meta.env` constants at build time, so the disabled branches are tree-shaken. Smallest `dist`, but one build per setup, and nothing can be turned on after a deploy.

**B. Static registry, lazy chunks, runtime config (chosen).**

- Every integration is compiled in, each in its own chunk.
- A config port says which are enabled: a JSON file now, the API from phase 5.
- The default config enables nothing, so a fresh install has only the built-in datasources.
- Disabled integrations' config, runtime and setup chunks are never fetched. Their manifests add a little to first load, which a bundle budget keeps in check.
- It's the widget and datasource registries (static maps in `app/registry.ts`, [05](../plans/done/05-dashboard-read.md)) one step further.

**C. Runtime plugins.** Only worth it if third parties write integrations. The costs:

- Shared dependencies (React, Mantine, the design system, TanStack) must be single copies at compatible versions. Grafana warns that a plugin's shared dependencies are replaced by the host's versions at runtime, which can crash a plugin that relies on APIs the host lacks. Perses hit a bug where non-overlapping version ranges made module federation load a second copy of `@perses-dev/plugin-system`, with its own React context.
- Outside code runs inside the app.
- The Vite route, if it's ever needed, is `@module-federation/vite`.

**D. Flag service.** The right tool for gradual rollouts, experiments and kill switches, not for install state. If flags are ever wanted, OpenFeature's React SDK can run on its in-memory provider with no server, and a real provider can be swapped in later.

## The chosen design

### Two kinds of integration

- **Datasource:** feeds widgets through the datasource registry. Azure SQL, Datadog metrics, AWS, Haystack, New Relic.
- **Telemetry:** reports on the app itself. Sentry, Datadog RUM, New Relic Browser.
- Datadog and New Relic can be both, so an entry declares what it provides rather than being one kind.
- The built-in datasources (`local-json`, `mock`, and `csv` from phase 4) aren't integrations: they're always there.

### Manifest

```ts
IntegrationManifest {
  id: 'sentry', name, icon,
  category: 'monitoring',                         // groups the catalog
  provides: ['telemetry'],                        // or ['datasource'], or both
  loadConfig: () => import('…/sentry/config'),    // zod schema; only for enabled entries and the Setup page
  loadRuntime: () => import('…/sentry/runtime'),  // own chunk, only if enabled
  loadSetup: () => import('…/sentry/Setup'),      // the page at /integrations/<id>
}
```

- Only the manifest is imported statically, from `app/registry.ts`, next to widgets and datasources. A static import of the config schema would pull it, and whatever it imports, into first load.
- At startup: validate the config file's outer shape, find the enabled ids, load and run only their config validators, then load their runtimes.
- `features/integrations` (the catalog) never imports an integration, the same way `features/dashboards` never imports a widget.
- `category` comes from TanStack's add-on manifest. Its `dependsOn` and `conflicts` wait until an integration needs them.

### Config

```jsonc
// public/config/integrations.json, the default
{ "version": 1, "enabled": {} }

// with Sentry on
{ "version": 1, "enabled": { "sentry": { "dsn": "https://…", "tracesSampleRate": 0.1 } } }
```

- Read at load through an `IntegrationConfigRepository` port, the JSON file now, the API from phase 5. (`DashboardRepository`, its model, was replaced by a plain module in 08; add the interface only when a second source exists.)
- Versioned and validated with zod. An entry that fails its config schema stays off, and its Setup page shows why.
- The repo ships the default. A deployment supplies its own: on GitHub Pages, the workflow can write `dist/config/integrations.json` from a repository variable.

### Loading

- **Telemetry:** `loadRuntime()` starts from `main.tsx` once the config is read, without blocking the first render. Reports made before it's ready are buffered ([06 §1](../plans/06-sentry.md#1-report-errors-through-reporterror)).
- **Datasource:** the runtime chunk loads when a widget first queries that type, or when the datasource manager (phase 4) opens its editor.
- **Disabled:** none of its chunks are fetched. The catalog lists it with a Set up link.

### Secrets

- Datasource integrations with keys (Azure SQL, AWS, the Datadog API) keep them in the backend proxy (phase 6). The browser config only says the integration is on.
- Keys made for browsers (a Sentry DSN, a Datadog RUM client token) can live in the browser config.
- The Sentry DSN comes from this config: not from `localStorage`, where anyone could point the app's telemetry elsewhere, and not from build-time env, which needs one build per deployment. This settles 06's decision 2.

### Who changes the config

- Until phase 5, the file is the only way. The catalog is read-only and shows the snippet to add.
- From phase 5 the config comes from the API. Letting Setup pages save it needs a decision on who may, since there's no auth yet.

### Later: runtime plugins

If third-party integrations become a goal, an entry's `load()` can resolve a module federation remote instead of a local chunk (option C), and nothing that calls it changes.

## Sources

- [Grafana: Configure feature toggles](https://Grafana.com/docs/grafana/next/setup-grafana/configure-grafana/feature-toggles/)
- [Grafana: Life cycle of a plugin](https://grafana.com/developers/plugin-tools/key-concepts/plugin-lifecycle)
- [Grafana: Plugin best practices](https://grafana.com/developers/plugin-tools/key-concepts/best-practices)
- [Martin Fowler: Feature Flag](https://martinfowler.com/bliki/FeatureFlag.html)
- [Redash: Environment variables](https://redash.io/help-onpremise/setup/settings-environment-variables.html)
- [Redash: Python query runner](https://redash.io/help/data-sources/querying/python/)
- [Metabase: Packaging a driver](https://github.com/metabase/metabase/wiki/Writing-a-Driver:-Packaging-a-Driver-&-Metabase-Plugin-Basics)
- [Metabase: Community drivers](https://github.com/metabase/metabase/blob/master/docs/developers-guide/community-drivers.md)
- [Backstage: Dynamic config](https://backstage.io/docs/next/golden-path/plugins/frontend/dynamic-config/)
- [Backstage: Module federation](https://backstage.io/docs/frontend-system/building-apps/module-federation)
- [Perses: Creating a plugin](https://perses.dev/perses/docs/plugins/creation/)
- [Perses: v0.51.0 plugin system](https://perses.dev/blog/2025/06/06/release-v0510/)
- [perses/shared PR #217](https://github.com/perses/shared/pull/217)
- [ToolJet: Marketplace overview](https://github.com/ToolJet/Tooljet/blob/develop/docs/versioned_docs/version-2.6.0/marketplace/marketplace_overview.md)
- [ToolJet: Marketplace plugins.json](https://github.com/ToolJet/Tooljet/blob/develop/docs/versioned_docs/version-1.x.x/marketplace.md)
- [Kibana issue #172873](https://github.com/elastic/kibana/issues/172873)
- [Vite: Env variables and modes](https://vite.dev/guide/env-and-mode)
- [@module-federation/vite](https://www.npmjs.com/package/@module-federation/vite)
- [GO Feature Flag: Open-source flag tools 2026](https://gofeatureflag.org/blog/best-opensource-feature-flag-tools)
- [OpenFeature React SDK](https://openfeature.dev/docs/reference/technologies/client/web/react/)
