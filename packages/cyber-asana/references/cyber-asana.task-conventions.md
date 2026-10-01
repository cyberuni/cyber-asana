---
description: How to write Asana tasks — when to use a task, a subtask, or a dependency; how to group several units of work under a parent task; what to fill in for a task and its subtasks, custom fields, and comments; and how to track session work.
tags: [asana, tasks, conventions, tracking]
# Task conventions the cyber-asana CLI and MCP read from this frontmatter. Set them in a repo
# copy at .agents/references/cyber-asana.task-conventions.md with `merge: merge-sections`, not here.
# task_name_format: "<area>: <summary>"
# description_template: |
#   ## Context
#
#   ## Done when
# default_tags: [agent-created]
---

## Choosing the object

| The work is… | Use |
| --- | --- |
| one deliverable one person can finish | a task |
| a step of a task that is tracked on its own | a subtask |
| two or more units of work that serve one outcome | a parent task with a subtask per unit (see **Grouping**) |
| a task that cannot start until another is done | a dependency between the two tasks |

Prefer a task over a subtask. Use a subtask only when its parent is the natural place to look for it:
a step of an existing task, or a unit grouped under a parent task as **Grouping** says. A lone unit of
work is always a plain task.

Projects and milestones are out of scope for this reference.

## Grouping

Apply when one request or one session holds more than one unit of work. A unit is one deliverable
one person can finish on its own.

- **Parent task:** create one only when two or more units serve one outcome. Make each unit a
  subtask of it. A lone unit is a plain task with no parent.
- **Name the parent task** for the outcome the units serve, as a **Task** name. Name each subtask
  as a step, as **Subtask** says.
- **Separate outcomes** stay separate tasks. Do not make a parent task only to hold unrelated units.
- **Order:** when a unit cannot start until another is done, add a dependency between the two
  rather than relying on the subtask order.

## Task

- **Name:** an imperative summary of the outcome, under 80 characters. Follow `task_name_format` when it is set.
- **Description:** start from `description_template` when it is set. Otherwise write:
  - `## Context`: why the work exists, in one or two sentences.
  - `## Done when`: the observable result that completes it.
  - `## Links`: the branch, pull request, issue, or document the work lives in. Leave the section out when there is none.
- **Assignee:** the person doing the work. Leave it empty when nobody is.
- **Due date:** only when the user gives one. Never invent one.
- **Tags:** the defaults apply by themselves. Pass tags only to replace them.
- **Section:** place a task in a section only when the user names one, or when the repo sets `defaults.section`. Match a section by its name. Never infer one from a `/list/<gid>` URL.

## Subtask

- Name it as a step of its parent: `<verb> <object>`, without repeating the parent's name.
- Give it a description only when the step needs more than its name.
- Assign it only when someone other than the parent's assignee does the step.

## Custom fields

- Set a custom field only when the project defines it and the value is known.
- Pass enum values by their option GID. Look them up with `cyber-asana custom-field get <field-gid>` (MCP, if enabled: `asana_custom_field_get`) rather than guessing.

### Story points

Apply when the task's project has a story point or task point field.

- **Find the field:** read `fields.story_points` on the project's entry in `.agents/cyber-asana.json`. When the entry has none, run `cyber-asana config discover-fields <project>`. It finds the field by name and saves its GID there, so later tasks skip the lookup. When it reports several candidates, ask which one to use and save it with `cyber-asana config set-field story_points <field-gid> --project <project>`. Never hard-code a field GID: it differs per workspace and project.
- **Unit:** 1 point is the effort a senior staff engineer who knows the tech stack and the domain needs to fix a one-line bug. That is about one hour of work.
- **Estimate** a new task from its `## Done when`: the hours that engineer would need, in points. Round to the nearest value the field allows. For an enum field, pass the option GID of that value.
- **Measure** a finished task the same way, from the work actually done rather than the work planned.

## Comments

- Comment to record progress or a decision on an existing task. Do not rewrite its description for that.
- Link a pull request or commit in a comment when the task already has a description.

## Tracking session work

Apply when recording work done in an agent session as a task. The `asana` skill's plan step finds
the session's units of work and looks each one up before anything is created; these rules shape what
it writes.

- **Reuse before creating:** an existing task that describes the same outcome — an incomplete one
  assigned to the user or in the project, or one completed recently.
- **Name:** the outcome the session is working toward, not the steps it took. When the session holds
  several units that serve that outcome, the parent task carries it and each subtask names one unit.
- **Description:** `## Context` from the user's request; `## Done when` from what was agreed; `## Links` with the current branch and any pull request.
- **Assignee:** the user (`me`).
- **Project:** the repo's default project, unless the work names another.
- **Update an existing task** with a comment linking the branch or pull request. Do not overwrite its description.
