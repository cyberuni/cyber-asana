---
description: The `sections` sprint model — a sprint is a section named by `sprint_name_format` in each project of the scope, and the backlog is the Backlog section plus tasks in no sprint section.
tags: [asana, scrum, sprints, sections]
implements: cyber-asana.sprint-model@1
merge: replace
---

## Requirements

- Scope kind `project` or `projects`. The model does not support `portfolio` scopes.
- Works on a free workspace: it reads sections and their tasks, and never uses task search.
- One section named by the policy's `backlog_section` (default `Backlog`) in each project. `cyber-asana sprint start` does not create it; make it with `cyber-asana section create "Backlog" --project-gid <gid>`.
- One section per sprint in each project of the scope, named by `sprint_name_format`, created by **Start a sprint**.
- A task sits in one section per project, so this model cannot also use sections as workflow states. The policy's `state_carrier` must be `field` or `none`.

## Current sprint

```bash
cyber-asana sprint current --scope <name> --json
```

It computes today's sprint (today in the timezone `user me` reports, else the machine's) and reports which projects hold its section. It stops with `sprint-none` before `sprint_anchor_date` or when no project has the sprint's section; run **Start a sprint** then.

By hand: compute the name from the policy, then find the section.

```bash
cyber-asana section list --project-gid <gid> --json
```

## Sprint tasks

```bash
cyber-asana sprint tasks --sprint <n|name|current|next|previous> --scope <name> [--incomplete] --json
```

By hand, for each project's section of that name:

```bash
cyber-asana section tasks <section-gid> --opt-fields name,completed,assignee.name --json
```

A task homed in two projects is counted once.

## Backlog

```bash
cyber-asana backlog list --scope <name> --json
```

The backlog is every incomplete task in a section that is not a sprint section, which includes the `backlog_section`, in each project's order. A task already in a sprint section of another project is left out.

By hand: `cyber-asana section list --project-gid <gid>`, then `cyber-asana section tasks <section-gid> --incomplete` for each section whose name does not match `sprint_name_format`.

## Add to sprint

```bash
cyber-asana sprint add <task-gid>... --sprint <ref> --scope <name>
```

It moves the task into the sprint's section in each project of the scope the task is in. A task already there is left alone.

By hand: `cyber-asana section task add <section-gid> <task-gid>`.

## Start a sprint

```bash
cyber-asana sprint start --sprint <ref> --scope <name>
```

It creates the sprint's section in each project that lacks one. Running it again for a sprint whose sections exist changes nothing and exits 0.

By hand: `cyber-asana section create "<sprint name>" --project-gid <gid>`.

## Close a sprint

```bash
cyber-asana sprint close --sprint <ref> --scope <name>
```

With `carry_over: move` it moves each incomplete task into the next sprint's section, creating that section when it is missing. With `leave` it moves nothing and reports what stayed. A sprint with no incomplete tasks closes as a no-op.

By hand: `cyber-asana section tasks <section-gid> --incomplete`, then `cyber-asana section task add <next-section-gid> <task-gid>` for each.

## Closed sprints

```bash
cyber-asana sprint list --scope <name> --json
```

It lists the sprints that have a section in the scope, each with its `state` (`past`, `current`, or `future`). The past ones are the closed sprints.
