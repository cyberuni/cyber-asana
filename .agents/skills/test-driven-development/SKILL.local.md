# TDD Local Augmentations

## Commit After Every Cycle

After REFACTOR, with all tests green, commit before moving to the next RED. Follow the project commit discipline in `AGENTS.md`.

- One commit per completed red-green-refactor cycle; do not batch cycles

## Changeset When a Unit of Work Is Complete

When a full story, bug fix, or feature is done (all its TDD cycles committed), run `/add-changeset`.

A unit of work is complete when:
- All acceptance criteria are met
- All cycles are committed
- The full test suite is green
