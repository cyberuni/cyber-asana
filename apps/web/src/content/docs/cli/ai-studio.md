---
title: AI Studio
description: Read Asana AI Studio usage, the credits each run consumed and who holds a seat.
sidebar:
  order: 20
---

AI Studio runs are rule executions that use a model and spend credits. Two read commands
expose that usage, so you can report on credit spend or poll for new runs without opening
the Asana admin console.

:::caution
Asana restricts both endpoints to service accounts in organizations licensed for AI Studio.
A regular personal access token is refused.
:::

## Reading runs

```sh
cyber-asana ai-studio runs
cyber-asana ai-studio runs --workspace-gid <gid>
cyber-asana ai-studio runs --start-at 2026-01-01T00:00:00Z --end-at 2026-02-01T00:00:00Z --all
```

| Command | Arguments | Options |
| --- | --- | --- |
| `runs` | — | `--workspace-gid <gid>` / `--workspace <gid>`, `--division-gid <gid>`, `--start-at <datetime>`, `--end-at <datetime>`, [pagination](/cyber-asana/cli/#pagination) |

`--workspace-gid` falls back to `ASANA_WORKSPACE_GID`. `--division-gid` scopes the read to one
division; without it Asana uses the organization's first licensed division.

Each row names the rule, who triggered it, the model, the status, and the credits used. Runs
come back oldest first.

`--start-at` is inclusive and `--end-at` is exclusive. Both are ISO 8601 date-times and
filter on when the usage was recorded.

The endpoint returns a fixed row shape, so `runs` takes no `--opt-fields`.

## Polling forward

Because runs are oldest first, the last row's timestamp is a cursor. Pass it as `--start-at`
on the next call to read only what is new:

```sh
cyber-asana ai-studio runs --start-at 2026-01-15T09:30:00Z --all --toon
```

## Reading seats

```sh
cyber-asana ai-studio seats
cyber-asana ai-studio seats --state active
cyber-asana ai-studio seats --state revoked --json
```

| Command | Arguments | Options |
| --- | --- | --- |
| `seats` | — | `--workspace-gid <gid>` / `--workspace <gid>`, `--division-gid <gid>`, `--state <state>`, [pagination](/cyber-asana/cli/#pagination) |

`--state` is `active` or `revoked`. Each row shows the user, the license tier, the state, and
when the seat was assigned. The list is a current snapshot, not a history.
