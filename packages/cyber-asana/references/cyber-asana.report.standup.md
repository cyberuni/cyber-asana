---
description: The daily standup report — what a member did, what they are doing today in the current sprint, and what blocks them, with story and task points kept apart.
tags: [asana, scrum, reports, standup]
implements: cyber-asana.report@1
merge: replace
---

## Audience

One team member, or the team in the daily meeting. They decide what to pick up next and who to ask for help. The window and the blocked signals come from the `cyber-asana.scrum` policy, not from this reference.

## Data

```bash
cyber-asana report standup --json
cyber-asana report standup --member <gid-or-email> --json
```

Add `--scope <name>` for a scope other than the default and `--sprint <ref>` for a sprint other than the current one. `--team` is not built yet and exits 2 with `team-unsupported`.

The JSON holds:

- `member`, `scope`, `today_date`, `timezone`, `timezone_source`, `window` (`setting`, `from`, `since`).
- `sprint`, or `null` with `sprint_note` saying why there is no current sprint.
- `done`, `today`, `blocked`: each has `count`, `points` (`story` and `task`, never merged), and `tasks`. A task has `gid`, `name`, `due_on`, `url`, `reason` (Today only), and `blockers` (Blocked only; each names its `signal` and, for a dependency, the blocking `task`).
- `today_basis`: `in-progress-or-due`, or `incomplete-and-assigned` when no workflow state is carried.
- `points_tracked`: whether each points field is registered.
- `notes`: what the report fell back on.

## Layout

```
**<member> — <today_date>** (<sprint name>, or "no current sprint")

**Done** (<n>; <story> story points, <task> task points)
- <task name>

**Today** (<n>)
- <task name> — <reason or due date>

**Blocked** (<n>)
- <task name> — blocked by <blocker>
```

Leave out a points figure whose field is not tracked. Write `none` under a section whose `count` is 0.

## Judgment

- Say when the report fell back: when `sprint` is null, give `sprint_note`; when `today_basis` is `incomplete-and-assigned`, say Today lists every open assigned task because no workflow state is tracked.
- Shorten or merge the names of trivial tasks. Do not drop a blocked task.
- Raise each blocker as a question for the person who can clear it. Do not invent a blocker, a reason, or an estimate the data does not hold.
- Never add story points and task points into one figure.

## Follow-up

- Offer to adjust the window with `--sprint`, or to show a teammate with `--member`.
- Offer to file a task for a blocker nobody owns, through the `asana` skill's create-task procedure.
- Offer `cyber-asana sprint tasks` when the member wants the whole sprint.
