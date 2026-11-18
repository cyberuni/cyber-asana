---
title: Tables
description: Create and shape Asana Tables, the containers of structured records.
sidebar:
  order: 29
---

A table holds [records](/cyber-asana/cli/records/), and its columns are custom fields. This is
Asana's native Tables feature (Advanced, Enterprise, and Enterprise+ plans), not the HTML
`<table>` tag in rich text.

```sh
cyber-asana table list --workspace-gid <gid>
cyber-asana table get <gid>
cyber-asana table create "Renewals" --workspace-gid <gid>
cyber-asana table update <gid> --name "Renewals 2027" --default-access-level viewer
cyber-asana table fields <gid>
cyber-asana table add-field <gid> <custom-field-gid> --important
cyber-asana table remove-field <gid> <custom-field-gid>
cyber-asana table delete <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--workspace-gid <gid>` / `--workspace <gid>`, [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | `--opt-fields <fields>` |
| `create` | `<name>` | `--workspace-gid <gid>` / `--workspace <gid>` |
| `update` | `<gid>` | `--name <name>`, `--default-access-level <admin\|editor\|commenter\|viewer>` (at least one) |
| `delete` | `<gid>` | Deleting a table that is already gone succeeds |
| `fields` | `<gid>` | [pagination](/cyber-asana/cli/#pagination) |
| `add-field` | `<gid> <custom-field-gid>` | `--important`, `--insert-before <setting-gid>`, `--insert-after <setting-gid>` |
| `remove-field` | `<gid> <custom-field-gid>` | — |

A table accepts only custom fields that are global to the workspace; Asana answers `403` to a
field that is not. A table holds up to 150 fields. A table's members are managed with
[`membership`](/cyber-asana/cli/memberships/), using the table GID as the parent.
