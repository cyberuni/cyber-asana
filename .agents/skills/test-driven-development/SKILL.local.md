# TDD Local Augmentations

## Commit After Every Cycle

After REFACTOR, with all tests green, commit before moving to the next RED:

```bash
git add -p   # stage only relevant changes
git commit -m "<type>: <what changed>"
```

- Use conventional commit prefix: `feat:`, `fix:`, `refactor:`, `test:`
- Message describes the behavior added, not the implementation
- One commit per completed red-green-refactor cycle; do not batch cycles
- Never commit with red tests

## Changeset When a Unit of Work Is Complete

When a full story, bug fix, or feature is done (all its TDD cycles committed), run `/add-changeset`.

A unit of work is complete when:
- All acceptance criteria are met
- All cycles are committed
- The full test suite is green
