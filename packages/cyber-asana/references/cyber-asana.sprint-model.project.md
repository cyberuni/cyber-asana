---
description: The `project` sprint model — a sprint is one project, grouped in a portfolio; tasks are multi-homed from a backlog project, and the backlog is that project's incomplete tasks that no sprint holds. Works on a free workspace for any scope that names a backlog project and a portfolio.
tags: [asana, scrum, sprints, project]
implements: cyber-asana.sprint-model@1
merge: replace
---

## Requirements

- A **backlog project**: the one project every task lives in. A `project` scope uses its own project; any other scope names it with `backlog_project`.
- A **portfolio** that holds the sprint projects. A `portfolio` scope uses its own portfolio; any other scope names it with `sprint_portfolio`. The backlog project is not a sprint, even when it is in the portfolio. Other projects in the portfolio whose names do not match `sprint_name_format` are ignored.
- One project per sprint, named by `sprint_name_format` (for example `Sprint 4`), created by **Start a sprint**. Match is by name, so never rename a sprint project.
- Optionally a **template project** (`sprint_template`): **Start a sprint** duplicates it, so every sprint begins with the same sections, custom fields, and rules. Without one, a plain project is created in the backlog project's workspace and team.
- Save all of it on the scope: `cyber-asana config scope add <name> --kind project --project <backlog-gid> --sprint-portfolio <gid> [--sprint-template <gid>] --sprint-model project`. A scope that lacks the backlog project or the portfolio stops with `scope-incomplete` (exit `2`). `init-asana-scrum` offers all of this.
- Works on a free workspace for reading and writing tasks. Portfolios themselves need a paid Asana plan, so the portfolio is the one paid piece.
- The policy's `state_carrier` is unrestricted: a sprint is a project, so each project's sections are free for workflow states (`state_carrier: sections`).
- A task in two sprints is how a carried-over task looks while the move runs; **Close a sprint** removes it from the closed sprint's project, so a task is in one sprint at a time.

## Current sprint

```bash
cyber-asana sprint current --scope <name> --json
```

It computes today's sprint (today in the timezone `user me` reports, else the machine's) and reports the backlog project with `section_gid` set to the sprint project's GID. It stops with `sprint-none` before `sprint_anchor_date` or when the portfolio has no project for the sprint; run **Start a sprint** then.

By hand: compute the name from the policy, then find it among the portfolio's items.

```bash
cyber-asana portfolio items <portfolio-gid> --json
```

## Sprint tasks

```bash
cyber-asana sprint tasks --sprint <n|name|current|next|previous> --scope <name> [--incomplete] --json
```

By hand: `cyber-asana task list --project-gid <sprint-project-gid> --json`, with `--incomplete` for open tasks only.

## Backlog

```bash
cyber-asana backlog list --scope <name> --json
```

The backlog is every incomplete task in the backlog project that is in none of the sprint projects. A completed task is never listed.

By hand: list the backlog project's incomplete tasks with `task list --project-gid <backlog-gid> --incomplete`, then drop the ones also in a sprint project.

## Add to sprint

```bash
cyber-asana sprint add <task-gid>... --sprint <ref> --scope <name>
```

It multi-homes each backlog task into the sprint's project, so the task stays in the backlog project too. A task already in the sprint is left alone; a task that is not in the backlog project is reported as outside the scope.

By hand: `cyber-asana task project add <task-gid> <sprint-project-gid>`.

## Start a sprint

```bash
cyber-asana sprint start --sprint <ref> --scope <name>
```

It creates the sprint's project, by duplicating the scope's `sprint_template` when it has one, and adds the project to the portfolio. The output's `sprint_project` names it. Running it again for a sprint whose project exists changes nothing and exits 0.

By hand: `cyber-asana project duplicate <template-gid> --name "<sprint name>"` (or `project create "<sprint name>"`), then `cyber-asana portfolio item add <portfolio-gid> <new-project-gid>`.

## Close a sprint

```bash
cyber-asana sprint close --sprint <ref> --scope <name>
```

With `carry_over: move` it starts the next sprint's project when it is missing, then adds each incomplete task to it and removes the task from the closed sprint's project. With `leave` it changes nothing and reports what stayed. A sprint with no incomplete tasks closes as a no-op. The closed project is **not archived**: it keeps its completed tasks for the sprint report and velocity, and an archived project drops out of most views. Archive it by hand with `cyber-asana project update <gid> --archived` when the team wants it gone.

By hand: list the incomplete tasks as in **Sprint tasks**, then `task project add` into the next project and `task project remove` from this one, for each.

## Closed sprints

```bash
cyber-asana sprint list --scope <name> --json
```

It lists the portfolio's sprint projects by index, each with its `state` (`past`, `current`, or `future`). The past ones are the closed sprints.
