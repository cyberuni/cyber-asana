---
title: Reports
description: Compute a member's standup, the sprint review, retro data, velocity, the sprint's health findings, the team's workload, and the dashboard that runs them together, from the scrum policy and the scope.
sidebar:
  order: 24
---

Reports are computed by the CLI, so the counts and point totals are the same every time. The
`asana-scrum` skill narrates them. Each report is `cyber-asana report <key>` and has a matching
`asana_report_<key>` MCP tool.

```sh
cyber-asana report standup
cyber-asana report standup --member someone@example.com
cyber-asana report standup --team
cyber-asana report standup --scope web --sprint previous --json
cyber-asana report health
cyber-asana report workload
cyber-asana report workload --from 2026-01-19 --to 2026-01-30
cyber-asana report sprint --sprint previous
cyber-asana report retro
cyber-asana report velocity
cyber-asana report dashboard
```

Every report takes `--scope <name>` (see [Repo config](/cyber-asana/cli/repo-config/)), `--sprint`,
`--json`, and `--toon`.

## `report standup`

| Flag | Meaning |
| --- | --- |
| `--me` | The signed-in user. This is the default. |
| `--member <user>` | Another member, by GID or email. |
| `--team` | Every person of the scope, grouped by person. Cannot be combined with `--me` or `--member`. |

| Section | What it holds |
| --- | --- |
| Done | Tasks the member completed within `standup_window`, a true completed filter. |
| Today | Incomplete tasks in the current sprint that are in progress, due today, or overdue. |
| Blocked | Incomplete tasks in the current sprint that match a `blocked_signals` entry, each with its blocker. |

Story points and task points are totalled apart for each section, and only when the scope's projects
register those fields.

### The team standup

`--team` runs the same report for each person of the scope and groups it by person. The people are the
members of a `team` scope, including people with no task yet, and for every other scope kind the
assignees seen in the scope's tasks, ordered by name. Each person has their own Done, Today, and Blocked.
`today_basis`, `points_tracked`, and `notes` are stated once for the team, and `count.members` is the
number of people. A scope with nobody to report on prints `0 members found`. A `team` scope also needs a
sprint model that supports it: the built-in `sections` model stops with `model-unsupported` for one.

### How it decides

