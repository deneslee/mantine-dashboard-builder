# Tasks: Sentry, prototype → real

Sep 24, 2026 · v1.0.0 · Reference: [plan-06.md](../plan-06.md)

- [x] **Keep the prototype from affecting the app (done Sep 24, `1cc521f`).** Lazy SDK only with a DSN, Replay privacy defaults, console warn/error only, source maps only when uploaded and then deleted. Done: first load back to 809 KiB, no `.map` files in `dist`.
- [ ] **Settle the decisions.** Features, DSN source, Integrations as a product feature or a developer tool, production sample rates ([plan-06 decisions](../plan-06.md#decisions-to-make-first)). Done when the answers are written into plan-06 (v1.1).
- [ ] **Report errors from every boundary.** `RouteError`, `WidgetBoundary`, `QueryCache` / `MutationCache` `onError` and `notify.error` through `reportError`, with tags. Done when a test for each checks the `reportError` call and its tags.
- [ ] **Rebuild the Sentry UI.** Status and verification per decision 3, using tokens (Plan 03) and `Page` (Plan 04); split the verification card into small Mantine parts. Done when the stories cover not configured / configured / sent, and the Plan 03 lint exemption for `features/integrations/**` is removed.
- [ ] **Remove what the decisions drop.** Runtime DSN settings and the `sentry.config.v1` key (delete it on load), unused wrappers, and the catalog if Integrations becomes a developer tool. Done when no dead exports remain.
- [ ] **Source maps in CI.** Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` secrets to the Pages workflow. Done when a release shows readable stack traces in Sentry and the deployed site has no `.map` files.
- [ ] **Verify with a real DSN.** Preview build: a widget error, a route error and a failed mutation arrive with tags; replay only on error, text masked. Done when the results are written into plan-06.
