---
title: Tasks
description: List, search, create, update, and relate Asana tasks from the command line.
sidebar:
  order: 2
---

The largest command group. Beyond CRUD it covers subtasks, multi-project membership,
followers, and dependency graphs.

All commands accept the [global options](/cyber-asana/cli/) and list commands accept the
[pagination options](/cyber-asana/cli/#pagination).

## Listing tasks

```sh
cyber-asana task list --project <gid>
cyber-asana task list --project <gid> --incomplete
cyber-asana task my-tasks list --workspace-gid <gid>
```

| Option | Commands | Description |
| --- | --- | --- |
| `--project-gid <gid>` / `--project <gid>` | `list` | Project to list tasks from |
| `--workspace-gid <gid>` / `--workspace <gid>` | `my-tasks list` | Workspace (defaults to `ASANA_WORKSPACE`) |
| `--completed-since <date>` | `list`, `my-tasks list` | Only tasks completed on or after this date (ISO 8601 or `now`) |
| `--incomplete` | `list`, `my-tasks list`, `subtask list` | Shorthand for `--completed-since now` |

## Reading tasks

```sh
cyber-asana task get <gid>
cyber-asana task get-many <gid> <gid> <gid>
cyber-asana task get-many <gid> <gid> --opt-fields gid,name,assignee
```

`get-many` batches lookups into a single Asana Batch API request rather than one call per
GID.

## Creating and updating

```sh
# Create a milestone in two projects with HTML notes
cyber-asana task create "Launch" \
  --workspace-gid <workspace-gid> \
  --project-gid <proj-a,proj-b> \
  --resource-subtype milestone \
  --html-notes '<body><strong>Ship it</strong></body>'

# Reparent and set custom fields
cyber-asana task update <task-gid> \
  --parent-gid <parent-task-gid> \
  --custom-fields-json '{"<custom-field-gid>":"value"}'

cyber-asana task update <task-gid> --completed
cyber-asana task delete <task-gid>
```

| Option | Commands | Description |
| --- | --- | --- |
| `--workspace-gid <gid>` | `create` | Workspace (defaults to `ASANA_WORKSPACE`) |
| `--project-gid <gid[,gid...]>` / `--project <gid-name-or-alias[,...]>` | `create` | Initial project placement, comma-separated. `--project-gid` is sent to Asana untouched; a non-numeric `--project` value is resolved against the [repo config](/cyber-asana/cli/repo-config/) project registry. With neither given, it falls back to the project marked `default: true` |
| `--assignee-gid <gid>` | `create`, `update` | Assignee user GID |
| `--assignee <user>` | `create`, `update` | Assignee as a GID, `me`, or an alias, email, or name registered in the [repo config](/cyber-asana/cli/repo-config/#assigning-by-name). On `create`, omitting it falls back to `defaults.assignee`; `update` leaves the assignee untouched |
| `--parent-gid <gid>` / `--parent <gid>` | `create`, `update` | Set the task parent |
| `--clear-parent` | `update` | Remove the parent relationship |
| `--name <name>` | `update` | New name |
| `--notes <text>` | `create`, `update` | Plain-text notes |
| `--html-notes <html>` | `create`, `update` | Notes as Asana rich-text HTML |
| `--due-on <date>` | `create`, `update` | Due date (`YYYY-MM-DD`) |
| `--clear-due-on` | `update` | Clear the due date |
| `--due-at <datetime>` | `create`, `update` | Due date and time (ISO 8601 UTC) |
| `--clear-due-at` | `update` | Clear the due date and time |
| `--start-on <date>` | `create`, `update` | Start date (`YYYY-MM-DD`) |
| `--clear-start-on` | `update` | Clear the start date |
| `--start-at <datetime>` | `create`, `update` | Start date and time (ISO 8601 UTC) |
| `--clear-start-at` | `update` | Clear the start date and time |
| `--clear-assignee` | `update` | Unassign the task |
| `--completed` | `create`, `update` | Mark as completed — on `create`, the task is created already closed |
| `--resource-subtype <subtype>` | `create`, `update` | e.g. `default_task`, `milestone` |
| `--follower <gid[,gid...]>` | `create` | Add followers right after creation |
| `--custom-fields-json <json>` | `create`, `update` | JSON object keyed by custom field GID |
| `--custom-field <gid=value>` | `create`, `update` | Repeatable override for simple values |

`--notes` and `--html-notes` are mutually exclusive, as is a date with its date-time twin
(`--due-on` with `--due-at`, `--start-on` with `--start-at`); so is any value paired with
its own `--clear-*` flag. All of these are caught locally, before a request is sent. Asana
additionally requires a due time in the same request when you set or clear `--start-at`.
When both custom-field forms are given, repeated `--custom-field` entries override
duplicate keys from `--custom-fields-json`.

## Subtasks

```sh
cyber-asana task subtask list <task-gid>
cyber-asana task subtask create <task-gid> "Write the migration" --due-on 2026-09-01
```

`subtask create` accepts the same write options as `task create` — `--notes`,
`--html-notes`, `--completed`, `--due-on`, `--due-at`, `--start-on`, `--start-at`,
`--assignee-gid`, `--follower`, `--resource-subtype`, and both custom-field forms. The
parent task and its workspace come from the `<task-gid>` argument. `subtask list` adds
named flags for commonly needed extra fields, which compose with `--opt-fields`:

| Flag | Adds to `opt_fields` |
| --- | --- |
| `--assignee-email` | `assignee,assignee.email` |
| `--follower-emails` | `followers,followers.email` |
| `--num-subtasks` | `num_subtasks` |
| `--custom-fields` | `custom_fields` |

```sh
cyber-asana task subtask list <task-gid> --incomplete --assignee-email
cyber-asana task subtask list <task-gid> --assignee-email --opt-fields "due_on,notes"
```

## Project membership

A task can belong to several projects at once (multi-homing).

```sh
cyber-asana task project add <task-gid> <project-gid>
cyber-asana task project add <task-gid> <project-gid> --section <section-gid>
cyber-asana task project add <task-gid> <project-gid> --insert-after <other-task-gid>
cyber-asana task project remove <task-gid> <project-gid>
```

| Option | Description |
| --- | --- |
| `--section-gid <gid>` / `--section <gid>` | Place into a specific section |
| `--insert-after <gid>` | Position after this task |
| `--insert-before <gid>` | Position before this task |

`--insert-after` and `--insert-before` are mutually exclusive; omitting both appends to the
end of the project or section. Removing a task from a project does not delete the task.

## Followers

```sh
cyber-asana task follower add <task-gid> <user-gid> [<user-gid>...]
cyber-asana task follower remove <task-gid> <user-gid> [<user-gid>...]
```

## Dependencies and dependents

Asana models these as Finish-to-Start blocking relationships. A *dependency* must finish
before this task can start; a *dependent* cannot start until this task finishes.

```sh
cyber-asana task dependency list <task-gid>
cyber-asana task dependency list <task-gid> --opt-fields "gid,name,assignee"
cyber-asana task dependency add <task-gid> <dep-gid> [<dep-gid>...]
cyber-asana task dependency remove <task-gid> <dep-gid> [<dep-gid>...]

cyber-asana task dependent list <task-gid>
cyber-asana task dependent add <task-gid> <dep-gid> [<dep-gid>...]
cyber-asana task dependent remove <task-gid> <dep-gid> [<dep-gid>...]
```

Asana enforces a combined limit of 30 dependencies and dependents per task.

## Search

`task search` takes an optional text query plus filters. Filters marked `<gid[,gid...]>`
accept one or more comma-separated GIDs.

```sh
cyber-asana task search "login"
cyber-asana task search --no-completed --project <gid>
cyber-asana task search --assignee <user-gid> --subtype milestone --due-on-before 2026-01-01
cyber-asana task search --is-blocked --sort-by due_date --json
cyber-asana task search --modified-on-after 2026-05-17 --project-not <gid>
```

**Status filters:** `--completed` / `--no-completed`, `--subtask` / `--no-subtask`,
`--has-attachment`, `--is-blocking`, `--is-blocked`

**Resource filters** (`<gid[,gid...]>`): `--assignee`, `--assignee-not`, `--project`,
`--project-not`, `--project-all`, `--section`, `--section-not`, `--section-all`, `--tag`,
`--tag-not`, `--tag-all`, `--team`, `--portfolio`, `--follower`, `--follower-not`,
`--created-by`, `--created-by-not`, `--assigned-by`, `--assigned-by-not`, `--liked-by-not`,
`--commented-on-by-not`

**Date filters** (`YYYY-MM-DD` for `*-on`, ISO 8601 for `*-at`):

- `--due-on`, `--due-on-before`, `--due-on-after`, `--due-at-before`, `--due-at-after`
- `--start-on`, `--start-on-before`, `--start-on-after`
- `--created-on`, `--created-on-before`, `--created-on-after`, `--created-at-before`, `--created-at-after`
- `--completed-on`, `--completed-on-before`, `--completed-on-after`, `--completed-at-before`, `--completed-at-after`
- `--modified-on`, `--modified-on-before`, `--modified-on-after`, `--modified-at-before`, `--modified-at-after`

**Other:** `--subtype <subtype>`, `--sort-by <field>` (`due_date`, `created_at`,
`completed_at`, `likes`, `modified_at`), `--sort-asc`, `--opt-fields <fields>`
