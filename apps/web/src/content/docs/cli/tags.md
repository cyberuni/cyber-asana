---
title: Tags
description: Manage Asana tags and the tasks they are applied to.
sidebar:
  order: 6
---

Tags are workspace-scoped labels. Beyond CRUD, this group manages the link between tags and
tasks in both directions.

## Tag CRUD

```sh
cyber-asana tag list
cyber-asana tag get <gid>
cyber-asana tag create "Urgent" --color red --notes "Drop everything"
cyber-asana tag update <gid> --name "P0" --color red
cyber-asana tag update <gid> --clear-color
cyber-asana tag delete <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--workspace-gid <gid>` / `--workspace <gid>`, [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | — |
| `create` | `<name>` | `--workspace-gid <gid>`, `--color <color>`, `--notes <text>`, `--follower <gid[,gid...]>` |
| `update` | `<gid>` | `--name <name>`, `--color <color>`, `--clear-color`, `--notes <text>` |
| `delete` | `<gid>` | — |

`list` and `create` fall back to `ASANA_WORKSPACE_GID` when `--workspace-gid` is omitted.

`delete` is idempotent on both surfaces: removing a tag that is already gone still succeeds, and
the result says which of the two happened.

Asana's tag colour is nullable, so `--clear-color` sends `color: null` and takes the colour off.
Naming it together with `--color` is a usage error, caught before any request is sent.

`--follower` is create-only: Asana takes `followers` when a tag is created and not when one is
updated, so `update` has no counterpart.

## Tags on a task

```sh
cyber-asana tag task list <task-gid>
cyber-asana tag task add <task-gid> <tag-gid>
cyber-asana tag task remove <task-gid> <tag-gid>
```

## Tasks with a tag

```sh
cyber-asana tag tasks <tag-gid>
cyber-asana tag tasks <tag-gid> --all --max-pages 3
```

Both `tag task list` and `tag tasks` accept the
[pagination options](/cyber-asana/cli/#pagination).

To filter a task search by tag instead, use
[`task search --tag`](/cyber-asana/cli/tasks/#search).
