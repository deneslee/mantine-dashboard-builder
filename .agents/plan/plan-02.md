# Plan 02: Composable Page Header & Control Bar

Sep 24, 2026 · v1.0.0 · Tasks: [task-r02-01.md](./tasks/task-r02-01.md) · Research: [research-page-header-composition.md](./research/research-page-header-composition.md)

## Objective
Refactor `src/design-system/components/Page/Page.tsx` from a rigid monolithic component into an extensible compound component hierarchy inspired by **Grafana's `PageToolbar`** and **Metabase headers**, providing dedicated slots for breadcrumbs, title rows, control bars (time pickers, refresh intervals, variable filters), and action groups.

## Architectural Design

### 1. Compound Component Hierarchy
```
Page.Root (Container, gap spacing, landmark semantics)
├── Page.Header (Flex column containing navigation, title, and controls)
│   ├── Page.Breadcrumbs (Navigation trail: e.g. Dashboards / Sales Overview)
│   ├── Page.TitleRow (Horizontal flex row for primary heading & meta)
│   │   ├── Page.Title (Heading order=1, editable or static, text truncation)
│   │   ├── Page.Description (Secondary dimmed subtitle / info tooltip)
│   │   └── Page.Actions (Top-right action buttons: Save, Edit, Share, Export)
│   └── Page.ControlBar (Dedicated ribbon for query filters and temporal controls)
│       ├── TimeRangePicker slot
│       ├── RefreshIntervalPicker slot
│       └── VariableFilterList slot
└── Page.Body (Scrollable or fluid canvas body)
```

### 2. Fast Refresh & Named Exports
In compliance with `AGENTS.md` and Vercel composition rules:
* Export each individual subcomponent by name:
  * `export function PageRoot(...)`
  * `export function PageHeader(...)`
  * `export function PageBreadcrumbs(...)`
  * `export function PageTitleRow(...)`
  * `export function PageTitle(...)`
  * `export function PageDescription(...)`
  * `export function PageControlBar(...)`
  * `export function PageActions(...)`
  * `export function PageBody(...)`
* Re-export compound object:
  ```ts
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

### 3. Responsive Wrapping & Collapse Behavior
* Large screens (`lg+`): Title row and actions sit side-by-side; control bar sits below as an aligned ribbon.
* Medium screens (`md`): Control bar wraps gracefully with gap tokens; filter pills and time pickers maintain minimum hit targets.
* Small screens (`sm`): Breadcrumb truncates with an ellipsis menu; secondary actions fold into a Mantine `Menu` dropdown; titles wrap cleanly without clipping.

## Verification Plan
* Add dedicated Storybook stories in `Page.stories.tsx` covering:
  * Minimal header (title only).
  * Standard dashboard header (breadcrumb, title, description, actions).
  * Complete dashboard control bar (breadcrumbs, title, time range, refresh picker, filter pills, action buttons).
  * Responsive wrap test (desktop `1280px`, tablet `768px`, mobile `375px`).
* Unit tests in `Page.test.tsx` verifying semantic markup (`<h1>`, `<nav aria-label="Breadcrumb">`), keyboard accessibility, and rendering of all compound slots.
