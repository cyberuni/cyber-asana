---
description: The velocity report — the points each closed sprint completed, story and task points apart, over the policy's window, with the mean.
tags: [asana, scrum, reports, velocity]
implements: cyber-asana.report@1
merge: replace
---

## Audience

The team at planning. They decide how much to commit to. The window (`velocity_window`) comes from the `cyber-asana.scrum` policy, not from this reference.

## Data

```bash
cyber-asana report velocity --json
```

Add `--scope <name>` for a scope other than the default. The report covers closed sprints, so it takes no `--sprint`.

The JSON holds:

- `scope`, `window`.
- `sprints`: the last `window` closed sprints, each with `n`, `name`, and `completed` (`count` and `points`, `story` and `task`, never merged).
- `mean`: the mean per sprint (`count`, `story`, `task`), or `null` with no closed sprint.
- `points_tracked`, and `notes` (for example, fewer closed sprints than the window).

## Layout

```
**Velocity** (last <window> closed sprints)

| Sprint | Tasks | Story points | Task points |
| --- | --- | --- | --- |
| <name> | <n> | <n> | <n> |

Mean per sprint: <tasks> tasks, <story> story points, <task> task points
```

Leave out a points column whose field is not tracked. When `mean` is null, say there is no closed sprint yet.

## Judgment

- Say how many sprints the mean covers when it is fewer than the window (`notes`).
- Describe the trend in a sentence only when at least three sprints support it.
- Do not turn the mean into a promise: offer it as a starting point for the next commitment.
- Never add story points and task points into one figure.

## Follow-up

- Offer to plan the next sprint against this mean.
- Offer `cyber-asana report sprint --sprint previous` to look inside one sprint.
