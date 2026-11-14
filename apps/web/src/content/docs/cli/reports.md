---
title: Reports
description: Compute a member's standup, with done, today, and blocked tasks, from the scrum policy and the scope.
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
