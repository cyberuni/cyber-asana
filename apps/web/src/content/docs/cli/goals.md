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
| `list` | — | `--workspace-gid <gid>` / `--workspace <gid>`, `--portfolio <gid>`, `--project <gid>`, `--task <gid>`, `--team <gid>`, `--workspace-level` / `--no-workspace-level`, `--time-period <gid[,gid...]>` (repeatable), [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | — |
| `create` | `<name>` | `--workspace-gid <gid>`, `--notes <text>`, `--html-notes <html>`, `--due-on <date>`, `--start-on <date>`, `--time-period <gid>`, `--owner <gid>`, `--team <gid>`, `--workspace-level` / `--no-workspace-level`, `--liked` / `--no-liked`, `--follower <user[,user...]>` |
| `update` | `<gid>` | `--name <name>`, `--notes <text>`, `--html-notes <html>`, `--due-on <date>`, `--clear-due-on`, `--start-on <date>`, `--clear-start-on`, `--time-period <gid>`, `--owner <gid>`, `--team <gid>`, `--workspace-level` / `--no-workspace-level`, `--liked` / `--no-liked`, `--status <status>`, `--custom-fields-json <json>`, `--custom-field <gid=value>`, `--html-custom-fields-json <json>`, `--html-custom-field <gid=html>` |
| `delete` | `<gid>` | — |

Dates use `YYYY-MM-DD`. Asana will not accept a start date without an accompanying due date.

Both dates are nullable, so clearing one needs its own flag rather than an empty string:
`--clear-due-on` and `--clear-start-on` send an explicit null. Naming a date and its clear flag
in the same invocation is a usage error, caught before any request is sent.

`--notes` and `--html-notes` are alternative ways to write a goal's description — plain text
or Asana rich-text HTML. Naming both is a usage error, also caught locally.

`--owner` and `--team` also accept `--owner-gid` and `--team-gid`. `--team` and
`--workspace-level` / `--no-workspace-level` take effect only in an organization: a goal that is
not workspace-level is a team goal. `--follower` takes users as GIDs, emails, or `me`, on create
only; later changes go through `goal follower add`. A goal's workspace is fixed at creation, so
`update` has no workspace option.

`update --status` takes `green`, `yellow` or `red` while a goal is open, and `missed`, `achieved`,
`partial` or `dropped` once it is closed. Asana accepts a status only on a goal that has a metric,
and cyber-asana does not check that beforehand. A value outside the list is a usage error, caught
locally. Custom field values follow the same flags as `task update`.

`list` needs a scope: the workspace, or one of `--portfolio`, `--project`, `--task` or `--team`.
Giving one of those drops the `ASANA_WORKSPACE_GID` default, so the request names a single scope;
pass `--workspace-gid` explicitly to keep it. `--workspace-level` needs the workspace and is
refused locally without one. `--time-period` may repeat or take a comma-separated list.

## Metrics

```sh
cyber-asana goal metric set <gid> --unit percentage --initial 0 --target 100
cyber-asana goal metric set-current <gid> 42.5
```

`metric set` defines a goal's metric: `--unit` (`none`, `currency`, or `percentage`), `--precision`,
`--currency-code`, `--initial`, `--target`, `--current`, `--progress-source`, and `--custom-weight` / `--no-custom-weight`. The weight flag
matters only for the `subgoal_progress`, `project_task_completion`, `project_milestone_completion`
and `task_completion` progress sources, and is not checked against the source. `metric set-current`
records the current value. Both need a paid workspace, and the request bodies come from Asana's
docs and have not been confirmed against a live workspace. The MCP tools are
`asana_goal_metric_set` and `asana_goal_metric_set_current_value`.

## Supporting relationships

```sh
cyber-asana goal supporting add <goal-gid> <supporting-gid> --weight 0.5
cyber-asana goal supporting remove <goal-gid> <supporting-gid>
```

A supporting resource is a goal, project, or portfolio whose progress feeds the goal. `add` also
takes `--insert-before` and `--insert-after` to place it among the others. Both commands need a
paid workspace; the MCP tools are `asana_goal_supporting_add` and `asana_goal_supporting_remove`.
The request bodies come from Asana's docs and have not been confirmed against a live workspace.
Reading and updating a relationship by its own GID is not wrapped.

## Followers

```sh
cyber-asana goal follower add <goal-gid> <user-gid> [<user-gid>...]
cyber-asana goal follower remove <goal-gid> <user-gid> [<user-gid>...]
```

Followers get notifications about the goal. Both commands need a paid workspace; the MCP tools
are `asana_goal_follower_add` and `asana_goal_follower_remove`.

## Time periods

```sh
cyber-asana goal time-period list --workspace-gid <gid>
cyber-asana goal time-period get <gid>
```

A goal belongs to a time period, so these commands show the time period GID to look up before
creating one. `list` takes the usual pagination options, plus `--start-on` and `--end-on`
(`YYYY-MM-DD`, checked locally) to narrow the periods, and returns each period's name, GID, start
and end dates; `get` also shows the period type. The MCP tools are `asana_time_period_list` and
`asana_time_period_get`. Goals are a paid-plan feature; whether time periods work on a free plan is
not verified, and the requests have not been confirmed against a live workspace.

Parent-goal relationships beyond supporting add and remove are not wrapped — see
[API coverage](/cyber-asana/reference/api-coverage/).

Goals can carry status updates. Pass a goal GID as the parent:

```sh
cyber-asana status list --parent <goal-gid>
```

See [Status updates](/cyber-asana/cli/status-updates/).
