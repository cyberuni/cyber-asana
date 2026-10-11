---
title: Out of office
description: Read and write Asana out-of-office entries, so automation knows who is away.
sidebar:
  order: 19
---

An out-of-office entry is a date range during which a user is away. Asana holds this
signal and nothing else does, so one read turns "assign it to whoever the rules say" into
"assign it to whoever the rules say, and who is actually here".

## Reading who is away

```sh
cyber-asana ooo list
cyber-asana ooo list --user-gid <gid>
cyber-asana ooo list --user-gid <gid> --start-date 2026-01-01 --end-date 2026-01-31
cyber-asana ooo get <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--user-gid <gid>`, `--workspace-gid <gid>`, `--start-date <date>`, `--end-date <date>`, [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | — |

`--user-gid` defaults to the authenticated user, so an unscoped `ooo list` reads your own
calendar. `--workspace-gid` falls back to `ASANA_WORKSPACE_GID`.

`--start-date` and `--end-date` are Asana's overlap window: the list keeps entries that
overlap with, end after, or start before the dates you give. Both are ISO 8601 days
(`YYYY-MM-DD`).

## Marking someone out

```sh
cyber-asana ooo create --start-date 2026-01-01 --end-date 2026-01-15
cyber-asana ooo create --user-gid <gid> --start-date 2026-01-01 --end-date 2026-01-15
cyber-asana ooo update <gid> --end-date 2026-01-20
cyber-asana ooo delete <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `create` | — | `--start-date <date>` (required), `--end-date <date>` (required), `--user-gid <gid>`, `--workspace-gid <gid>` |
| `update` | `<gid>` | `--start-date <date>`, `--end-date <date>` |
| `delete` | `<gid>` | — |

`create` also defaults `--user-gid` to the authenticated user, which makes "mark me out
next week" a one-liner. The date range is the only thing an entry carries — `update`
changes one or both ends of it.

`delete` is idempotent: deleting an entry that is already gone reports success with
`already_absent: true` rather than failing.

## Checking before you assign

The lookup is a plain read, so it composes with anything that picks an assignee:

```sh
cyber-asana user list --workspace-gid <gid> --toon
cyber-asana ooo list --user-gid <gid> --start-date "$(date -I)" --toon
```

An empty result means that user has nothing scheduled in the window — they are available
as far as Asana knows.

:::note
`task create` and `task update` do **not** check this for you. The warning would sit on
the hot path of every task write for a signal that is usually empty; the read is one call
when you want it.
:::
