# Node Studio — Structure & Code Review (Refactor Proposal)

> Scope: `src/features/node-studio/`
> Status: proposal, non-breaking — do not merge until the first interactive canvas has been visually reviewed (per `AGENTS.md`).
> Goal: make graph state, rendering, editor interactions, and pure logic separately reviewable; align with React best practices; keep the prototype contained to this feature.

---

## 1. Goals

1. **Separate concerns by kind of code**, not by accident of creation:
   - domain model (types + pure state transitions) — no React, no graph libs;
   - graph adapters (projections into React Flow / force-graph shapes) — no React;
   - React state & effects — hooks only;
   - UI — components with colocated CSS.
2. **Split `BuildSchema.tsx`** so it becomes a thin orchestrator. Today it owns graph projection, interaction handling, inspector rendering, and form state in one file.
3. **Apply React best practices**: `memo` custom nodes, stable `nodeTypes`, no constructed context values, controlled stores, effect cleanup, colocated CSS modules.
4. **Keep the feature self-contained** — no imports from dashboard schemas, widget registration, shared stores, or backend. `index.ts` is the only public surface.

Non-goals: no custom Mantine theme integration, no shared token extraction, no store/API work. Prototype scope only.

---

## 2. Proposed structure

```plaintext
src/features/node-studio/
├── AGENTS.md
├── index.ts                          # public API: export { NodeStudioPage } (and Schema type)
│
├── NodeStudioPage/                   # page shell: sample switch, Tabs, lazy-loaded explore
│   ├── NodeStudioPage.tsx
│   └── NodeStudio.module.css
│
├── model/                            # domain types + pure state transitions (no React)
│   ├── schema.ts
│   ├── schema.test.ts
│   ├── schemaEdits.ts
│   └── schemaEdits.test.ts
│
├── graph/                            # projections into graph libraries (no React)
│   ├── buildGraph.ts
│   ├── buildGraph.test.ts
│   ├── exploreGraph.ts
│   └── exploreGraph.test.ts
│
├── hooks/                            # every use* lives here
│   ├── useFieldSelection.ts
│   ├── useSchemaNodes.ts
│   ├── useRelationshipEdges.ts
│   ├── useRelationshipEditing.ts
│   └── useRenameField.ts
│
└── ui/                               # one folder per component, CSS colocated
    ├── BuildSchema/
    │   ├── BuildSchema.tsx
    │   └── BuildSchema.module.css
    ├── TableCard/
    │   ├── TableCard.tsx
    │   └── TableCard.module.css
    ├── FieldInspector/
    │   ├── FieldInspector.tsx
    │   └── FieldInspector.module.css
    ├── RenameFieldForm/
    │   ├── RenameFieldForm.tsx
    │   └── RenameFieldForm.module.css
    └── ExploreSchema/
        ├── ExploreSchema.tsx
        └── ExploreSchema.module.css
```

### Why these folders (and not `utils/`)

| Folder            | Responsibility                                                                                                    | Allowed to import        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `model/`          | `Schema`, `SchemaTable`, `SchemaField`, `Relationship`; `renameField`, `saveRelationship`, `getRelationshipError` | — (pure)                 |
| `graph/`          | `getTableNodes`, `getRelationshipEdge`, `getRelationship`; `projectExploreGraph`, `getNeighborhood`, `copyLinks`  | `model/`                 |
| `hooks/`          | React state, effects, context                                                                                     | `model/`, `graph/`       |
| `ui/`             | Components, CSS modules                                                                                           | any of the above         |
| `NodeStudioPage/` | Route entry, tab shell, lazy loading                                                                              | `ui/`, `index` re-export |

A `utils/` folder was deliberately avoided: the non-React code here splits into two identifiable kinds (domain logic vs. third-party graph adapters). Naming the adapters folder `graph/` prevents it becoming a junk drawer.

### Migration map

