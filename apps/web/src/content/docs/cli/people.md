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
| `me` | — | `--workspace-gid <gid>` / `--workspace <gid>` (sent only when given) |
| `list` | — | `--workspace-gid <gid>` / `--workspace <gid>`, `--team <gid>` (only that team's members), plus the [pagination options](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | `--workspace-gid <gid>` / `--workspace <gid>` (sent only when given) |

`user me` returns the authenticated user — the quickest way to confirm your token works and
to get your own GID for `--assignee`.

On `user me` and `user get` the workspace is an explicit option only: `ASANA_WORKSPACE_GID` is not used there, so a plain call sends no workspace.

`user list` pages through Asana's `GET /users?workspace=` endpoint, sorted by user ID, so it
works on workspaces with tens of thousands of members. To assign work by name without paging
at all, register the people you assign to once with
[`config add-user`](/cyber-asana/cli/repo-config/#assigning-by-name).

## Teams

```sh
cyber-asana team list
cyber-asana team get <gid>
cyber-asana team members <gid>
cyber-asana team projects <gid>
cyber-asana team for-user <user-gid> --workspace-gid <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--workspace-gid <gid>` / `--workspace <gid>`, [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | — |
| `members` | `<gid>` | [pagination](/cyber-asana/cli/#pagination); lists each member's user GID and name, including people with no task yet |
| `for-user` | `<user-gid>` | `--workspace-gid <gid>` / `--workspace <gid>` (the organization), [pagination](/cyber-asana/cli/#pagination); the teams the user belongs to. Works on a free plan |
| `projects` | `<gid>` | `--archived` (only archived projects; default both), [pagination](/cyber-asana/cli/#pagination) |

The `team` [scrum scope](/cyber-asana/cli/repo-config/#scrum-scopes) reads these two lists to learn which projects and which people
a team covers.

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
`ASANA_WORKSPACE_GID` to the GID you want so you can drop `--workspace-gid` from every other
command.

```sh
export ASANA_WORKSPACE_GID="$(cyber-asana workspace list --json | jq -r '.data[0].gid')"
```

Membership edits (adding or removing users from teams and workspaces) are not wrapped — see
[API coverage](/cyber-asana/reference/api-coverage/).
