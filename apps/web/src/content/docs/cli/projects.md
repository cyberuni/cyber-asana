---
title: Projects
description: List, search, create, update, and export Asana projects.
sidebar:
  order: 3
---

```sh
cyber-asana project list
cyber-asana project get <gid>
cyber-asana project create "Launch" --workspace-gid <gid>
```

`list`, `create`, and `search` are workspace-scoped and fall back to `ASANA_WORKSPACE` when
`--workspace-gid` is omitted.

## List

```sh
cyber-asana project list --workspace-gid <gid> --archived
cyber-asana project list --workspace-gid <gid> --no-archived
```

| Option | Description |
| --- | --- |
| `--archived` | Only archived projects |
| `--no-archived` | Only projects that are not archived |
| `--custom-type <gid>` | Only projects of this custom type; an empty value selects projects with no custom type |

With neither flag the filter is left unset and Asana's own default applies.

## Create and update

```sh
cyber-asana project create "Q3 Launch" \
  --workspace-gid <gid> \
  --notes "Everything shipping in Q3" \
  --due-on 2026-09-30

cyber-asana project update <gid> --name "Q3 Launch (revised)" --clear-due-on
cyber-asana project update <gid> --archived
cyber-asana project update <gid> --no-archived
cyber-asana project delete <gid>
```

| Option | Commands | Description |
| --- | --- | --- |
| `--workspace-gid <gid>` / `--workspace <gid>` | `create` | Workspace (defaults to `ASANA_WORKSPACE`) |
| `--name <name>` | `update` | New name |
| `--archived` | `create`, `update` | Archive the project (on `create`, create it archived) |
| `--no-archived` | `update` | Unarchive the project |
| `--owner <user>` | `create`, `update` | Project owner — a user GID, an email, or `me` |
| `--notes <text>` | `create`, `update` | Project notes |
| `--html-notes <html>` | `create`, `update` | Notes as Asana rich-text HTML |
| `--color <color>` | `create`, `update` | Project color |
| `--privacy-setting <value>` | `create`, `update` | Project privacy setting |
| `--default-view <value>` | `create`, `update` | Default view |
| `--default-access-level <value>` | `create`, `update` | Default access for users or teams who join: `admin`, `editor`, `commenter`, `viewer` |
| `--due-on <date>` | `create`, `update` | Due date (`YYYY-MM-DD`) |
| `--start-on <date>` | `create`, `update` | Start date (`YYYY-MM-DD`) |
| `--clear-due-on` | `update` | Clear the due date |
| `--clear-start-on` | `update` | Clear the start date |
| `--clear-owner` | `update` | Leave the project without an owner |

## Task counts

```sh
cyber-asana project counts <project-gid>
cyber-asana project counts <project-gid> --opt-fields num_tasks,num_completed_tasks
```

Asana returns no fields from this endpoint unless `opt_fields` is supplied, so cyber-asana
defaults to `num_tasks,num_incomplete_tasks,num_completed_tasks`.

This endpoint has a stricter rate and cost profile than ordinary project reads — prefer the
default field set unless you need additional count fields.

## Export

```sh
cyber-asana project export <gid>
cyber-asana project export <gid> --output roadmap.md
```

Renders the project with all its sections and tasks as a Markdown document. Without
`--output` it writes to stdout.

## Search

`project search` takes an optional text query plus filters. Filters marked
`<gid[,gid...]>` accept one or more comma-separated identifiers.

```sh
cyber-asana project search "launch" --workspace-gid <gid>
cyber-asana project search --workspace-gid <gid> --no-completed --owner me
cyber-asana project search --workspace-gid <gid> --portfolio <gid> --sort-by due_date
```

**Status filters:** `--completed` / `--no-completed`

**Resource filters** (`<gid[,gid...]>`): `--team`, `--owner`, `--member`, `--member-not`,
`--portfolio`

**Date filters** (`YYYY-MM-DD` for `*-on`, ISO 8601 for `*-at`):

- `--due-on`, `--due-on-before`, `--due-on-after`, `--due-at-before`, `--due-at-after`
- `--start-on`, `--start-on-before`, `--start-on-after`
- `--created-on`, `--created-on-before`, `--created-on-after`, `--created-at-before`, `--created-at-after`
- `--completed-on`, `--completed-on-before`, `--completed-on-after`, `--completed-at-before`, `--completed-at-after`

**Other:** `--sort-by <field>` (`due_date`, `created_at`, `completed_at`, `modified_at`),
`--sort-asc`, `--opt-fields <fields>`

:::caution
Project search uses Asana's premium search endpoint. Results are eventually consistent, so
newly changed projects may not appear immediately.
:::
