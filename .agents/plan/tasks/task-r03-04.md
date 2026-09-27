# Tasks: Design Tokens (one source of truth, Mantine-native)

Sep 27, 2026 · v1.3.0 · Reference: [plan-03.md](../plan-03.md)

- [x] **Primitives.** `tokens/primitives.ts` with palette tuples, alpha steps and every scale, including `2xs=4` / `3xs=2`; `createTheme` reads from it.
- [x] **Semantic tokens and generated resolver.** `tokens/semantic.ts` with light and dark values and `toCssVars()`; a unit test checks every key produces an `--app-*` variable.
- [x] **Move `brand.sentry` to the primitives.** `tokens.brand` is gone. `--app-brand-sentry` is still emitted by `legacy` but has no reader, so it goes with that group (see "Migrate the CSS modules").
- [x] **Semantic color aliases.** `virtualColor` aliases `brand`, `neutral`, `danger`, `warning`, `success` and `info`.
- [x] **Split the component tier.** `theme/components/<Name>.ts` with radius from `shape.*`.
- [-] **Spike: chrome theme zone.** Dropped Sep 27: the `chrome` semantic group is the answer ([plan-03 §4](../plan-03.md#4-the-always-dark-chrome-the-chrome-semantic-group)).
- [-] **Spike: tooling compatibility.** Dropped Sep 27: Stylelint built-in rules only, so there is no plugin to check.
- [ ] **Trim `tokens.ts`.** Keep only `{ shell, zIndex, grid }`; delete `chrome`, `surface` and `motion`, `other: tokens` in `theme.ts`, and the `MantineThemeOther` augmentation in `mantine.d.ts`. Done when `grep -rn "theme.other\|tokens.chrome\|tokens.surface\|tokens.motion" src` finds nothing and `pnpm build` passes.
- [ ] **Overlays through Mantine's variables ([plan-03 §3](../plan-03.md#3-surfaces-and-layering)).** In `cssVariablesResolver`, map `--mantine-color-body` → `elevation.surface.overlay` and `--mantine-color-dimmed` → `color.text.subtle`, in light and dark. Menu, Popover, Modal, Drawer and Spotlight get `shadow: 'var(--app-elevation-shadow-overlay)'`. Done when a resolver test checks both overrides and the overlay stories look unchanged in both schemes.
- [ ] **Bind the Paper variants to the layer tokens.** `panel` and `widget` in `theme/styles/Paper.module.css` read `--app-layer-surface` and `--app-layer-border`. Done when nothing changes visually (same values at depth 1). The nesting rules wait for a nested surface.
- [ ] **Replace custom code with Mantine ([plan-03 §8](../plan-03.md#8-custom-code-that-mantine-already-covers)).**
  - `.srOnly` → `VisuallyHidden`.
  - The `SlowHint` and `Inbox` timers → `useTimeout`.
  - The 5 class joins (4 in `Panel.tsx`, 1 in `SidebarNav.tsx`) → `clsx`.
  - `Tooltip.Group` around the navbar actions and the compact sidebar.
  - The abortable waits in `features/dashboards/api/client.ts` and `api/demo.ts` → `utils/wait.ts` with an optional `signal`.
  - Done when the tests pass and `setTimeout` appears only in `useMainLock`, `useDelayedPending` and `utils/wait.ts`.
- [ ] **Rebuild `ErrorState.Full` / `.Inline` on `EmptyState`.** Same public API, `color="danger"`, `role="alert"`, the 404 code display and the details panel kept; delete the layout CSS it no longer needs. Done when the ErrorState stories look the same (or intentionally better) and `WidgetBoundary.test.tsx` passes.
- [ ] **Add the lint rules as warnings ([plan-03 §5](../plan-03.md#5-enforcement-making-the-tokens-mandatory)).** Stylelint built-ins (`function-disallowed-list`, `declaration-property-value-disallowed-list`, `declaration-property-value-allowed-list`), oxlint `app/no-raw-style-props`, and the `primitives` import boundary. `design-system/**` and `features/integrations/**` are excluded. Done when `pnpm lint` lists every violation as a warning.
- [ ] **Migrate the CSS modules.**
  - Replace the 5 `rgb(255 255 255 / n%)` in `Search.module.css` and `TopNavbar.module.css` with new `chrome.navbarInput*` tokens.
  - Replace the 7 palette variables with semantic ones.
  - Rename the `legacy` variables (`--app-surface`, `--app-surface-raised`, `--app-border`, `--app-text-muted`, `--app-motion-*`) to their semantic names everywhere, including `design-system/theme/styles/`, `Tokens.stories.tsx` and `features/integrations/**`.
  - Delete the `legacy` group and its skip in `toCssVars`.
  - Done when Stylelint shows no token warnings and `semantic.ts` has no `legacy`.
- [ ] **Migrate the TSX props.** 30 files: 28 icon sizes and strokes → `iconSize` / `iconStroke`; 24 spacing values → keys (`2xs` / `3xs` for 4 / 2); 9 `fw` → keys; 6 chart heights on the Debug page → `chart.height`; 16 palette colors → aliases. Done when oxlint shows no `no-raw-style-props` warnings and the visual check passes.
- [ ] **Switch the rules to error, with a test that they fire.** One Vitest test runs `stylelint.lint({ code, config })` on a bad snippet per rule, runs `oxlint` on `lint/fixtures/*.tsx` (outside `src`), and checks each rule id appears. Done when the rules are on error, `pnpm lint` passes and the test passes in `pnpm test`.
- [ ] **Tokens story.** Rebuild `Tokens.stories.tsx`: primitives, semantic tokens in both schemes (swatch, variable name, the primitive it points to), and a shape demo. Done when it renders in both schemes in Storybook. The layer demo and the "Outline layers" switch wait for the nesting rules.
- [ ] **Update AGENTS.md › Styling and `docs/plan.md` › Design system.**
  - AGENTS.md: document the tiers, the "semantic only outside design-system" rule, the status aliases, the icon tokens, `mantine-focus-auto` / `mantine-active`, viewport classes only in the shell, and "check the Mantine exports before writing a hook".
  - `docs/plan.md`: replace the stale design-system table, which still lists `theme/components.ts` as the variant home and `theme.other`.
  - Done when it's merged together with the rules switching to error.
