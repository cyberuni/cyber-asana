---
description: The retro report — carry-over, scope change, blocked tasks and time blocked, cycle time, and estimate against actual, as the facts a retro discusses.
tags: [asana, scrum, reports, retro]
implements: cyber-asana.report@1
merge: replace
---

## Audience

The team in the retro. They decide what to change. The report is the facts that start the discussion, not the discussion itself. The blocked signals come from the `cyber-asana.scrum` policy.

## Data

```bash
cyber-asana report retro --json
cyber-asana report retro --sprint previous --json
```

Add `--scope <name>` for a scope other than the default. A sprint with no section fails with `sprint-none`.

The JSON holds:

- `scope`, `sprint`.
- `carry_over`: the tasks still open at the end of the sprint.
- `scope_change`: `source`, `added` (`count`, `points`, `tasks`), and `removed` (same shape, or `null` without a snapshot).
- `blocked`: `tasks` (each with `hours` blocked and `open` when still blocked) and `total_hours`. It is best effort from the task history (system stories): a dependency or tag from `blocked_signals`. A `state:<x>` signal is not read.
- `cycle_time`: `basis` (`created_at`), `count`, `mean_days`, `median_days`.
- `estimate_vs_actual`: `tasks` and `totals`, with `estimate` (the points committed in the snapshot) and `actual` (the points the finished task carries now), each `story` and `task`; or `null` without a snapshot.
- `points_tracked`, and `notes`: what could not be read.

## Layout

```
**Retro — <sprint name>**

Carry-over: <n>  ·  Scope: +<added> −<removed>  ·  Blocked: <n> tasks, <hours>h  ·  Cycle time: mean <d> days, median <d> days
Estimate vs actual: <estimate> → <actual> story points, <estimate> → <actual> task points

**Went well** / **Did not go well** / **Try next**
<filled from the discussion>

**Actions** (at most three, each with an owner)
- <action> — <owner>
```

Leave out a points figure whose field is not tracked. Show `unavailable` where the data is `null`.

## Judgment

- Follow the `## Retro` section of `cyber-asana.scrum`: open with the previous retro's actions, then the facts, then the discussion. Use the facts to ask questions, not to assign blame.
- State the limits: blocked time is best effort from history; cycle time starts at creation, not at first work; the estimate comparison needs the commitment snapshot.
- Read what the numbers might mean, and label it a question. Do not invent a cause, a mood, or a figure.
- Never add story points and task points into one figure.

## Follow-up

- File each agreed action as a task through the `asana` skill's create-task procedure, with the owner as assignee. Do it only after the user agrees to the action.
- Offer `cyber-asana sprint close`, which carries the open tasks over as the policy's `carry_over` says (`move` or `leave`). Run it only on the user's yes.
- Offer `/cyber-asana:sprint-plan` for the next sprint.
