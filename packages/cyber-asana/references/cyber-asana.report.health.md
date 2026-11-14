---
description: The sprint health check — one result per check for estimates, owners, due dates, work in progress, blockers, and sprint structure, each finding with a level and a fix command.
tags: [asana, scrum, reports, health]
implements: cyber-asana.report@1
merge: replace
checks: [H1, H2, H3, H4, H5, H6, H7, H8, H9, H10, H11]
stale_days: 3
wip_limit: 3
overdue_grace_days: 0
---

## Audience

The team during the sprint, and the person who runs the board. They decide what to fix today: a missing estimate, an unowned task, a stuck one, a sprint that was never started. The thresholds above are policy a team can override key by key; `checks` lists the check IDs that run, so removing an ID turns that check off.

| Check | Finds | Level |
| --- | --- | --- |
| H1 | an incomplete sprint task with no estimate (parents excluded) | warning |
| H2 | a parent task (one with subtasks) that carries points | warning |
| H3 | an incomplete sprint task with no assignee | warning |
| H4 | an incomplete sprint task due more than `overdue_grace_days` ago | error |
| H5 | an in-progress task with no change for `stale_days` | warning |
| H6 | a person with more than `wip_limit` tasks in progress | warning |
| H7 | a sprint task that a `blocked_signals` entry marks | warning |
| H8 | a person whose sprint load exceeds their Allocations capacity for its dates; skipped, with the reason, when capacity is unknown | error |
| H9 | the sprint has no section or option in a project of the scope | error |
| H10 | an incomplete task left in a closed sprint | warning |
| H11 | an incomplete task in two sprints | error |

## Data

```bash
cyber-asana report health --json
```

Add `--scope <name>` for a scope other than the default and `--sprint <ref>` for a sprint other than the current one.

The JSON holds:

- `scope`, `today_date`, `timezone`, `timezone_source`, `sprint`, and `sprint_started` (false when the sprint has no section).
- `settings`: the `checks`, `stale_days`, `wip_limit`, and `overdue_grace_days` in force.
- `checks`: one entry per enabled check, with `id`, `name`, `status` (`passed`, `failed`, or `skipped`), `findings`, and for a skipped check its `reason`.
- `findings`: each has `check`, `level` (`error` or `warning`), `message`, `fix` (a command), and `task` (`gid`, `name`, `url`). H6 carries `person` and `tasks` instead of `task`.
- `counts`: findings by level.
- `in_progress_basis`: `status-field`, or `incomplete-and-assigned` when no workflow state is carried (`state_carrier: none`, or `field` with no registered status field), which H5 and H6 then use.
- `notes`: what the report fell back on.

Failures: `sprint-none` when today is before `sprint_anchor_date`, or when the sprint has no section and H9 is not enabled; `policy-incomplete` without an anchor date. When the sprint has no section and H9 is enabled, H9 reports it and the checks that need the sprint's tasks are skipped, so the report still renders.

## Layout

```
**Health — <sprint name>** (<n> errors, <n> warnings)

**Errors**
- <check> <task name> — <message> (fix: <command>)

**Warnings**
- <check> <task name> — <message> (fix: <command>)

**Not checked**
- <check> — <reason>
```

Write `none` under a heading with no findings. Group several findings of one check when it helps reading, and keep every task's fix command.

## Judgment

- Lead with the errors, and say what to do first. A sprint with no section (H9) comes before everything else, because the task checks were skipped.
- Say when the report fell back: when `in_progress_basis` is `incomplete-and-assigned`, say H5 and H6 count every open assigned task because no workflow state is tracked.
- Name each skipped check and its reason. Do not guess a result for a check that did not run, and do not treat H8 as passed.
- Do not recount, re-grade, or invent a finding. Run the `fix` command only after the user agrees.

## Follow-up

- Offer to run a finding's fix command, one at a time, with the user's yes.
- Offer `cyber-asana sprint start` for H9 and `cyber-asana sprint close` for H10.
- Offer to file a task for a blocker nobody owns, through the `asana` skill's create-task procedure.
- Offer to run `cyber-asana report health` again once the fixes are in.
