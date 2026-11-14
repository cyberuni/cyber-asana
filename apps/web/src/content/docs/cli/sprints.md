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

## Failure statuses

Each status is told apart by `error.code`, and each exits `2` because the caller can fix it and retry.

| Code | When |
| --- | --- |
| `sprint-none` | Today is before `sprint_anchor_date`, or no project has the sprint's section. The error says how to start it. |
| `sprint-unknown` | `--sprint` is not `current`, `next`, `previous`, a number, or a name the format writes. |
| `model-unsupported` | The scope's `sprint_model` is one the CLI does not build in, or the scope kind does not suit the model. The error names the model; follow its reference with the primitive commands instead. |
| `policy-incomplete` | `sprint_anchor_date` is not set. |
