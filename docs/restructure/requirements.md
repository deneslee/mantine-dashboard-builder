# Your requirements

These are your answers and requirements so far. They are not ADRs: an ADR is written only for a decision, and only you accept it. The decisions are listed in [../adr/README.md](../adr/README.md).

## Answers from 2026-11-21 and 2026-11-22

| #    | Topic                           | Your answer                                                                                        |
| ---- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| A-1  | Second app                      | None now, but structure the repo monorepo-style (`apps/`, `packages/`). Packages are not published |
| A-2  | Users                           | Several users, no live interaction between them                                                    |
| A-3  | Record provider choice          | The user picks it in the UI, and every capability is included at build time                        |
| A-4  | Auth                            | Convex Auth for now                                                                                |
| A-5  | Drafts                          | Kept in the browser, keyed by user                                                                 |
| A-6  | Storybook tests in CI           | Optional                                                                                           |
| A-7  | Relay image                     | Not deployed; build the bundle only                                                                |
| A-8  | node-studio, explore, templates | Keep                                                                                               |
| A-9  | Credentials                     | "Probably" stay in the browser vault (see ADR-0017)                                                |
| A-10 | Order of work                   | Restructure, then tooling, then simplification, then CI, then tests (U10); see ADR-0001            |
| A-11 | Tests                           | Shrink the suite to what is useful (U8); see ADR-0011                                              |
| A-12 | Structure references            | Do not copy Mantine's repo structure; look at TanStack Start, Nx and Turborepo                     |

## Original requirements

- **U7.** Keep Vite+. Consider better task running and caching alongside it.
- **U8.** Tests are too heavy; shrink them to what is useful.
- **U9.** Linting is too much and too strict, including the doc linting.
- **U10.** Order: restructure, then tooling, simplification, CI, tests.
- **U11.** Copy library skills in locally after the tooling work.

## ChatGPT's direction (proposals only, not decided)

- **D1.** The project becomes a reusable platform for several apps.
- **D2.** Plugins stay internal folders, not a package each.
- **D3.** A capability can have several implementations in the build, with the active one chosen at runtime.
- **D4.** Several alternative backends sit behind the same contracts.
- **D5.** The restructure is staged and preserves behaviour.
- **D6.** Layout of `apps/`, `packages/` and the backend. Feature folders in the Bulletproof-React style, with `components/` and `hooks/`. No ambiguous same-name folders and no grab-bag folders.

## Earlier open questions and where they went

Each earlier open question now has an ADR:

| Question                                                                 | Decision           |
| ------------------------------------------------------------------------ | ------------------ |
| Q4: which capabilities are real (records only, or also search and auth)? | ADR-0007           |
| Q6: drafts, connections and vault as records?                            | ADR-0016           |
| Q7: chart widgets                                                        | ADR-0014           |
| Q8: Action and ContextPanel scaffolding                                  | ADR-0007           |
| Q9: relay as a workspace app                                             | ADR-0003           |
| Q10: `/debug`                                                            | ADR-0015           |
| Q11: feature folders                                                     | ADR-0005           |
| Q12: runner and type-aware lint                                          | ADR-0008, ADR-0009 |
| G-030                                                                    | ADR-0012           |