| Current file                                                       | Destination                              | Change                                                                    |
| ------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------- |
| `AGENTS.md`                                                        | unchanged                                | —                                                                         |
| `NodeStudioPage/NodeStudioPage.tsx`, `NodeStudio.module.css`       | unchanged                                | —                                                                         |
| `schema.ts`                                                        | `model/schema.ts`                        | add `schema.test.ts` for fixture invariants (unique IDs, valid endpoints) |
| `schemaEdits.ts`                                                   | `model/schemaEdits.ts`                   | —                                                                         |
| `buildGraph.ts`                                                    | `graph/buildGraph.ts`                    | add tests; extract `OUT_PREFIX` / `IN_PREFIX` constants                   |
| `exploreGraph.ts`                                                  | `graph/exploreGraph.ts`                  | —                                                                         |
| `fieldSelection.ts`                                                | `hooks/useFieldSelection.ts`             | becomes context + provider + `useFieldSelection()` hook                   |
| `BuildSchema.tsx` (state/effects/handlers)                         | split into `hooks/*`                     | see §4                                                                    |
| `BuildSchema.tsx` (JSX)                                            | `ui/BuildSchema/BuildSchema.tsx`         | thin orchestrator                                                         |
| inline `RenameField`                                               | `ui/RenameFieldForm/RenameFieldForm.tsx` | new file, own CSS                                                         |
| inspector JSX                                                      | `ui/FieldInspector/FieldInspector.tsx`   | new file, own CSS                                                         |
| `TableCard.tsx`                                                    | `ui/TableCard/TableCard.tsx`             | `memo`-wrapped, local CSS                                                 |
| `.card`, `.field`, `.handle`, `.row` from `BuildSchema.module.css` | `ui/TableCard/TableCard.module.css`      | CSS ownership follows the component                                       |
| `ExploreSchema.tsx`, `ExploreSchema.module.css`                    | `ui/ExploreSchema/`                      | —                                                                         |
| remainder of `BuildSchema.module.css`                              | `ui/BuildSchema/BuildSchema.module.css`  | only `.workspace`, `.canvas`, `.inspector`, `.form`, `.footer`            |

---

## 3. Code review — issues and fixes

### 3.1 `BuildSchema.tsx` — overloaded component

Today the file owns five responsibilities:

1. defines `RenameField` form;
2. manages `selectedEdgeIds`, `selection`, `message`;
3. syncs `schema.tables` → React Flow store via `useEffect`;
4. handles connect / reconnect / edges change;
5. renders canvas + inspector + footer.

**Fix:** extract hooks + UI so `BuildSchema.tsx` reads as wiring.

After refactor (target ≈ 80–120 lines):

```tsx
export function BuildSchema({ schema, onSchemaChange }: BuildSchemaProps) {
  const scheme = useComputedColorScheme();
  useSchemaNodes(schema);
  const selection = useFieldSelection();
  const edges = useRelationshipEdges(schema);
  const { handleConnect, handleReconnect, handleEdgesChange, message } =
    useRelationshipEditing(schema, onSchemaChange);
  const { handleRename } = useRenameField(schema, selection, onSchemaChange);

  return (
    <div className={classes.workspace}>
      <div className={classes.canvas}>
        <FieldSelectionProvider value={selection}>
          <ReactFlow<TableNode>
            defaultNodes={/* from useSchemaNodes */}
            edges={edges}
            onEdgesChange={handleEdgesChange}
            nodeTypes={NODE_TYPES}
            onConnect={handleConnect}
            onReconnect={handleReconnect}
            onPaneClick={() => selection.select(null)}
            deleteKeyCode={null}
            forceColorMode={scheme}
            fitView
            fitViewOptions={FIT_OPTIONS}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </FieldSelectionProvider>
      </div>
      <FieldInspector schema={schema} selection={selection} onRename={handleRename} />
      <footer className={classes.footer}>
        {/* counts + message */}
      </footer>
    </div>
  );
}
```

