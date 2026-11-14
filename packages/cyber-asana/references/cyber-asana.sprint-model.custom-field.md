---
description: The `custom-field` sprint model — a sprint is an option of the `Sprint` enum field, and the backlog is every incomplete task whose Sprint field is unset. Works for any scope kind and needs a premium workspace to list tasks.
tags: [asana, scrum, sprints, custom-field]
implements: cyber-asana.sprint-model@1
merge: replace
---

## Requirements

- Any scope kind: `project`, `projects`, or `portfolio`.
- One `Sprint` enum custom field shared by every project of the scope, attached to each project. The CLI finds it from the `sprint` field role registered by `config discover-fields`, else by name (`Sprint` or `Iteration`, enum). Two different Sprint fields in one scope stop with `sprint-field-ambiguous`; none stops with `sprint-field-missing`. Make it with `cyber-asana custom-field create Sprint --type enum --workspace-gid <gid>`, then `cyber-asana custom-field attach <project-gid> <field-gid>` for each project. `init-asana-scrum` offers both.
- One enum option per sprint, named by `sprint_name_format`, created by **Start a sprint**.
- A premium workspace. Listing a sprint's tasks, the backlog, and closing a sprint use task search, which Asana answers with `402` on a free plan. The CLI then stops with `premium-required` (exit `7`). Starting a sprint and adding a task do not search.
- Search is eventually consistent: a task whose Sprint value just changed can take a moment to move between lists.
- The policy's `state_carrier` is unrestricted, because sections are free for workflow states.

## Current sprint

```bash
cyber-asana sprint current --scope <name> --json
```

It computes today's sprint (today in the timezone `user me` reports, else the machine's) and reports the projects the Sprint field is attached to. `section_gid` in its output is the enum option's GID. It stops with `sprint-none` before `sprint_anchor_date` or when the field has no option for the sprint; run **Start a sprint** then.

By hand: compute the name from the policy, then find the option.

```bash
cyber-asana custom-field get <sprint-field-gid> --json
```

## Sprint tasks

```bash
cyber-asana sprint tasks --sprint <n|name|current|next|previous> --scope <name> [--incomplete] --json
```

By hand:

```bash
cyber-asana task search --project <gid[,gid...]> --custom-field-filter <sprint-field-gid>.value=<option-gid> --all --json
```

Search returns at most 100 tasks per call; `--all` pages past that.

## Backlog

```bash
cyber-asana backlog list --scope <name> --json
```

The backlog is every incomplete task in the scope's projects whose Sprint field is unset. There is no backlog section to create.

By hand:

```bash
cyber-asana task search --project <gid[,gid...]> --no-completed --custom-field-filter <sprint-field-gid>.is_set=false --all --json
```

## Add to sprint

```bash
cyber-asana sprint add <task-gid>... --sprint <ref> --scope <name>
```

It sets the task's Sprint field to the sprint's option, and reports the sprint it was in before. A task already in the sprint is left alone. A task none of whose projects has the field is reported as outside the scope.

By hand: `cyber-asana task update <task-gid> --custom-field <sprint-field-gid>=<option-gid>`.

## Start a sprint

```bash
cyber-asana sprint start --sprint <ref> --scope <name>
```

It creates the sprint's enum option on the Sprint field. Running it again for a sprint whose option exists changes nothing and exits 0.

By hand: `cyber-asana custom-field enum-option add <sprint-field-gid> "<sprint name>"`.

## Close a sprint

```bash
cyber-asana sprint close --sprint <ref> --scope <name>
```

With `carry_over: move` it sets each incomplete task's Sprint field to the next sprint's option, creating that option when it is missing. With `leave` it changes nothing and reports what stayed. A sprint with no incomplete tasks closes as a no-op.

By hand: list the incomplete tasks as in **Sprint tasks**, then `cyber-asana task update <task-gid> --custom-field <sprint-field-gid>=<next-option-gid>` for each.

## Closed sprints

```bash
cyber-asana sprint list --scope <name> --json
```

It lists the sprints that have an option on the field, each with its `state` (`past`, `current`, or `future`). The past ones are the closed sprints. An option an admin disabled is not listed.
