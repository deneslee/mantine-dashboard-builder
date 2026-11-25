---
name: planning
description: Rules for the planning files in docs/ (product brief, roadmap, milestones, tasks, research, decisions). Use before you create, edit, move or close any of them.
---

# Planning

## Layout

- `docs/PRODUCT.md`: what the product is. Rules: skill `product-brief`.
- `docs/roadmap.md`: generated. Do not edit.
- `docs/milestones/M<n>-<slug>/README.md`: one milestone.
- `docs/milestones/M<n>-<slug>/T<n>-<slug>.md`: a task of that milestone.
- `docs/milestones/M<n>-<slug>/R<n>-<slug>.md`: research for that milestone only.
- `docs/research/R<n>-<slug>.md`: research for more than one milestone.
- `docs/decisions/ADR-<nnnn>-<slug>.md`: one decision. `README.md` there is generated.
- `docs/catalog/`: capability catalog. Not a planning file.

## IDs

- `M`, `T`, `R`: one global sequence per letter. No padding. ADR: 4 digits.
- Get the next id: `node scripts/plan-index.mjs --next T`.
- Never reuse or renumber an id. To move a task, move the file. The id stays.
- The id is in the file name and in `id:`. Both must match.
- Refer to other items by id (`T12`, `ADR-0004`). Link only where a reader must open the file.

## Status (frontmatter `status:`)

- Milestone, task: `proposed` → `planned` → `in-progress` → `done`. Also `blocked`, `dropped`.
- Research: `open` → `concluded` | `abandoned`.
- Decision: `open` → `proposed` → `accepted` | `rejected` | `deferred` | `superseded`.
- The file's frontmatter is the only owner of its status. Never copy a status into another file.
- Only the user sets `accepted`, `rejected` or `done` on a milestone.

## Content per type

- Copy the template from `templates/`. Keep its headings. Delete empty optional sections.
- Milestone: goal, exit criteria, out of scope. No file paths, no code names.
- Task: the concrete work. File paths belong here.
- Research: tag each claim: `verified` (file:line or URL), `measured`, `hypothesis`, `proposal`.
- Decision: the question, options, recommendation (with who made it), the user's decision.

## Writing

- Lists, not paragraphs. One fact per line.
- No text that explains the file, the folder or this system. That belongs here.
- Delete a sentence that adds no fact.
- Max lines (without frontmatter): milestone 25, task 40, decision 50, research 120.
- Write a new milestone's tasks only when the milestone becomes `planned`.

## After every change

- `node scripts/plan-index.mjs` (writes `roadmap.md`, `decisions/README.md`, milestone indexes).
- `node scripts/plan-index.mjs --check` must pass before a commit.
