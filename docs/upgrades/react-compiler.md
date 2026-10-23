# React Compiler

Status (Oct 23, 2026): **adopted.** On Oct 22 the Rust port of the compiler (`oxc-transform-react` 0.152, run by `@vitejs/plugin-react` 6.1.2) replaced `babel-plugin-react-compiler` 1.0. Every component and hook compiles, except `VirtualBody` in [FrameTable.tsx](../../src/plugins/widgets/table/FrameTable.tsx), which is skipped on purpose. The rules for writing code are in [grid-and-charts.md › React Compiler](../dashboard/grid-and-charts.md#react-compiler). This page holds the background and the options we turned down.

## How it memoizes

The compiler rewrites each component and hook. In the default `infer` mode, those are capitalized functions that return JSX and `use*` functions. Every value and JSX element they compute goes into a cache (`_c(n)` from `react/compiler-runtime`) and is recomputed only when an input it reads changes reference. This replaces hand-written `useMemo`, `useCallback` and `memo`.

The compiler relies on the [Rules of React](https://react.dev/reference/rules): props, state and hook results are immutable snapshots, so an object or function with the same reference gives the same answer. When the compiler can't prove that, or meets syntax it can't handle, it skips the whole function. The function then runs as plain React: correct, but not memoized. Event handlers defined inside a component count as part of it, so one unsupported statement in a click handler skips the whole component.

Skips are silent by default. There are two kinds:

- **Unsupported syntax** (`Todo` diagnostics): limits of the compiler, listed [below](#unsupported-syntax).
- **Incompatible libraries**: APIs on the compiler's [known list](https://github.com/react/react/blob/main/compiler/packages/babel-plugin-react-compiler/src/HIR/DefaultModuleTypeProvider.ts) whose results can't be cached safely. See [TanStack Virtual](#tanstack-virtual).

## Babel to Oxc

We compared both with React Compiler 1.0 through Babel on Oct 22, 2026, over 165 source files. Both memoize the same 77 files and 119 components and hooks, skip the same ones, and produce an identical bundle. Oxc compiles about 19 times faster (0.2 s against 3.9 s for all files), and a production build takes 3.3 s instead of 9 s. Oxc reports [the same output as the latest experimental Babel release](https://oxc.rs/blog/2026-08-18-react-compiler-support) on more than 100,000 files.

- **Version pin.** plugin-react 6.1.2 requires `oxc-transform-react` `^0.152.0`. For a 0.x version that means 0.152.x only. 0.155.0 is out and reports the same diagnostics for our files; upgrade when plugin-react accepts it.
- **Diagnostics.** `reportDiagnostics` prints every skip as a Vite warning. It replaced `logDiagnostics`, which printed nothing on oxc 0.148 and later. `vite.config.ts` leaves it off, and [lint/compiler.test.ts](../../lint/compiler.test.ts) checks the skips instead ([Checking](#checking)).
- **Suppressions.** As in Babel, an `eslint-disable` or `oxlint-disable` comment for one of the hooks rules in `eslintSuppressionRules` (by default `react-hooks/exhaustive-deps` and `react-hooks/rules-of-hooks`) makes the compiler skip that function. Disabling any other rule changes nothing in the output. That includes oxlint's `react/incompatible-library`, which `FrameTable` disables.

## Unsupported syntax

Checked on oxc 0.152 and 0.155, in a component or one of its handlers:

| Code                                       | Compiles | Write instead                                                                                                                                                                |
| ------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `try` / `catch`                            | yes      |                                                                                                                                                                              |
| any `finally`, with or without `catch`     | no       | A promise chain ending in `.finally()`, as `RouteError` and `SentryVerificationCard` do, or the cleanup after a `try` / `catch`                                              |
| `throw` inside `try`                       | no       | Don't throw what you catch yourself. `new Error()` records the stack when it's created, so pass it straight to whatever records it (`Sentry.captureException(new Error(…))`) |
| `throw` outside `try`, `.then().finally()` | yes      |                                                                                                                                                                              |

Upstream, `finally` support is still a draft ([react#35607](https://github.com/react/react/pull/35607), open since Jan 2026; background in [react#34131](https://github.com/facebook/react/issues/34131)), and `throw` inside `try` is still a `Todo` diagnostic. Oxc keeps its own copy of the compiler and ports upstream fixes, so these arrive here only after upstream fixes them.

## TanStack Virtual

`useVirtualizer` returns the same `virtualizer` object on every render, while `virtualizer.getVirtualItems()` returns different rows as you scroll. A compiled component would cache `getVirtualItems()` against the unchanged `virtualizer`, and the list would freeze ([TanStack/virtual#736](https://github.com/TanStack/virtual/issues/736)). This is called interior mutability. React added `useVirtualizer` to the incompatible list ([react#34493](https://github.com/facebook/react/pull/34493)), so the compiler skips any function that calls it and reports `Use of incompatible library`.

What we do: the call sits in `VirtualBody`, a small component that only renders the rows in view. It is the only function skipped; `FrameTable` around it (columns, headers, sorting) compiles. Keep it that way:

- Call `useVirtualizer` only in a component that just renders the virtual items.
- Don't pass the `virtualizer` itself to a component in `src/`. A compiled child would cache what it reads from it. (Mantine's `Table` parts are in `node_modules`, so they aren't compiled.)

Turned down (Oct 23, 2026):

| Option                                                                                                                          | Why not                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `'use no memo'` in `VirtualBody`                                                                                                | The compiler still reports the warning (checked on 0.152 and 0.155), and `VirtualBody` is skipped either way. Sanity used it to silence the warning ([sanity#14227](https://github.com/sanity-io/sanity/pull/14227)); here it didn't.      |
| A `'use no memo'` wrapper hook around `useVirtualizer` ([TanStack/virtual#743](https://github.com/TanStack/virtual/issues/743)) | The warning moves to the wrapper, and `VirtualBody` gains nothing from memoization.                                                                                                                                                        |
| `directDomUpdates` (announced in [#736](https://github.com/TanStack/virtual/issues/736), June 2026)                             | It writes row positions straight to the DOM, so it needs absolutely positioned rows and a `containerRef`, not our spacer rows. It isn't in the installed `virtual-core` 3.19.0, and the maintainer says the compiler warning stays anyway. |
| `react-hook-tanstack-virtual`, a community binding that works with the compiler                                                 | A new dependency to memoize one small component. Revisit if several components virtualize.                                                                                                                                                 |

## TanStack Table v9

Table v9 is not on the incompatible list ([react.dev](https://react.dev/reference/eslint-plugin-react-hooks/lints/incompatible-library) lists v8's `useReactTable`). With the default selector, `useTable` (here `useAppTable`) returns a new table reference whenever its state changes, so cached reads such as `table.getHeaderGroups()` refresh. `FrameTable` compiles, and its sorting test runs the compiled code.

The trap: a child component that receives a `row`, `column`, `header` or `cell` object and reads state through one of its methods (`row.getIsSelected()`, `column.getIsSorted()`). The object keeps its reference, so once the child is compiled it never updates. Either read the value in the component that owns the table and pass it down as a prop, or use `Subscribe` inside the child. This comes from TanStack Table's React Compiler guide, also in its `table-state` skill (`intent load @tanstack/react-table#table-state`). Today `FrameTable` reads the sort state in its own render, and `VirtualBody` gets `rows`, a new array whenever the row model changes.

## Memoization in this app

- **Test a library hook before you use it.** Ask whether `useMemo(() => api.read(), [api])` would go stale. If it would, the compiler goes stale too, and the call belongs in a small component like `VirtualBody`. If the hook isn't on the known list, the compiler won't notice the problem for you.
- **Correctness must not depend on memoization**, for example an effect that relies on a reference staying the same. The compiler may memoize differently from a hand-written `useMemo` ([debugging guide](https://react.dev/learn/react-compiler/debugging)).
- **Module constants** still help: they keep their reference even in a component the compiler skips ([Charts › Stable props](../dashboard/grid-and-charts.md#charts)).
- **React DevTools** marks compiled components with a "Memo ✨" badge.

## Checking

[lint/compiler.test.ts](../../lint/compiler.test.ts) compiles every file under `src/` with `reportDiagnostics` on and compares the skips with its `SKIPPED` list. A new skip fails `pnpm test`. Make the code compile, or add the skip to the list and write its reason here. To see the warnings in the terminal while developing, set `react({ compiler: { reportDiagnostics: true } })` in `vite.config.ts` for that run.

## When to revisit

- **`finally` lands** (react#35607, then an Oxc release): `try` / `finally` compiles, and the promise-chain rule can go.
- **TanStack Virtual leaves the incompatible list**, or `directDomUpdates` works with a table: `VirtualBody` compiles; delete its line from `SKIPPED`.
- **plugin-react accepts a newer `oxc-transform-react`**: upgrade it and run the check.
