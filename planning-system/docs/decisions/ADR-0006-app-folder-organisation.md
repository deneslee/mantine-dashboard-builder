---
id: ADR-0006
title: Folder organisation inside the web app
status: open
date: 2026-11-24
milestone: M2
supersedes: null
was: D-05
---

## Question

- Features grouped by file kind (`components/`, `hooks/`) or by concern?
- Routes in `src/app/routes` or `src/routes`?
- Kebab-case folder names?
- Renames that fix name clashes (ADR-0019)?

## Evidence

- R3. ChatGPT direction D6 points to file-kind folders (R1 §C)

## Options

- Listed in R3

## Recommendation

- Research: file kind first, routes in `src/routes`

## Decision

- Not decided

## Blocks

- App-folder tasks (M4)
