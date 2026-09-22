---
title: Repo config
description: Map project and user names to GIDs in a committed file so agents can resolve them without an API call.
sidebar:
  order: 13
---

A repository can commit a name → GID map at `.agents/cyber-asana.json`. Agents and MCP
tools then resolve a human-readable project or user name locally, with no API call and no guessing.

```json
{
  "schema_version": 1,
  "projects": [
    { "gid": "1215109751173511", "name": "cyber-asana" }
  ],
  "users": [
    { "gid": "1200000000000001", "name": "Alice Anderson", "email": "alice@example.com", "aliases": ["ali"] }
  ]
}
```

`users` is optional; a file with only `projects` stays valid.

Workspace GID deliberately stays out of this file — keep it in `ASANA_WORKSPACE`.

## Commands

```sh
cyber-asana config add <project-gid>                  # seed or update an entry
cyber-asana config resolve-project "Backend" --json   # local lookup, no API call
cyber-asana config sync                               # refresh cached names from Asana
cyber-asana config show

cyber-asana config add-user <user-gid> --alias ali    # store name + email, plus an alias
cyber-asana config add-user --search "Ada" --alias ali  # find the GID by typeahead first
cyber-asana config remove-alias ali,al                # drop aliases, keep the user
cyber-asana config resolve-user ali --json            # local lookup, no API call
cyber-asana config list-users
```

| Command | Arguments | Description |
| --- | --- | --- |
| `show` | — | Print the repo config |
| `list` | — | Alias for `show` |
| `path` | — | Print the resolved config file path |
| `resolve-project` | `<name>` | Resolve a project name to its GID, no API call |
| `add` | `<project-gid>` | Add or update an entry, fetching the name from Asana |
| `remove` | `<gid-or-name>` | Remove an entry by GID or name |
| `sync` | — | Refresh all cached project names, and user names and emails, from Asana |
| `add-user` | `<user-gid>` or `--search <query>`, `[--alias <alias>...]` | Add or update a user, fetching name and email from Asana; aliases accumulate. Repeat `--alias` or pass a comma-separated list (`--alias ali,al`). `--search` needs a workspace (`--workspace-gid` or `ASANA_WORKSPACE`) |
| `remove-alias` | `<alias...>` | Remove aliases from whichever users own them; pass several or a comma-separated list. Fails without changing anything if an alias is not registered |
| `resolve-user` | `<query>` | Resolve a GID, alias, email, or name to a user, no API call |
| `list-users` | — | Print registered users |
| `remove-user` | `<query>` | Remove the user a GID, alias, email, or name resolves to |

Every subcommand accepts `--config <path>`, which overrides the `CYBER_ASANA_CONFIG`
environment variable.

## Finding a user's GID

`add-user --search <query>` looks the person up with Asana's typeahead search (the same
search `cyber-asana search objects user` uses) and registers the match. Typeahead is fuzzy, so
`add-user` only picks a user when the result is clear:

- A single hit is registered.
- Among several hits, a hit whose name or email equals the query exactly is registered.
- Otherwise nothing is written. The command lists the candidates, and you re-run it with the
  right GID.

Searching by email is the most reliable way to get one exact hit.

## Assigning by name

`task create`, `task update`, and `task subtask create` take `--assignee <user>`, and the
`asana_task_create`, `asana_task_update`, and `asana_task_subtask_create` MCP tools take
`assignee`. The value can be a user GID, `me`, or anything `resolve-user` understands:

```sh
cyber-asana task create "Review the draft" --project-gid <gid> --assignee ali
```

`--assignee-gid` (MCP: `assignee_gid`) still takes a GID as-is and wins when both are set.

A query is matched case-insensitively in four tiers — GID, then alias, then email, then
display name — and the first tier with a match decides. An alias is unique to one user, so
it always wins over someone else's display name. A query that matches two users in the
deciding tier (two people with the same display name, say) is an error that lists both
candidates; give an alias or a GID instead. A name that matches nobody is an error too,
naming the `config add-user --search` command that would fix it.

## Keeping names fresh

`add`, `add-user`, and `sync` are the only commands that call Asana. Everything else reads the file.
Beyond those, `project get` and the `asana_project_get` MCP tool opportunistically update
cached names whenever a result includes both `gid` and `name`, so the map drifts less than
you would expect.

Run `config sync` after a batch of renames in Asana.

## Typical setup

```sh
cyber-asana config add <project-gid>
git add .agents/cyber-asana.json
```

Committing the file is the point — it is what lets a fresh agent session in a clone resolve
"the backend project" to a GID on the first try.
