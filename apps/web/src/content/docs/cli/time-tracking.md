---
title: Time tracking
description: Log and review the time spent on tasks.
sidebar:
  order: 28
---

Time tracking entries record how long someone worked on a task. Use them to log hours when work
finishes, to review a task's effort, or to pull every entry for a person or a period. Time
tracking needs a paid workspace. Rates and budgets are not wrapped.

```sh
cyber-asana time-entry create <task-gid> --hours 1.5 --entered-on 2026-11-17
cyber-asana time-entry for-task <task-gid>
cyber-asana time-entry list --assignee <user-gid> --from 2026-11-01 --to 2026-11-30
cyber-asana time-entry get <gid>
cyber-asana time-entry update <gid> --minutes 45
cyber-asana time-entry delete <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--task-gid`, `--assignee-gid`, `--user-gid`, `--portfolio-gid`, `--workspace-gid` (each also as `--task`, and so on), `--attributable-to <project-gid>`, `--timesheet-approval-status <gid>`, `--from <date>`, `--to <date>`, [pagination](/cyber-asana/cli/#pagination) |
| `for-task` | `<task-gid>` | [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | `--opt-fields <fields>` |
| `create` | `<task-gid>` | `--hours <n>` or `--minutes <n>` (one is required), `--entered-on <date>`, `--assignee <user-gid>`, `--attributable-to <project-gid>`, `--billable-status <status>`, `--category <gid>`, `--description <text>` |
| `update` | `<gid>` | `--hours`, `--minutes`, `--entered-on`, `--assignee`, `--attributable-to`, `--billable-status`, `--category`, `--description`. Give at least one |
| `delete` | `<gid>` | — (succeeds with `already_absent` when the entry is gone) |

`--assignee` names the user the time is attributed to; Asana defaults it to you, and accepts another
user only when you are that user's time reviewer or an admin. `--attributable-to` names the project
the time is attributed to. On `list`, `--assignee` filters by the same user. `--user` is kept as an
alias of `--assignee`: Asana deprecated its `user` filter in favour of `assignee`, so both flags send
`assignee`.

`--billable-status` takes `billable`, `nonBillable` or `notApplicable`. `--category` takes a time
tracking category GID and replaces the entry's categories; Asana allows one today, so giving it
twice is an error before any request. `--description` sets a note on the entry.
`--timesheet-approval-status` on `list` filters by a timesheet approval status GID.

These four (`--billable-status`, `--category`, `--description`, `--timesheet-approval-status`) need
Asana's Timesheets and Budgets add-on. Without it Asana answers 402 Payment Required; the CLI does
not check for the add-on first.

Asana stores minutes. `--hours` is converted and rounded to the nearest minute, and giving both
`--hours` and `--minutes` is a usage error. Dates use `YYYY-MM-DD`; Asana uses today when
`--entered-on` is omitted.

The MCP tools are `asana_time_entry_list`, `asana_time_entry_list_for_task`,
`asana_time_entry_get`, `asana_time_entry_create`, `asana_time_entry_update`, and
`asana_time_entry_delete`; they take `duration_minutes` rather than hours. Create and update also take `assignee_gid`,
`attributable_to_gid`, `billable_status`, `category_gids` (an array) and `description`; list takes
`assignee_gid`, `attributable_to_gid` and `timesheet_approval_status_gid` (`user_gid` remains as an alias of
`assignee_gid`).

The request bodies come from Asana's docs and have not been confirmed against a live paid
workspace. `pnpm test:system` runs the `time-tracking/api` suite when a paid workspace and
`ASANA_SYSTEM_TEST_TASK_GID` are set.