**Why:** each hook is testable with `renderHook`; each UI file is reviewable and deletable independently; the file stops conflating "canvas orchestration" with "panel rendering."

### 3.2 `TableCard.tsx` — missing `memo`, context performance hazard

- Custom node components must be `memo`-wrapped so unrelated prop changes do not re-render every node (React Flow community guideline; also plain React practice when the parent re-renders on each selection change).
- `use(FieldSelectionContext)` means **every** `TableCard` re-renders whenever `selection` changes, even though only one card cares. Two fixes:
  - **Minimal:** `export const TableCard = memo(function TableCard(...) { ... });` — blocks irrelevant prop changes only.
  - **Preferred (if table count grows):** split context. `TableCard` receives `selectedFieldId?: string` via node data; the `select` callback goes in a separate stable context (`useCallback`-wrapped setter). Selection changes only re-render the affected node.

Also: `aria-label` on `Icon` is redundant since the `UnstyledButton` already has a label. Use `aria-hidden` or drop it.

### 3.3 `handleEdgesChange` — indirect; document or replace

`changes.applyTo(edges).filter(e => e.selected)` works but is semantically indirect: `applyTo` is for applying changes to a changeset, not for reading selection. Either:

- **document** with a comment ("borrow reducer output to compute the resulting selection set"), or
- **replace** with `onSelectionChange` (React Flow provides `{ nodes, edges }`), which is the natural event for selection.

Keep the current approach only if the existing test coverage already exercises it — otherwise `onSelectionChange` is clearer.

### 3.4 `ExploreSchema.tsx` — accessibility & fit behavior

- `aria-hidden="true"` on the canvas is correct (canvas has no accessible semantics), **but** the only accessibility path to "select a table" is the `Select` above. Add a comment: _"canvas click is a mouse enhancement; equivalent operation is in the Select."_
- `onEngineStop={() => graph.current?.zoomToFit(...)}` refits every time the engine stops. If a user zooms and the engine restarts, the view resets. Add a `hasFitted` ref so auto-fit runs only once per mount.
- Label overlap when `activeId === null` and all 15 tables display labels — acceptable for prototype, but note in the code so it does not surprise later.

### 3.5 `buildGraph.ts` — magic numbers, string parsing

- `index * 47` for the two-table layout is an unexplained heuristic. Extract as a named constant or replace with an explicit `layout` parameter:
  ```ts
  type Layout = 'diagonal' | 'grid';
  export function getTableNodes(
    tables: SchemaTable[],
    layout: Layout = tables.length === 2 ? 'diagonal' : 'grid',
  ): TableNode[];
  ```
- `sourceHandle.slice(4)` / `targetHandle.slice(3)` rely on `'out:'` / `'in:'` lengths. Extract:
  ```ts
  const OUT_PREFIX = 'out:' as const;
  const IN_PREFIX = 'in:' as const;
  ```
  and use `startsWith(OUT_PREFIX) ? sourceHandle.slice(OUT_PREFIX.length) : undefined`.

### 3.6 `BuildSchema.tsx` — `initialNodes` vs `schema.tables` dual source

`initialNodes` is computed once on mount. If `schema.tables` later gains tables, `setNodes(nodes => nodes.map(...))` never creates nodes for new tables. This is fine while fixtures are static, but the intent must be explicit. Add a comment near `useSchemaNodes`:

> Only the table set at mount is supported. Runtime add/remove requires extending this sync to diff by table ID.

### 3.7 Small issues

| Location                   | Issue                                                                    | Fix                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `handleConnection`         | `crypto.randomUUID()` used inline                                        | extract `newRelationshipId()` for testability                                                                     |
| `RenameField` key          | `key={`${table.id}/${field.id}/${field.name}`}` re-mounts form on rename | keep `key` as `${table.id}/${field.id}`, add `useEffect(() => setName(field.name), [field.name])` inside the form |
| `schema.ts` `LARGE_SCHEMA` | tests index `SMALL_SCHEMA.relationships[0]` — fragile                    | export named constants for the fixture relationships used in tests                                                |
| `TableCard` import         | `import classes from '../BuildSchema.module.css'`                        | move card styles to `TableCard.module.css`; ends cross-component CSS import                                       |

