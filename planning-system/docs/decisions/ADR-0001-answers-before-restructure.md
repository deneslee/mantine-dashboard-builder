---
id: ADR-0001
title: Answers given before the restructure
status: accepted
date: 2026-11-22
milestone: M1
supersedes: null
was: A-1…A-12
---

## Question

- Requirements the user gave on 2026-11-21 and 2026-11-22 (reconstructed from the old decision queue)

## Decision

- A-1 Second app: none now. Structure the repo monorepo-style (`apps/`, `packages/`). Packages are not published
- A-2 Users: several users, no live interaction between them
- A-3 Record provider: the user picks it in the UI. Every capability is in every build
- A-4 Auth: Convex Auth for now
- A-5 Drafts: kept in the browser, keyed by user
- A-6 Storybook tests in CI: optional
- A-7 Relay image: not deployed. Build the bundle only
- A-8 node-studio, explore, templates: keep
- A-9 Credentials: "probably" stay in the browser vault (open part: ADR-0018)
- A-10 Order of work: restructure, tooling, simplification, CI, tests (challenged by ADR-0002)
- A-11 Tests: shrink the suite to what is useful (number: ADR-0012)
- A-12 Structure references: not Mantine's repo; look at TanStack Start, Nx, Turborepo

## Consequences

- A later ADR that changes one answer supersedes this ADR for that answer only
