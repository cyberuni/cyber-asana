---
title: Goals
description: Manage Asana goals from the command line.
sidebar:
  order: 7
---

Goals are workspace-scoped objectives. `list` and `create` fall back to `ASANA_WORKSPACE_GID`
when `--workspace-gid` is omitted.

```sh
cyber-asana goal list
cyber-asana goal get <gid>
cyber-asana goal create "Reach 1000 users" --start-on 2026-01-01 --due-on 2026-12-31
cyber-asana goal update <gid> --name "Reach 2000 users"
cyber-asana goal update <gid> --clear-start-on
cyber-asana goal delete <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--workspace-gid <gid>` / `--workspace <gid>`, [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | — |
| `create` | `<name>` | `--workspace-gid <gid>`, `--notes <text>`, `--html-notes <html>`, `--due-on <date>`, `--start-on <date>` |
| `update` | `<gid>` | `--name <name>`, `--notes <text>`, `--html-notes <html>`, `--due-on <date>`, `--clear-due-on`, `--start-on <date>`, `--clear-start-on` |
| `delete` | `<gid>` | — |

Dates use `YYYY-MM-DD`. Asana will not accept a start date without an accompanying due date.

Both dates are nullable, so clearing one needs its own flag rather than an empty string:
`--clear-due-on` and `--clear-start-on` send an explicit null. Naming a date and its clear flag
in the same invocation is a usage error, caught before any request is sent.

`--notes` and `--html-notes` are alternative ways to write a goal's description — plain text
or Asana rich-text HTML. Naming both is a usage error, also caught locally.

Goal metrics, followers, and parent-goal relationships are not wrapped — see
[API coverage](/cyber-asana/reference/api-coverage/).

Goals can carry status updates. Pass a goal GID as the parent:

```sh
cyber-asana status list --parent <goal-gid>
```

See [Status updates](/cyber-asana/cli/status-updates/).