---

## 4. Extracted hooks

Each is a self-contained unit; nothing else should live in `hooks/` (pure functions stay in `model/` or `graph/`, or `hooks/` becomes the next `utils/`).

### `useFieldSelection.ts`

```ts
type FieldSelection = { tableId: string; fieldId: string } | null;
interface FieldSelectionControls {
  selection: FieldSelection;
  select: (next: FieldSelection) => void;
}

const SelectionContext = createContext<FieldSelectionControls | null>(null);
const SelectContext = createContext<(next: FieldSelection) => void>(() => {});

export function FieldSelectionProvider({ value, children }: { value: FieldSelectionControls; children: ReactNode }) {
  return (
    <SelectContext.Provider value={value.select}>
      <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
    </SelectContext.Provider>
  );
}
export const useFieldSelection = () => useContext(SelectionContext)!;
export const useSelectField = () => useContext(SelectContext);
```

Two contexts so that components that only need the setter (e.g., `TableCard` if it uses the hook form) do not re-render when the selection changes.

### `useSchemaNodes.ts`

```ts
export function useSchemaNodes(schema: Schema) {
  const [initialNodes] = useState(() => getTableNodes(schema.tables));
  const { setNodes } = useReactFlow<TableNode>();
  useEffect(() => {
    const byId = new Map(schema.tables.map((t) => [t.id, t]));
    setNodes((nodes) =>
      nodes.map((node) => {
        const data = byId.get(node.id);
        return data && data !== node.data ? { ...node, data } : node;
      }),
    );
  }, [schema.tables, setNodes]);
  return { initialNodes };
}
```

Keeps the "authored positions separate from simulation state" invariant — positions stay in React Flow's store; only `data` is synced.

### `useRelationshipEdges.ts`

```ts
export function useRelationshipEdges(schema: Schema) {
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(() => new Set());
  const edges = useMemo(
    () => schema.relationships.map((r) => getRelationshipEdge(r, selectedEdgeIds.has(r.id))),
    [schema.relationships, selectedEdgeIds],
  );
  const handleEdgesChange = useCallback(
    (changes: EdgeChangeset<Edge>) => {
      setSelectedEdgeIds(
        new Set(
          changes
            .applyTo(edges)
            .filter((e) => e.selected)
            .map((e) => e.id),
        ),
      );
    },
    [edges],
  );
  return { edges, handleEdgesChange };
}
```

If migration to `onSelectionChange` is chosen (§3.3), this becomes a direct `setSelectedEdgeIds(new Set(edges.map(e => e.id)))`.

### `useRelationshipEditing.ts`

Owns `handleConnection`, `handleReconnect`, message state, `newRelationshipId()`.

### `useRenameField.ts`

Wraps `renameField` + message feedback; no form state — the form owns its own input value.

---

## 5. Extracted UI

Each `ui/<Component>/` folder is a unit: component + its CSS. Deleting the folder removes the component and all its styling — no dangling selectors, no cross-imports.

**`ui/BuildSchema/BuildSchema.module.css`** should contain only `.workspace`, `.canvas`, `.inspector`, `.form`, `.footer` and the `@container` rule.

**`ui/TableCard/TableCard.module.css`** should contain `.card`, `.cardHeader`, `.field`, `.row`, `.name`, `.handle` — all styles that describe the card's internals.

**`ui/RenameFieldForm/RenameFieldForm.tsx`** is the standalone form:

