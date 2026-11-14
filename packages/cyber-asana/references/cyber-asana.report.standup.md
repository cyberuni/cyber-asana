---
description: The daily standup report — what a member (or each person of the team) did, what they are doing today in the current sprint, and what blocks them, with story and task points kept apart.
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
cyber-asana report standup --team --json
```

Add `--scope <name>` for a scope other than the default and `--sprint <ref>` for a sprint other than the current one. `--team` reports every person of the scope, grouped by person: a `team` scope's members (including people with no task yet), else the assignees seen in the scope's tasks. It cannot be combined with `--me` or `--member`.

The JSON holds:

- `member`, `scope`, `today_date`, `timezone`, `timezone_source`, `window` (`setting`, `from`, `since`).
- `sprint`, or `null` with `sprint_note` saying why there is no current sprint.
- `done`, `today`, `blocked`: each has `count`, `points` (`story` and `task`, never merged), and `tasks`. A task has `gid`, `name`, `due_on`, `url`, `reason` (Today only), and `blockers` (Blocked only; each names its `signal` and, for a dependency, the blocking `task`).
- `today_basis`: `in-progress-or-due`, or `incomplete-and-assigned` when no workflow state is carried.
- `points_tracked`: whether each points field is registered.
- `notes`: what the report fell back on.

With `--team` the JSON has no `member`. It holds `members` instead, one entry per person: `member` (`gid`, `name`) and that person's `done`, `today`, and `blocked`, shaped as above. `count.members` is the number of people. `today_basis`, `points_tracked`, and `notes` appear once for the team. `members` is empty when nobody in the scope has a task.

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

For the team form, one block per person, in the order of `members`, under one header:

```
**Team standup — <today_date>** (<sprint name>, or "no current sprint")

**<person>**
Done (<n>): <task name>, <task name>
Today (<n>): <task name> — <reason or due date>
Blocked (<n>): <task name> — blocked by <blocker>
```

Write `—` for a section with `count` 0 so a person with nothing still shows. Keep each person to the same three lines.

## Judgment

- Say when the report fell back: when `sprint` is null, give `sprint_note`; when `today_basis` is `incomplete-and-assigned`, say Today lists every open assigned task because no workflow state is tracked.
- Shorten or merge the names of trivial tasks. Do not drop a blocked task.
- Raise each blocker as a question for the person who can clear it. Do not invent a blocker, a reason, or an estimate the data does not hold.
- Never add story points and task points into one figure.
- For the team form, lead with who is blocked and on what, then the rest by person. Do not rank people, compare their counts, or call anyone idle: a person with empty sections may be out, or on tasks outside this scope. Say so only when `members` is empty or the user asks.

## Follow-up

- Offer to adjust the window with `--sprint`, to show a teammate in full with `--member`, or the whole team with `--team`.
- Offer to file a task for a blocker nobody owns, through the `asana` skill's create-task procedure.
- Offer `cyber-asana sprint tasks` when the member wants the whole sprint.
