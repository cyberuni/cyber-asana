---
description: The workload report — per person, the effort hours of their incomplete assigned tasks against the capacity Asana Allocations give for the sprint's dates, with over and under flags and a team total.
tags: [asana, scrum, reports, workload, capacity]
implements: cyber-asana.report@1
merge: replace
over_allocation_pct: 100
under_allocation_pct: 60
---

## Audience

The team planning or running a sprint, and the person who balances the board. They decide who has room for more work and who needs some taken off. The two thresholds above are policy a team can override key by key: utilization above `over_allocation_pct` flags a person `over`, below `under_allocation_pct` flags them `under`.

Capacity comes only from Asana Allocations (D4). There is none in config. The effort of a task is its story points plus its task points, each kind multiplied by the policy's `hours_per_point`, with the two parts kept apart.

## Data

```bash
cyber-asana report workload --json
```

Add `--scope <name>` for a scope other than the default and `--sprint <ref>` for a sprint other than the current one. `--from <date> --to <date>` replaces the sprint with a window: the scope's incomplete assigned tasks due inside it. Out-of-office reads use `ASANA_WORKSPACE_GID`, or `--workspace <gid>`.

The JSON holds:

- `scope`, `today_date`, `timezone`, `timezone_source`, `sprint` (`null` for a `--from`/`--to` window), `window` (`from`, `to`), `settings`, `hours_per_point`, and `working_hours_per_day`.
- `people`: one entry per person with load or an allocation, each with `person`, `tasks`, `story_points`, `task_points`, `effort_hours` (`story`, `task`, `total`), `capacity`, `utilization_pct`, `flag`, and `ooo` when they are away in the window.
- `capacity`: `status: known` with `hours` and the `allocations` it sums (each clipped to the window), or `status: unknown` with `reason`: `plan` (Asana answered 402: the plan has no allocations) or `no-allocation` (none overlaps the window).
- `flag`: `over`, `under`, `ok`, or `unknown` (capacity unknown, so no flag).
- `team`: `people`, `tasks`, both point totals, `effort_hours`, `capacity_hours` (only people with known capacity; `null` when nobody's is known), `capacity_unknown` (how many people), and `utilization_pct` (load over capacity of the known people only).
- `unassigned_tasks`, `points_tracked` (which points fields are registered), and `notes`.

Capacity is clipped to the dates: a percent allocation counts `percent × working_hours_per_day × the working days inside the window`; an hours allocation counts as given when it lies inside, in proportion to the working days inside when it extends past.

Failures: `sprint-none` when the sprint has no section; `policy-incomplete` without an anchor date (a `--from`/`--to` window needs none); `window-invalid` when only one of `--from` and `--to` is given, a date is malformed, or `from` is after `to`.

## Layout

```
**Workload — <sprint name or window>** (<team load> h of <team capacity> h)

| Person | Tasks | Story pts | Task pts | Effort h | Capacity h | Used | Flag |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <name> | <n> | <n> | <n> | <n> | <n or unknown (reason)> | <n%> | <over / under / ok> |

**Away** — <name>: <dates>

**Not known**
- <name> — <reason>
```

Write `none` under a heading with nothing in it. Keep the story and task parts of the effort apart.

## Judgment

- Lead with the people flagged `over`, then `under`. Say what the numbers suggest, such as moving a task from an over person to an under one, and leave the decision to the team.
- Name every person whose capacity is unknown and why. When the reason is `plan`, say the workspace has no allocations, that the load is still right, and that no flag was drawn. Never guess a capacity or call an unknown person fine.
- Show out-of-office entries beside the capacity as a note. They are never subtracted: say a person is away for part of the window and let the team weigh it.
- Do not recompute, re-flag, or round differently. Do not turn story points into task points or the reverse.

## Follow-up

- Offer `cyber-asana allocation list --assignee <gid>` for a person whose capacity looks wrong, and `cyber-asana allocation create` to record one with the user's yes.
- Offer to reassign a task from an over person to an under one, one at a time.
- Offer `cyber-asana report health`, whose H8 flags the sprint over capacity.