```tsx
function RenameFieldFormImpl({ field, onRename }: { field: SchemaField; onRename: (name: string) => void }) {
  const [name, setName] = useState(field.name);
  useEffect(() => setName(field.name), [field.name]);
  const trimmed = name.trim();
  function submit(e: FormEvent) {
    e.preventDefault();
    if (trimmed) onRename(trimmed);
  }
  return (
    <form onSubmit={submit} className={classes.form}>
      <TextInput label="Field name" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
      <Button type="submit" size="xs" disabled={!trimmed || trimmed === field.name}>
        Rename field
      </Button>
    </form>
  );
}
export const RenameFieldForm = memo(RenameFieldFormImpl);
```

Note: the `key={table.id/field.id}` reset now only re-mounts when a _different field_ is selected; renaming the same field no longer re-mounts because the `useEffect` syncs `name`.

**`ui/FieldInspector/FieldInspector.tsx`** is the panel:

```tsx
export function FieldInspector({ schema, selection, onRename }: FieldInspectorProps) {
  const table = selection ? schema.tables.find((t) => t.id === selection.tableId) : undefined;
  const field = table?.fields.find((f) => f.id === selection?.fieldId);
  return (
    <aside className={classes.inspector} aria-label="Field inspector">
      <Title order={2} size="h5">
        Field inspector
      </Title>
      {field && table ? (
        <>
          <Text size="sm" c="dimmed">
            {table.name}
            {field.type && ` · ${field.type}`}
            {field.isPrimary && ' · Primary key'}
          </Text>
          <RenameFieldForm key={`${table.id}/${field.id}`} field={field} onRename={onRename} />
        </>
      ) : (
        <Text size="sm" c="dimmed">
          Choose a field on the canvas.
        </Text>
      )}
    </aside>
  );
}
```

---

## 6. React best practices applied

| Practice                             | Where                                                        | Effect                                                                                |
| ------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `memo` custom node components        | `TableCard`, `FieldInspector`, `RenameFieldForm`             | Avoids re-render on unrelated parent state                                            |
| Stable `nodeTypes` outside component | `BuildSchema` already has `NODE_TYPES` at module top         | Preserved; warning if someone moves it in                                             |
| Split context (state vs. setter)     | `useFieldSelection`                                          | Selector-free but prevents full-tree re-renders when only `select` is used            |
| Stable callbacks via `useCallback`   | `handleEdgesChange`, `select`, `onRename`                    | Prevents downstream re-renders                                                        |
| `useMemo` for derived lists          | `useRelationshipEdges`, `projectExploreGraph` call           | Same                                                                                  |
| Effects: one concern, declared deps  | `useSchemaNodes`                                             | Positions untouched; only `data` synced                                               |
| Controlled form + `useEffect` sync   | `RenameFieldForm`                                            | External rename reflects in input; `key` no longer causes remount-on-rename           |
| CSS colocated with component         | `ui/*/`                                                      | Each component owns its styles; deletion is a single folder                           |
| No constructed context values        | `FieldSelectionProvider` receives memoized value from caller | `SelectionContext value` is stable per `selection` change, not per render             |
| Lazy-loaded view                     | `NodeStudioPage` already lazy-loads `ExploreSchema`          | Preserved                                                                             |
| Canvas accessibility                 | `ExploreSchema`                                              | `aria-hidden` on canvas is correct; equivalent `Select` is the a11y path — documented |

---

## 7. Migration order

Do this incrementally so `AGENTS.md`'s "pause after first interactive canvas" checkpoint still applies.

