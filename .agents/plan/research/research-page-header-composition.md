# Research: Page Header & Control Bar Composition

Sep 24, 2026 · Reference: [plan-02.md](../plan-02.md)

This research analyzes header and toolbar composition patterns across modern data and design systems (**Grafana PageToolbar**, **Metabase**, **Superset**, **Atlassian Design System**) to guide the refactoring of `Page.Header` in Dashboard Builder.

---

## 1. Industry Patterns

### A. Grafana `PageToolbar`
* **Structure**:
  * Top navigation/breadcrumb row with folder and dashboard title.
  * Title container supporting view/edit toggle, tag badges, and description tooltip.
  * Action row with left-aligned navigation/back controls and right-aligned actions (Save, Share, Settings, View modes).
  * Collapsible on small viewports with icon-only wrapping and overflow dropdown menus.
* **Component Model**:
  * Compound layout composed of flex containers with gap tokens.
  * Uses transparent/subtle button variants (`ToolbarButton`) with tooltip wrappers and accessibility labels.

### B. Metabase Dashboard Header & Parameter Toolbar
* **Structure**:
  * Clean separation between **Dashboard Header** (Title, description, collection path, star/favorite, export/edit actions) and **Control Bar** (Filter widgets, time-grouping parameters).
  * Control bar stays sticky or collapses smoothly below the header.
  * Filters display as dropdown pills or inputs with active state badges and clear buttons (`X`).

### C. Apache Superset Dashboard Header
* **Structure**:
  * Title with inline edit and autosave status indicator.
  * Global control ribbon containing:
    * Time range picker.
    * Dashboard filter bar toggle.
    * Auto-refresh timer with countdown indicator.
    * Mode switcher (View / Edit Layout).

---

## 2. Weaknesses of Current `Page.tsx` Implementation

In Dashboard Builder today:
```tsx
// Current src/design-system/components/Page/Page.tsx
function Header({ title, description, actions }: HeaderProps) {
  return (
    <Group className={classes.header} justify="space-between" align="flex-end" wrap="wrap" gap="md">
      <Stack gap={4} className={classes.heading}>
        <Title order={1}>{title}</Title>
        {description ? <Text size="sm" c="dimmed">{description}</Text> : null}
      </Stack>
      {actions ? <Group gap="xs">{actions}</Group> : null}
    </Group>
  );
}
```

* **Deficiencies**:
  1. **Monolithic props API**: Adding breadcrumbs, subtitle, control bar, time pickers, or tags causes boolean/optional prop explosion.
  2. **No Control Bar slot**: Filters and time range controls have no dedicated semantic zone below or beside the title.
  3. **Fast Refresh violation**: Components `Root`, `Header`, `Body` are internal functions and not exported by name individually, contrary to `AGENTS.md`.
  4. **Limited responsive behavior**: On narrow viewports, long titles push actions down awkwardly with no explicit wrapping strategy.

---

## 3. Target Compound Component Architecture

Proposed compound architecture in `src/design-system/components/Page/`:

```
Page.Root
├── Page.Header
│   ├── Page.Breadcrumbs (hierarchical trail: Home / Dashboards / Sales)
│   ├── Page.TitleRow
│   │   ├── Page.Title (heading order=1, editable or static)
│   │   ├── Page.Description (dimmed text / tooltip)
│   │   └── Page.Actions (right-aligned ActionIcons & primary buttons)
│   └── Page.ControlBar (sticky or inline toolbar for filters, time range, refresh)
│       ├── TimeRangePicker
│       ├── RefreshPicker
│       └── VariableControls
└── Page.Body
    └── (Dashboard grid, list, or content)
```

### Component Export Strategy
Follow Vercel compound component rules and Fast Refresh requirements:
```tsx
export function PageRoot(...) { ... }
export function PageHeader(...) { ... }
export function PageBreadcrumbs(...) { ... }
export function PageTitleRow(...) { ... }
export function PageTitle(...) { ... }
export function PageDescription(...) { ... }
export function PageControlBar(...) { ... }
export function PageActions(...) { ... }
export function PageBody(...) { ... }

export const Page = {
  Root: PageRoot,
  Header: PageHeader,
  Breadcrumbs: PageBreadcrumbs,
  TitleRow: PageTitleRow,
  Title: PageTitle,
  Description: PageDescription,
  ControlBar: PageControlBar,
  Actions: PageActions,
  Body: PageBody,
};
```
