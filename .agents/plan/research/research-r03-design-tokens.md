# Research: Design Tokens on Top of Mantine

Sep 24, 2026 · Reference: [plan-03.md](../plan-03.md)

How Atlassian and Carbon structure tokens, what Mantine 9.6 already provides for each tier, and where this repo stands today.

---

## 1. Audit of the current code (Sep 24, 2026)

**What's already good:**

- **CSS modules:** no hex colors (Stylelint `color-no-hex`) and **no** direct palette references (`--mantine-color-gray-5`) in the 22 CSS modules.
- **App tokens:** `tokens.ts` already has app tokens (`shell`, `zIndex`, `chrome`, `surface`, `motion`, `grid`), emitted as `--app-*` by `cssVariablesResolver`.
- **Theme defaults and variants:** `components.ts` already sets defaults and custom variants (`ActionIcon chrome`, `Paper panel|widget`, `NavLink sidebar`).

**Where fixed values slip through:**

| Where         | What                                                                                                                        | Count |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | ----- |
| TSX props     | icon `size={18/16/14/22/20/24…}`                                                                                            | ~40   |
| TSX props     | numeric spacing: `gap={4/2/6/8/0}`, `mt={2}`, `mb={6}`                                                                      | ~30   |
| TSX props     | `fw={600/500}`                                                                                                              | 9     |
| TSX props     | fixed chart heights `h={180/200}`                                                                                           | 6     |
| TSX props     | palette names as roles: `color="gray"` 9, `color="red"` 6, `color="indigo"` 1                                               | 16    |
| TSX props     | `stroke={1.75}` repeated                                                                                                    | many  |
| CSS           | `rgb(255 255 255 / 8–14%)` in `ActionIcon`, `Search`, `TopNavbar` modules                                                   | 7     |
| tokens.ts     | `chrome.navbarBg/Border` as `rgba(...)` literals                                                                            | 2     |
| tokens.ts     | 12 `chrome.*` tokens that only exist because the chrome is always dark                                                      | 12    |
| theme.ts      | the resolver lists each variable by hand, so new tokens can be forgotten                                                    | —     |
| components.ts | radius is set per component (`Paper md`, `Alert md`, `Notification md`, `Skeleton sm`, default `sm`) with no shared meaning | —     |

About 30 TSX files are affected. None of this is dangerous, but it's why "change X everywhere" currently means a search-and-replace.

---

## 2. Atlassian Design System

Sources:

- https://atlassian.design/foundations/tokens/design-tokens
- https://atlassian.design/foundations/elevation
- https://atlassian.design/llms-tokens.txt

**Naming:**

- Names follow `foundation.property.modifier`, for example `color.text.subtle`, `color.border.focused`, `elevation.surface.raised.hovered`.
- "Choose tokens based on meaning, not specific values."
- A **theme** is a set of values for the same token names. Light, dark and high-contrast are themes, and so are density and reduced motion.

**Elevation:** four surfaces, each with `hovered` and `pressed` variants:

- `elevation.surface`: the default background
- `elevation.surface.sunken`: grouped content, a well
- `elevation.surface.raised`: cards and movable items; always paired with `elevation.shadow.raised`
- `elevation.surface.overlay`: menus, popovers, dialogs; always paired with `elevation.shadow.overlay`

In dark mode, raised and overlay surfaces are _lighter_ than the base, so elevation still reads without shadows. The current `surface.dark` (base `dark-8`, raised `dark-7`) already does this.

**Takeaway:**

- Adopt Atlassian's _vocabulary_ for semantic tokens (surfaces with hovered/pressed, paired shadows, text/border roles).
- Don't import their full token set. Mantine already has text, dimmed, body and the component colors.

## 3. Carbon Design System (layering)

Sources:

- https://carbondesignsystem.com/elements/color/usage/
- https://carbondesignsystem.com/elements/color/overview/

**Layers:**

- Carbon stacks layers: `background` → `layer-01` → `layer-02` → `layer-03`, alternating neutral steps.
- Each layer has `-hover`, `-active`, `-selected`, and matching `field-0x` and `border-*-0x` tokens.

**Two ways to apply them:**

- **Explicit layer tokens:** `$layer-02` is written into the component.
- **Contextual tokens:** `$layer`, `$field` and `$border-subtle` without a number. A `<Layer>` wrapper sets their values by nesting depth, up to 3 levels. One component version then works on any layer. Carbon recommends contextual tokens even for components that only ever sit on one layer.

**Takeaway:** this is exactly "a widget's background depends on what it sits on". It can be done with CSS custom properties alone, with no React context:

