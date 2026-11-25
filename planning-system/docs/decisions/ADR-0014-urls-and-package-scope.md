---
id: ADR-0014
title: URLs and package scope
status: open
date: 2026-11-24
milestone: M2
supersedes: null
was: D-13
---

## Question

- Rename user-visible URLs (`/datasources/$id` to `/connections/$connectionId`)?
- Package scope?

## Evidence

- R3. URL renames break bookmarks and shared links. The scope shows only in import paths (packages are not published)

## Options

- URLs: (a) rename, (b) keep
- Scope: (a) `@dashboard-builder`, (b) `@repo`, (c) other

## Recommendation

- Claude: rename the URLs, scope `@dashboard-builder`

## Decision

- Not decided

## Blocks

- Package extraction (scope), app renames (URLs)
