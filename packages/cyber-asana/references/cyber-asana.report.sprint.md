---
description: The sprint review report — what the sprint committed to against what it delivered, the scope change, the burndown, and the completed stories for the demo, with story and task points kept apart.
tags: [asana, scrum, reports, sprint, review]
implements: cyber-asana.report@1
merge: replace
---

## Audience

The team and the stakeholders at the sprint review. They decide what to accept, what to carry over, and what to ask next. The sprint, its commitment, and the points fields come from the scope and the `cyber-asana.scrum` policy, not from this reference.

## Data

```bash
cyber-asana report sprint --json
cyber-asana report sprint --sprint previous --json
```

Add `--scope <name>` for a scope other than the default. `--sprint` takes `current`, `previous`, a number, or a name. A sprint with no section fails with `sprint-none`.

The JSON holds:

- `scope`, `sprint` (`n`, `name`, `start`, `end`).
- `committed`: `source` (`snapshot`, `rebuilt`, or `unavailable`), `count`, `points` (`story` and `task`, never merged), `tasks`. The snapshot is the status update posted by `cyber-asana sprint start --snapshot`; `rebuilt` means it came from task history.
- `completed`, `added`: each has `count`, `points`, `tasks`.
- `removed`: the same shape, or `null` when no snapshot exists to say what left the sprint.
- `completion_rate`: percentages by `count`, `story`, and `task` points, each against everything in the sprint now; `null` where nothing was planned.
- `carry_over_candidates`: the tasks still open.
- `burndown`: one entry per day up to today, with `completed` that day and `remaining` (`count`, `story`, `task`).
- `demo`: `basis` (`story-points` lists completed tasks that carry story points; `completed` lists every completed task when no story points are tracked) and `tasks`.
- `points_tracked`, and `notes`: what the report could not read.

## Layout

```
**<sprint name>** (<start> to <end>)

Committed <n> (<story> story points, <task> task points) · Completed <n> · Added <n> · Removed <n>
Completion: <count>% of tasks, <story>% of story points, <task>% of task points

**Demo**
- <completed story>

**Carry-over candidates**
- <task> — <assignee>, <due>

**Burndown**
<one line on the trend: steady, late, flat>
```

Leave out a points figure whose field is not tracked. Write `none` under a section with no tasks. Show `unavailable` for a figure whose value is `null` or whose `committed.source` is `unavailable`.

## Judgment

- Say where the commitment came from. When `committed.source` is `rebuilt`, say removed tasks cannot be named; when it is `unavailable`, say there is no commitment to compare and offer `sprint start --snapshot` for the next sprint.
- Read the burndown for the trend (flat early, steep late), and say so plainly. Do not predict a finish.
- Shorten the demo list to what a stakeholder cares about; keep every completed story.
- Do not invent a reason a task slipped, a velocity, or a figure the data does not hold.
- Never add story points and task points into one figure.

## Follow-up

- Offer to record feedback from the review as backlog tasks, through the `asana` skill's create-task procedure.
- Offer `/cyber-asana:retro` next.
- Offer to post the review to the project as a status update, once the user has read it.