- **Window.** `standup_window` is `previous_working_day` (midnight of the last working day in the
  member's timezone) or `<n>d` (midnight, `n` days back). Everything completed since then is done.
- **Today's timezone.** The date comes from the timezone `user me` reports, else the machine's. The
  output says which in `timezone_source`.
- **Today without a state.** With `state_carrier: none` or `sections` (reports do not read sections as
  states), or `field` with no registered `status` field,
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

- **H8 reads capacity from Allocations**, as [`report workload`](#report-workload) does: one error
  per person whose sprint load in effort hours is above `over_allocation_pct` of their capacity (from the `cyber-asana.report.workload` reference) for the sprint's dates, with
  `report workload` as its fix command. When capacity is unknown (a 402 plan limit, or no allocation
  overlapping the sprint) the check shows as `skipped` with the reason, for example
  `capacity unknown: no allocation overlaps the sprint dates`; it never shows as passed. People
  whose capacity is unknown while others' is known are named in `notes`.
- **In progress without a state.** With `state_carrier: none` or `sections`, or `field` with no registered `status`
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
## The commitment snapshot

The review and the retro compare the sprint with what it committed to. The commitment is a status
update that `cyber-asana sprint start --snapshot` posts on each project of the scope once the sprint
holds its tasks: titled `<sprint> started`, with the committed tasks and their points. Asana cannot
edit a status update, so it is posted once per sprint; a second run changes nothing. Without
`--snapshot`, `sprint start` touches no status update.

With no snapshot the reports rebuild the commitment from each task's "moved to the sprint" story: a
task that joined by the end of the sprint's first day was committed. That cannot find a task removed
from the sprint, so `removed` is `null` and `notes` says so.

## `report sprint`

The sprint review (`--scope`, `--sprint`, default the current sprint). A sprint with no section fails
with `sprint-none`.

| Field | What it holds |
| --- | --- |
| `committed` | The commitment and its `source`: `snapshot`, `rebuilt`, or `unavailable`. |
| `completed`, `added`, `removed` | Count, points, and tasks. `removed` is `null` without a snapshot. |
| `completion_rate` | Percent by count and by each kind of points, against everything in the sprint now; `null` where nothing was planned. |
| `carry_over_candidates` | The incomplete tasks. |
| `burndown` | One entry a day up to today: tasks completed that day and what is left, from `completed_at`. |
| `demo` | Completed tasks with story points, or every completed task when no story points are tracked. |

Story points and task points are never merged.

## `report retro`

The retro facts (`--scope`, `--sprint`).

| Field | What it holds |
| --- | --- |
| `carry_over` | The incomplete tasks. |
| `scope_change` | Added and removed, as in the review. |
| `blocked` | Tasks with hours blocked, and the total. Best effort, from task history. |
| `cycle_time` | Mean and median days from `created_at` to `completed_at`. |
| `estimate_vs_actual` | Points committed in the snapshot against the points the finished task carries now (the convention is to replace the estimate with the actual). `null` without a snapshot. |

Blocked time reads Asana's system stories: a dependency added until removed or completed, a tag
added until removed. It does not read a `state:<x>` signal. When no story shows a block, `notes`
says no blocked time is reported.

## `report velocity`

Points completed per closed sprint over `velocity_window`, and the mean (`--scope`; no `--sprint`).
Story and task points are shown apart. Fewer closed sprints than the window gives a note.

The layouts are the `cyber-asana.report.sprint`, `.retro`, and `.velocity` references.

## `report dashboard`

Runs the reports the `cyber-asana.dashboard` reference lists, in the order it lists them, into one
text, `--json`, or `--toon` output. By default that is `sprint`, `health`, `workload`, and `velocity`.
It takes `--scope` and `--sprint`; a report that takes no sprint, such as velocity, ignores `--sprint`.

```sh
cyber-asana report dashboard
cyber-asana report dashboard --scope web --sprint previous --json
```

The JSON holds:

| Field | Meaning |
| --- | --- |
| `reports` | One entry per listed report, in order. `status` is `ok` (with `data`, the report's own JSON), `failed` (with `error.code`, such as `sprint-none`), or `unsupported` (with `reason`, and `reference` when an implementation exists). |
| `counts` | How many entries are `ok`, `failed`, and `unsupported`. |
| `status_type` | `on_track`, `at_risk`, or `off_track`, graded from the health findings by `status_rules`. `null` when the health report did not run. |
| `status_basis` | Why: the finding counts, or the reason there is no grade. |
| `settings` | The dashboard settings in force. |
| `notes` | One line for each unsupported report. |

A report that fails with a configuration status is recorded and the rest still run, so a sprint with
no section gives a dashboard with a failed sprint report and the health finding that says so. The
command exits `0` once it has produced the dashboard; read `counts` and `status_type` to gate on
them. A scope that is not configured fails the whole command (`scope-missing`, `scope-unknown`, exit
`2`).

### Your own reports

The dashboard finds reports through the implementations of `cyber-asana.report`, so a report your
repo adds, such as `cyber-asana.report.release-readiness`, can be listed in `reports`. The CLI
computes only the six it ships. A listed report it does not compute is named `unsupported` with its
reference, never dropped; the `asana-scrum` skill follows that reference with the primitive commands.

### Settings

`cyber-asana.dashboard` holds them in its frontmatter. Override a key in
`.agents/references/cyber-asana.dashboard.md`:

| Key | Default | Meaning |
| --- | --- | --- |
| `reports` | `[sprint, health, workload, velocity]` | Report keys, in order. At least one, none repeated. |
| `forms` | `[cli]` | Which forms the dashboard takes: `cli`, `status-update`, `page`. Only `cli` is built. |
| `status_parent` | `scope-default` | Where a status update will be posted: `project`, `portfolio`, or `scope-default`. |
| `status_rules` | `off_track: error`, `at_risk: warning`, `otherwise: on_track` | `off_track` and `at_risk` name the least severe health finding that sets the status (`error` or `warning`); `otherwise` is the status when neither does. |

Its `## Status update` and `## Page` sections hold the templates later forms use. The status update
template is written in Asana's HTML subset, which the `tidy-description` reference lists.

Asana cannot create a native dashboard through its API. To chart a sprint inside Asana, build a
dashboard by hand on the fields this system keeps up to date: the Sprint field, the points fields,
and the Status field.