1. **Pure moves only.** Create `model/` and `graph/`; move `schema.ts`, `schemaEdits.ts`, `buildGraph.ts`, `exploreGraph.ts` and their tests. Run tests. No behavior change.
2. **`index.ts`.** Add `src/features/node-studio/index.ts` exporting `NodeStudioPage` (and optionally `Schema`). Update the app shell import if it currently reaches into the feature.
3. **Extract CSS.** Split `BuildSchema.module.css` into three files (`BuildSchema`, `TableCard`, `FieldInspector`). Run in browser.
4. **Extract UI.** Move inline `RenameField` → `ui/RenameFieldForm`; inline inspector → `ui/FieldInspector`; move `TableCard` → `ui/TableCard/`. Run in browser.
5. **Extract hooks.** Move state/effects into `hooks/useSchemaNodes.ts`, `useRelationshipEdges.ts`, `useRelationshipEditing.ts`, `useRenameField.ts`, and convert `fieldSelection.ts` → `hooks/useFieldSelection.ts` with split contexts. `BuildSchema.tsx` becomes orchestrator.
6. **Memoization pass.** `memo` on `TableCard`, `FieldInspector`, `RenameFieldForm`; `useCallback` on the handlers returned by hooks.
7. **Small fixes** (§3.5, §3.7): prefix constants, `newRelationshipId`, `hasFitted` ref in `ExploreSchema`, `useEffect` sync in `RenameFieldForm`.
8. **Tests**: add `buildGraph.test.ts`, `schema.test.ts`, and one integration test for select → rename → relationship endpoints unchanged.

At each step, verify in browser (`/node-studio`, both samples, both tabs) and run the targeted tests. `AGENTS.md` allows skipping repo-wide formatting and unrelated lint cleanup.

---

## 8. Testing plan

| Level         | Test                                                                                                | Covered by                                                             |
| ------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Pure          | relationship lifecycle, rename immutability, fixture validity                                       | `model/schemaEdits.test.ts` (exists), `model/schema.test.ts` (new)     |
| Pure          | graph projection, `getRelationship` prefix parsing                                                  | `graph/buildGraph.test.ts` (new), `graph/exploreGraph.test.ts` (moved) |
| Hook          | `useSchemaNodes` syncs `data` without touching positions                                            | `hooks/useSchemaNodes.test.ts` (new, `renderHook`)                     |
| Hook          | `useRelationshipEditing` rejects duplicates and unknown endpoints                                   | `hooks/useRelationshipEditing.test.ts` (new)                           |
| Integration   | select field → inspector shows name → submit rename → edges unchanged, `onSchemaChange` called once | `ui/BuildSchema/BuildSchema.test.tsx` (new)                            |
| E2E (browser) | `/node-studio` renders, tab switch, sample switch, drag-connect                                     | manual, per `AGENTS.md`                                                |

The integration test is the key one that does not exist today and would catch the select→rename path breaking.

---

## 9. AGENTS.md alignment

| AGENTS.md directive                                              | Status                                                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Feature-local; no shared stores / backend / dashboard schemas    | ✅ after migration; enforced by `index.ts`                                                            |
| `@xyflow/react` for authoring; use built-in interactions and CSS | ✅ preserved                                                                                          |
| Plain table cards; feature-local CSS fine                        | ✅ `ui/*/` per-component CSS modules                                                                  |
| Stable table and field IDs; positions separate from simulation   | ✅ kept; position stays in React Flow's store; only `data` synced                                     |
| Keep checks proportional                                         | ✅ tests are colocated and per-file; no repo-wide lint cleanup                                        |
| Report blocking lint rule with file + rule                       | ⚠️ potential warning on constructed context value; mitigated by memoizing the provider value (see §6) |
| Pause after first interactive canvas                             | ⏸ run the browser check after step 5 (hooks extraction) before continuing                             |

---

## 10. Deliberately out of scope

- Custom Mantine theme tokens.
- Shared component extraction (button/card primitives stay local).
- Dashboard schema, widget registration, stores, backend.
- Replacing `react-force-graph-2d` in `ExploreSchema` (already lazy-loaded).
- Rewriting `ExploreSchema` label overlap logic — noted, not fixed.

---

_Reported lint concern:_ if `react/jsx-no-constructed-context-values` or its equivalent is enabled, the inline `value={{ selection, select }}` in the current `BuildSchema.tsx` will warn. Fix by memoizing the provider value (see `useFieldSelection` in §4). No other rules were observed to block the prototype.
