---
title: Sprints and backlog
description: Compute the current sprint from the scrum policy, list its tasks, start and close sprints, and read the backlog, for the scopes you configured.
sidebar:
  order: 23
---

Sprints are computed, never typed in. The `cyber-asana.scrum` reference sets
`sprint_anchor_date` (the first day of sprint 1), `sprint_length_days`, `sprint_name_format`, and
`working_days`. For any date the CLI finds the sprint's index, name, and dates, then asks the
scope's sprint model for the Asana object that stands for it.

```sh
cyber-asana sprint current
cyber-asana sprint list
cyber-asana sprint tasks --sprint previous --incomplete
cyber-asana sprint add <task-gid> <task-gid> --sprint next
cyber-asana sprint start --sprint next
cyber-asana sprint close
cyber-asana backlog list
```

Every command takes `--scope <name>` (see [Repo config](/cyber-asana/cli/repo-config/)), `--json`, and
`--toon`. `--sprint` takes `current` (the default), `next`, `previous`, a number, or a name written by
`sprint_name_format`.

"Today" is the date in the timezone `user me` reports. Asana's public API does not return a user
timezone today, so the date falls back to the machine's timezone, and `sprint current` says which one
it used (`timezone_source`).

## The `sections` model

The first model, `sections`, is the default. A sprint is a section named by `sprint_name_format` in
each project of the scope. The backlog is the incomplete tasks in every section that is not a sprint
section, which includes the section the policy's `backlog_section` names (default `Backlog`). It reads
sections and their tasks only, so it works on a free workspace. It supports `project` and `projects`
scopes. Its reference, `cyber-asana.sprint-model.sections`, lists the CLI command and the primitive
commands for each operation.

| Command | What it does |
| --- | --- |
| `sprint current` | The sprint for today, with its dates and working days, and the projects that hold its section. |
| `sprint list` | The sprints that have a section in the scope, plus the current one, each `past`, `current`, or `future`. |
| `sprint tasks` | The sprint's tasks, each once across projects, with completed and open counts. `--incomplete` keeps the open ones. |
| `sprint add <task-gid>...` | Moves each task into the sprint's section in every project of the scope it is in. A task already there is left alone. |
| `sprint start` | Creates the sprint's section in each project that lacks one. When the sections exist it changes nothing and exits 0. |
| `sprint close` | Carries the sprint's incomplete tasks over as the policy's `carry_over` says: `move` puts them in the next sprint's section (created if missing), `leave` moves nothing. |
| `backlog list` | The backlog in each project's order, each task once. It names a project that lacks the backlog section. |

`sprint start`, `sprint add`, and `sprint close` are safe to repeat: a second run changes nothing.

## The `custom-field` model

The second model, `custom-field`, makes a sprint an option of one `Sprint` enum field that every
project of the scope shares, and the backlog the incomplete tasks whose Sprint field is unset. It works
for `project`, `projects`, and `portfolio` scopes, so it is the model for a scope that spans projects.
Its reference is `cyber-asana.sprint-model.custom-field`.

It finds the field from the `sprint` role in `.agents/cyber-asana.json` (`config discover-fields`
saves it), else by the name `Sprint` or `Iteration` among each project's attached fields. Create and
attach it with [`custom-field create` and `custom-field attach`](/cyber-asana/cli/custom-fields/), or
let `init-asana-scrum` do it.

Listing a sprint's tasks, the backlog, and `sprint close` use [task search](/cyber-asana/cli/tasks/#search),
which needs a premium workspace and pages past 100 results on its own. On a free workspace they stop
with `premium-required`. The model's other commands behave as follows:

| Command | What it does |
| --- | --- |
| `sprint start` | Creates the sprint's enum option. When it exists it changes nothing and exits 0. |
| `sprint add <task-gid>...` | Sets each task's Sprint field to the sprint's option and reports the option it left. A task whose projects lack the field is `outside_scope`. |
| `sprint close` | `move` sets each incomplete task to the next sprint's option (created if missing); `leave` changes nothing. |
| `backlog list` | Incomplete tasks with no Sprint value. It reports no backlog section. |

Search is eventually consistent: a task whose Sprint value just changed can take a moment to move
between `sprint tasks` and `backlog list`.

## Failure statuses

Each status is told apart by `error.code`.

| Code | When |
| --- | --- |
| `sprint-none` | Today is before `sprint_anchor_date`, or no project has the sprint's section. The error says how to start it. |
| `sprint-unknown` | `--sprint` is not `current`, `next`, `previous`, a number, or a name the format writes. |
| `model-unsupported` | The scope's `sprint_model` is one the CLI does not build in, or the scope kind does not suit the model. The error names the model; follow its reference with the primitive commands instead. |
| `policy-incomplete` | `sprint_anchor_date` is not set. |
| `sprint-field-missing` | The `custom-field` model finds no Sprint field on the scope's projects. The error names `custom-field create` and `attach`. |
| `sprint-field-ambiguous` | The scope's projects use more than one Sprint field. The error lists them. |
| `premium-required` | The `custom-field` model needs task search and Asana answered `402`. Exits `7`, like any plan limitation. |

All but `premium-required` exit `2`.
