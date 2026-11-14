---
title: Reports
description: Compute a member's standup, the sprint's health findings, and the team's workload against capacity from the scrum policy and the scope.
sidebar:
  order: 24
---

Reports are computed by the CLI, so the counts and point totals are the same every time. The
`asana-scrum` skill narrates them. Each report is `cyber-asana report <key>` and has a matching
`asana_report_<key>` MCP tool.

```sh
cyber-asana report standup
cyber-asana report standup --member someone@example.com
cyber-asana report standup --scope web --sprint previous --json
cyber-asana report health
cyber-asana report workload
cyber-asana report workload --from 2026-01-19 --to 2026-01-30
```

Every report takes `--scope <name>` (see [Repo config](/cyber-asana/cli/repo-config/)), `--sprint`,
`--json`, and `--toon`.

## `report standup`

| Flag | Meaning |
| --- | --- |
| `--me` | The signed-in user. This is the default. |
| `--member <user>` | Another member, by GID or email. |
| `--team` | Not built yet. Exits `2` with `error.code` `team-unsupported`. |

| Section | What it holds |
| --- | --- |
| Done | Tasks the member completed within `standup_window`, a true completed filter. |
| Today | Incomplete tasks in the current sprint that are in progress, due today, or overdue. |
| Blocked | Incomplete tasks in the current sprint that match a `blocked_signals` entry, each with its blocker. |

Story points and task points are totalled apart for each section, and only when the scope's projects
register those fields.

### How it decides

- **Window.** `standup_window` is `previous_working_day` (midnight of the last working day in the
  member's timezone) or `<n>d` (midnight, `n` days back). Everything completed since then is done.
- **Today's timezone.** The date comes from the timezone `user me` reports, else the machine's. The
  output says which in `timezone_source`.
- **Today without a state.** With `state_carrier: none`, or `field` with no registered `status` field,
  completion is the only state, so Today lists every incomplete assigned task. `notes` says so.
- **Blocked.** `dependency` lists the task's incomplete dependencies as the blocker. `tag:<name>`
  matches a tag, and `state:<state>` matches the status option. Only the current sprint is listed.
- **No current sprint.** The report carries on without sprint filters, and `sprint_note` says why:
  the anchor date is unset, today is before it, or the sprint's section does not exist. A sprint you
  name with `--sprint` that has not started fails with `sprint-none`.

The `cyber-asana.report.standup` reference holds the layout the skill follows; see
[Overriding references](/cyber-asana/reference/overriding-references/).

## `report health`

One result per enabled check over the sprint's tasks, each finding with a level (`error` or
`warning`), the task, and a fix command. `--sprint` picks a sprint other than the current one.

| Check | Finds | Level |
| --- | --- | --- |
| H1 | an incomplete sprint task with no estimate (parents excluded) | warning |
| H2 | a parent task (one with subtasks) that carries points | warning |
| H3 | an incomplete sprint task with no assignee | warning |
| H4 | an incomplete sprint task due more than `overdue_grace_days` ago | error |
| H5 | an in-progress task with no change for `stale_days` | warning |
| H6 | a person with more than `wip_limit` tasks in progress | warning |
| H7 | a sprint task that a `blocked_signals` entry marks | warning |
| H8 | the sprint over capacity | error |
| H9 | the sprint has no section in a project of the scope | error |
| H10 | an incomplete task left in a closed sprint | warning |
| H11 | an incomplete task in two sprints | error |

The `cyber-asana.report.health` reference sets which checks run and the thresholds in its
frontmatter: `checks` (default: all eleven), `stale_days` (3), `wip_limit` (3), and
`overdue_grace_days` (0). Override them one key at a time, as in
[Overriding references](/cyber-asana/reference/overriding-references/).

- **H8 is skipped for now.** It needs Asana Allocations, which arrive with the workload report. The
  check shows as `skipped` with the reason `capacity unknown: allocations not wired yet`; it never
  shows as passed.
- **In progress without a state.** With `state_carrier: none`, or `field` with no registered `status`
  field, H5 and H6 count every incomplete assigned sprint task, and `notes` says so.
- **No current sprint.** Today before `sprint_anchor_date` fails with `sprint-none`, and no anchor
  date fails with `policy-incomplete`. When today's sprint has no section, H9 reports it and the
  checks that read the sprint's tasks are skipped, so the report still renders. With H9 left out of
  `checks`, that case fails with `sprint-none` instead.
- **Exit code.** Findings do not change it: a report that ran exits `0`. Read `counts` for the result.

## `report workload`

Per person, the load of their incomplete assigned tasks against the capacity Asana Allocations
give for the window, and a team total. The window is the sprint's dates, or `--from <date> --to
<date>` (both, `YYYY-MM-DD`), which counts the scope's incomplete assigned tasks due inside it
(tasks with no due date are left out, and `notes` counts them). `--sprint` and `--from`/`--to`
cannot be combined. `--workspace <gid>` sets the workspace for out-of-office reads (default
`ASANA_WORKSPACE_GID`).

For each person it shows:

- the task count, story points, and task points, each kept apart;
- effort hours: both kinds times `hours_per_point`, with the two parts and the total;
- capacity hours from [Allocations](/cyber-asana/cli/allocations/), clipped to the window: a percent
  allocation is `percent × working_hours_per_day × working days inside`, and an hours allocation is
  its hours as given when it lies inside the window, in proportion to the days inside when it
  extends past;
- utilization (effort over capacity, in percent) and a flag: `over` above `over_allocation_pct`,
  `under` below `under_allocation_pct`, `ok` between, `unknown` without capacity.

The `cyber-asana.report.workload` reference sets the two thresholds in its frontmatter
(`over_allocation_pct: 100`, `under_allocation_pct: 60`). Override them one key at a time, as in
[Overriding references](/cyber-asana/reference/overriding-references/).

- **Capacity is Allocations only.** There is no capacity in config (D4). A workspace whose plan has
  no allocations answers 402: every person's capacity is `unknown` with reason `plan`, the load
  still shows, and no flag is drawn. A person with no allocation overlapping the window is `unknown`
  with reason `no-allocation`.
- **Team total.** Capacity hours and utilization count only people whose capacity is known;
  `capacity_unknown` says how many are not.
- **Out of office is a note.** Entries from `ooo list` that overlap the window appear beside a
  person's capacity and are never subtracted from it (D9).
- **No current sprint.** A sprint with no section fails with `sprint-none`; a half-given or
  backwards window fails with `window-invalid`. Both exit `2`.
- **Exit code.** A report that ran exits `0` whatever it found.
