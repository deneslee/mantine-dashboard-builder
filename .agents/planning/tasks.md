# Tasks

The checklist for the current phase ([roadmap](roadmap.md)): steps P1–P7, in order. Each step links to its plan in [plans/](plans/) once it has one. What's done, the backlog and work for later phases are kept outside the repo, in the project docs; the checklist as it stood before this cut is archived there too.

## This phase, in order

Decided Oct 26 ([roadmap](roadmap.md#steps)): P1 to P6 in order, P7 in parallel. Each step gets its plan in [plans/](plans/) when it starts; the lines below are its starting checklist.

### P1 Cleanup

A short cleanup, not a phase. Write its plan when it starts, because the docked panes need a design.

- [ ] **Docked panels.**
  - The palette, the widget editor and Inspect become a `Splitter` pane that resizes the grid, instead of an overlay covering the tiles.
  - Mantine `Drawer` stays for temporary overlays. `PaneDrawer` and its `aria-modal` and `requestAnimationFrame` workarounds go.
  - Done when neither the editor nor Inspect covers the grid, and focus moves into and out of the pane by keyboard.
- [ ] **Control bar groups.** `Page.ControlBar` shows page actions (create, edit, share, export, save), view controls (filters, time range, refresh, view) and editor controls (undo, redo, add widget) as three groups, with overflow when narrow. No new toolbar framework. Done when the three groups stay apart at 667 px.
- [ ] **A view descriptor for the context bar.** The active view describes itself: title, record, data bindings, related objects and actions. Done when a dashboard supplies its widgets and queries, and the Details tab shows them without importing the dashboard feature.
- [ ] **Inspect regrouped.** Data (a preview with limited rows, and export), Query (source, spec, resolved variables and time), JSON (the widget's definition and the frames, in sections) and diagnostics (duration, cache age, errors). Done when every tab's story shows populated, empty and error cases.

#### Edit UI polish

These come from the Sep 30 review of the edit MVP ([07 › Sep 30 review](https://github.com/deneslee/mantine-dashboard-builder/blob/0e400dd/.agents/planning/plans/07-dashboard-model.md#sep-30-review-of-the-edit-mvp)). The docked editor pane is Docked panels above.

- [ ] **Edit bar.**
  - An "Editing" status that shows the dirty state.
  - Undo and Redo as `ActionIcon` + `Tooltip`, with `useHotkeys`.
  - Add widget as the primary action.
  - Import and Export JSON in one menu.
  - Save and Discard disabled while the dashboard is clean.
- [ ] **Confirmations.** Use `modals.openConfirmModal` for:
  - Discard, because it clears the undo history.
  - Leaving the query editor with unapplied changes, which today uses `window.confirm`.
- [ ] **Done vs leave.**
  - With unsaved changes, "Done" offers Save, Keep draft or Discard instead of the "Leave dashboard" dialog.
  - View mode marks a dashboard that has a draft.
- [ ] **Forms.**
  - Palette, Move and Resize become `<form>`s, so Enter submits.
  - Move and Resize state the valid range ("Column 1–12").
- [ ] **Empty and loading states.**
  - Mantine `EmptyState` for an empty dashboard.
  - A skeleton instead of "Opening editor…".
  - A one-time "Restored your unsaved draft" notice.
- [ ] **One `editable` flag.** The toolbar checks the viewport width and the grid checks its own width, so at 667 px the toolbar shows but dragging is off. Derive both from the grid's measured width.
- [ ] **Accessibility.**
  - The widget menu trigger loses `aria-haspopup` and `aria-expanded` under its Tooltip.
  - An identical live-region message isn't announced twice.
  - The remove toast's Undo undoes the latest change rather than the removal.
  - Move and Resize announce positions counted from 0 ("column 0, row 3"), while their dialogs count from 1.
- [ ] **Query editor preview.** Debounce the preview query instead of running one per keystroke.

#### Tokens and contrast

From the Sep 30 story a11y run and the design-system review.

- [ ] **Light-scheme contrast.** The light-scheme tokens are below WCAG AA, found by the story a11y tests (Sep 30):
  - dimmed text (`#868e96` on `#f8f9fa`) is 3.15:1;
  - white on the primary filled button (`#4c6ef5`) is 4.32:1;
  - links on the canvas are 4.1:1;
  - the warning and success badges and alert titles are 2.4–3.8:1;
  - the avatar initials also fail.

  Fix it in the semantic tokens ([design-system.md](../../docs/ui/design-system.md)): a darker dimmed shade, and a primary shade or text color for filled buttons. Done when `color-contrast` is enabled again in `.storybook/preview.tsx` and every story passes.

- [ ] **`--mantine-color-body` points at the overlay surface.** Before the overlay and raised surfaces diverge, point it at the canvas surface, bind `ModalBase` (Modal, Drawer) to overlay, and bind the parts that must match the surface behind them (Table's sticky header, the active Tabs border, Scroller's fade) to `--app-layer-surface`. Details in [design-system.md](../../docs/ui/design-system.md#where-new-things-go). Done when a story shows each of those components on canvas and inside a widget.

#### Stories and tests

- [ ] **Stories by area.** Args-driven stories with controls, grouped as Shell, Dashboard, Studio, Data and Shared UI. A story is a state worth reviewing; actions are `fn()` args, not separate stories. `Page` gets one composition story and one narrow one; `Shell` one configurable story, one narrow case and one interaction. Done when `DashboardPage`, `Shell` and `DatasourcesPage` keep only distinct states, and the a11y check still covers every story.
- [ ] **Tests by risk.** Keep tests for schemas and migrations, undo and redo, save and discard, workspace tabs, manifest checks, data bindings and rules; drop tests that only check static markup a story already shows. Done when every remaining test names the regression it guards against.

### P2 Packages

- [ ] **Workspace split.** `packages/core`, `ui`, `platform` and `dashboards`, `apps/builder` and `relay/` in the pnpm workspace, mostly by `git mv` of today's package-shaped folders. Done when `vp run dev`, the stories and all tests pass as before.
- [ ] **The boundary.** A lint rule that packages never import `apps/*`, proven in `lint/rules.test.ts`. Done when a fixture import from an app fails the lint.
- [ ] **Local link.** The npm scope chosen; a scratch app links the packages through a pnpm override. Done when it renders the shell with one navigation entry.
- [ ] **Translations.** Paraglide JS per package, the app setting the language. Done when the shell's strings switch between English and Hungarian.

### P3 Where to save

- [ ] **The interface.** `StorageProvider` and `ListQuery` in `core`, with one contract-test suite every provider must pass. Done when the browser provider passes it.
- [ ] **Providers.** This browser (IndexedDB), files (export and import a bundle; the dev server saves into a folder, as Add to build writes `plugins.json`), and the Convex plugin (a Convex component published with the packages, plus browser providers; in `plugins.json`). Done when all three pass the contract tests.
- [ ] **The setting.** "Where to save" in Settings, with "Copy to…" between providers. Done when a dashboard saved in the browser copies to Convex and back unchanged.
- [ ] **Dashboards on the provider.** `dashboardApi`'s bodies call the provider, and saved documents get a `revision` for conflict checks. Done when no component or store changes, and a stale save is refused with a clear message.

### P4 Data

- [ ] **The data catalog.** Datasources, collections, schemas (JSON Schema, checked with Ajv), bindings and provenance (original source and current storage) in a `data` package. Done when a JSON dataset imports with its source recorded.
- [ ] **Record pages.** A table of records and a record view that shows, edits and extends them: forms built from the schema, a JSON editor for loose fields, custom fields as extension properties, new collections from Studio. Done when a new field added in Studio can be filled in and survives a reload on every provider.
- [ ] **The schema view.** Fields, types and references of a collection. Done when it shows the imported dataset's fields with their original keys.
- [ ] **The Data tab.** "Data used by this view" in the context bar: each binding's collection, source, storage and record count, read-only, with links into Studio. Done when every binding on a page is listed.
- [ ] **TanStack DB spike.** Try TanStack DB collections over one storage provider for the records layer: live queries across open tabs, optimistic edits, and how it sits next to TanStack Query. It's pre-1.0. Done when the go or no-go is written in the P4 plan.
- [ ] **Search.** `SearchProvider` with the Convex provider and an in-browser index; Spotlight and the table's search use it. Done when a record is found by a partial, accent-free word.

### P5 Navigation and Studio

- [ ] **The manifest.** YAML in, JSON stored, one Zod schema, checks for ids, kinds and options; export back to YAML; Reset. Done when an edit survives a reload and exports to YAML that loads again.
- [ ] **Areas and record tabs.** Area kinds `dashboards`, `records` and `link`; record types with tabs, views, a banner and a tab limit; the dynamic route family; tabs restored as ids. Done when two records stay open with separate views and drafts, and a reload restores them.
- [ ] **Page modes.** `custom`, `composed` and `hybrid` with widget slots. Done when a hybrid page renders a widget slot.
- [ ] **Studio.** The base areas Studio, Integrations and Settings; Studio's navigation outline (add, move, rename and hide areas and pages); `FeatureModule` and `HostServices`. Done when an area added in Studio appears in the sidebar.

### P6 Node builder

- [ ] **The `flow` package.** React Flow 12 canvas, node types as `NodePlugin`s, a graph document with undo, checks, dagre layout, an outline for keyboard users, `FlowView`. Done when a keyboard-only user can add and connect nodes.
- [ ] **The navigation kind.** The navigation as a graph that edits the same manifest as the outline. Done when an edit in either shows up in the other.
- [ ] **The tree kind and its evaluator.** Any JSON document as nodes, loose like writing JSON; conditions on a node (above, between or under a number → a result); a pure evaluator in `core` that returns what matched and why. Done when sample trees give the expected results on sample records, edges included.

### P7 Table widget (in parallel)

- [ ] **Table features.** Search, column filters, multi-column sorting, paging, column order and visibility, row selection, virtual rows. Done when 10k rows scroll with no long task over 50 ms.
- [ ] **Server-side mode.** The table sends `ListQuery` to providers that support it and filters in the browser otherwise. Done when moving a page from browser-side to server-side changes no page code.
- [ ] **Column types.** Each column gets a type (number, date, true or false, text, JSON, or a custom one) from the collection's JSON Schema; the type decides format, alignment, sorting and the cell's detail view. Detectors, each returning a match score, fill in types for loose JSON. EUI's data grid schemas are the reference. Done when the REHAROB scores, stored as text, sort as numbers.
- [ ] **Query helper.** Pick one library behind `ListQuery`: react-querybuilder (a filter model with a Mantine UI and exports to SQL, MongoDB, JSONLogic and Elasticsearch), @ucast (one conditions tree with JS, MongoDB and SQL interpreters) or mingo (MongoDB-style queries in the browser). Done when the browser and Convex providers answer the same `ListQuery` from it.
- [ ] **State in the URL.** Search, filters, sorting and page in search params, checked by the route's schema. Done when a copied link opens the same view of the table.