```css
/* design-system/theme/layers.css */
[data-layer]                             { --app-layer: var(--app-elevation-surface-raised); --app-layer-hovered: …; --app-layer-border: …; }
[data-layer] [data-layer]                { --app-layer: var(--app-elevation-surface); … }
[data-layer] [data-layer] [data-layer]   { --app-layer: var(--app-elevation-surface-raised); … }
```

Portals (Menu, Popover, Modal) leave the DOM subtree and use the overlay surface, which is the correct behaviour.

## 4. What Mantine 9.6 already provides (use it, don't rebuild it)

Source: mantine.dev, via Context7 `/websites/mantine_dev`.

| Need                                                                    | Mantine feature                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raw palette, spacing, radius, font sizes, weights, shadows, breakpoints | `createTheme` (`colors`, `spacing`, `radius`, `fontSizes`, `fontWeights` (new in 9.0: `regular/medium/bold`), `shadows`, `breakpoints`), emitted as `--mantine-*`                                                                             |
| Extra size keys (`2xs`, `3xs`)                                          | `MantineThemeSizesOverride` module augmentation for `spacing` and `radius`                                                                                                                                                                    |
| Semantic color names in props (`color="danger"`)                        | `virtualColor({ name, light, dark })`; the same palette in both schemes makes it a plain alias; works with `autoContrast` (9.4)                                                                                                               |
| App-level CSS variables per scheme                                      | `cssVariablesResolver` → `{ variables, light, dark }`                                                                                                                                                                                         |
| Per-component defaults                                                  | `Component.extend({ defaultProps })`                                                                                                                                                                                                          |
| Per-variant or per-size component variables                             | `Component.extend({ vars: (theme, props) => ({ root: { '--button-radius': … } }) })`                                                                                                                                                          |
| Custom variants                                                         | `classNames` + `[data-variant='x']` in a CSS module (already used)                                                                                                                                                                            |
| Scheme-dependent values in CSS                                          | `light-dark(a, b)` and `@mixin light/dark` (postcss-preset-mantine); not on `:root`/`html`                                                                                                                                                    |
| Responsive in CSS                                                       | `@mixin smaller-than/larger-than $mantine-breakpoint-*`, and `@container` queries (preset ≥ 1.13)                                                                                                                                             |
| Static helper classes                                                   | `mantine-focus-auto` (`:focus-visible` ring), `mantine-focus-always`, `mantine-focus-never`, `mantine-active` (press feedback), `mantine-visible-from-{bp}` / `mantine-hidden-from-{bp}` (also exposed as `visibleFrom` / `hiddenFrom` props) |

**Notes:**

- **Where `visibleFrom`/`hiddenFrom` apply:** they are **viewport** based. Use them for shell chrome only. Inside `<main>`, whose width depends on the side panels, use container queries (Plan 04).
- **Custom focusable elements:** `mantine-focus-auto` gives any custom focusable element the same focus ring as Mantine components. `mantine-active` does the same for press feedback. These replace hand-written `:focus-visible` rules.
- **Radius prop:** Mantine resolves `radius` keys through `theme.radius`. If a key like `radius: shape.control` is set in `defaultProps`, changing it in one place changes every component that uses it.

## 5. Enforcement options

**Stylelint:**

- `color-no-hex` is already on.
- `function-disallowed-list: [rgb, rgba, hsl, hsla]`, with an override for `design-system/`.
- `declaration-property-value-disallowed-list` with a regex that bans palette variables (`/--mantine-color-[a-z]+-\d/`) outside `design-system/`.
- Plugin `stylelint-declaration-strict-value`: forces `var()`/keywords for `color`, `background-color`, `border-color`, `fill`, `stroke`, `box-shadow`, `z-index`, `border-radius`, `transition-duration`. Check compatibility with Stylelint 17 before adopting it.

**oxlint JS plugin** (`lint/plugin.js` already has `no-inline-style`). Add a rule `no-raw-style-props` that reports:

- numeric spacing/size props other than `0`,
- `fw`/`fz`/`radius` numbers,
- palette names in `c`/`color`/`bg`,
- numeric `size`/`stroke` on Tabler `Icon*` elements.

**Import boundary:** only `design-system/theme/**` may import `tokens/primitives.ts` (`no-restricted-imports` override).

## 6. Debugging benefits

- **Named variables:** every semantic value is a named variable, so devtools shows `background: var(--app-elevation-surface-raised)` instead of a hex. Following it back leads to the primitive in one hop.
- **Tokens story:** `Tokens.stories.tsx` (already exists) can show each tier side by side in both schemes, including a demo of nested layers.
- **Layer outlines:** an optional `html[data-debug-layers]` outline (colored by `data-layer` depth), toggled from the Debug page, shows nesting mistakes immediately.
