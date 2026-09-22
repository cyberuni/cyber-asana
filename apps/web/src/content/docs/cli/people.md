---
title: People & places
description: Read users, teams, and workspaces — the identifiers other commands need.
sidebar:
  order: 11
---

These three groups are read-only. They exist mainly to find the GIDs the write commands
need.

## Users

```sh
cyber-asana user me
cyber-asana user list
cyber-asana user get <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `me` | — | — |
| `list` | — | `--workspace-gid <gid>` / `--workspace <gid>`, plus the [pagination options](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | — |

`user me` returns the authenticated user — the quickest way to confirm your token works and
to get your own GID for `--assignee`.

`user list` pages through Asana's `GET /users?workspace=` endpoint, sorted by user ID, so it
works on workspaces with tens of thousands of members. To assign work by name without paging
at all, register the people you assign to once with
[`config add-user`](/cyber-asana/cli/repo-config/#assigning-by-name).

## Teams

```sh
cyber-asana team list
cyber-asana team get <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--workspace-gid <gid>` / `--workspace <gid>`, [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | — |

## Workspaces

```sh
cyber-asana workspace list
cyber-asana workspace get <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | — |

`workspace list` is the one command that needs no workspace context — start here, then set
`ASANA_WORKSPACE` to the GID you want so you can drop `--workspace-gid` from every other
command.

```sh
export ASANA_WORKSPACE="$(cyber-asana workspace list --json | jq -r '.data[0].gid')"
```

Membership edits (adding or removing users from teams and workspaces) are not wrapped — see
[API coverage](/cyber-asana/reference/api-coverage/).
