# Tasks: Sentry, prototype → real

Sep 27, 2026 · v1.1.0 · Reference: [plan-06.md](../plan-06.md)

- [x] **Keep the prototype from affecting the app (done Sep 24, `1cc521f`).** Lazy SDK only with a DSN, Replay privacy defaults, console warn/error only, source maps only when uploaded and then deleted. First load back to 809 KiB, no `.map` files in `dist`.
- [ ] **Report errors from every boundary (no decision needed; [plan-06 work 1](../plan-06.md#work)).**
  - `reportError` drops aborts, `not_found` and `network`.
  - `RouteError` and `WidgetBoundary` (`onError`) report.
  - `QueryCache.onError` reports only in its background-refetch branch; `MutationCache.onError` reports.
  - `notify.error` adds a breadcrumb.
  - Tags: `boundary` plus `route` / `widget` / `source`.
  - Done when a test per boundary checks the `reportError` call and its tags, and a test checks the filter.
- [ ] **Source maps in CI (no decision needed).** Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` secrets to the Pages workflow. Done when a release shows readable stack traces in Sentry and the deployed site has no `.map` files.
- [ ] **Settle the decisions.** Features, DSN source, Integrations as a product feature or a developer tool, and production sample rates ([plan-06 decisions](../plan-06.md#decisions-to-make)). Decision 3 is needed before Plan 04's migration task. Done when the answers are written into plan-06.
- [ ] **Remove what the decisions drop.**
  - Runtime DSN settings, and the `sentry.config.v1` key (deleted on load).
  - Unused wrappers (`metrics` if metrics are off).
  - If Integrations becomes a developer tool: the catalog, the integration registry and its test, the routes and the sidebar entry.
  - Done when no dead exports remain.
- [ ] **Rebuild the Sentry UI.**
  - Status and verification per decision 3, using tokens (Plan 03) and `Page` (Plan 04).
  - Split the verification card into small Mantine parts.
  - Drop the `color="#7553FF"` ThemeIcon wrappers; the logo SVG keeps its own fill.
  - Done when the stories cover not configured / configured / sent, and Plan 03's lint exemption for `features/integrations/**` is removed.
- [ ] **Verify with a real DSN.** Preview build: a widget error, a route error and a failed mutation each arrive once, with tags. A 404 and an offline refetch send nothing. Replay only on error, with text masked. Done when the results are written into plan-06.
