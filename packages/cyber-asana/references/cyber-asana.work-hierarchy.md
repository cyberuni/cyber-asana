---
description: How to shape Asana work — which object to use, and what to fill in for projects, sections, tasks, subtasks, milestones, custom fields, and comments.
tags: [asana, tasks, conventions, tracking]
# Settings the cyber-asana CLI and MCP apply themselves. Uncomment one to set it.
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
| an ongoing stream with its own owner and many tasks | a project |
| a stage or category inside one project | a section |
| one deliverable one person can finish | a task |
| a step of a task that is tracked on its own | a subtask |
| a date or event other tasks lead up to | a milestone (`resource_subtype: milestone`) |
| a task that cannot start until another is done | a dependency between the two tasks |

Prefer a task over a subtask. Use a subtask only when its parent is the natural place to look for it.

## Project

- Create a project only when the user asks for one.
- Register a project the repo works in with `cyber-asana config add <gid> --alias <alias>`, not by repeating its GID.

## Section

- Place a task in a section only when the user names one, or when the repo sets `defaults.section`.
- Match a section by its name. Never infer one from a `/list/<gid>` URL.

## Task

- **Name:** an imperative summary of the outcome, under 80 characters. Follow `task_name_format` when it is set.
- **Description:** start from `description_template` when it is set. Otherwise write:
  - `## Context`: why the work exists, in one or two sentences.
  - `## Done when`: the observable result that completes it.
  - `## Links`: the branch, pull request, issue, or document the work lives in. Leave the section out when there is none.
- **Assignee:** the person doing the work. Leave it empty when nobody is.
- **Due date:** only when the user gives one. Never invent one.
- **Tags:** the defaults apply by themselves. Pass tags only to replace them.

## Subtask

- Name it as a step of its parent: `<verb> <object>`, without repeating the parent's name.
- Give it a description only when the step needs more than its name.
- Assign it only when someone other than the parent's assignee does the step.

## Milestone

- Name it after the event, not the work: `Beta shipped`, not `Ship beta`.
- Give it a due date. A milestone without one is a task.

## Custom fields

- Set a custom field only when the project defines it and the value is known.
- Pass enum values by their option GID. Look them up with `asana_custom_field_get` rather than guessing.

## Comments

- Comment to record progress or a decision on an existing task. Do not rewrite its description for that.
- Link a pull request or commit in a comment when the task already has a description.

## Tracking session work

Apply when recording work done in an agent session as a task.

- **Reuse before creating:** an incomplete task already assigned to the user that describes the same outcome.
- **Name:** the outcome the session is working toward, not the steps it took.
- **Description:** `## Context` from the user's request; `## Done when` from what was agreed; `## Links` with the current branch and any pull request.
- **Assignee:** the user (`me`).
- **Project:** the repo's default project, unless the work names another.
- **Update an existing task** with a comment linking the branch or pull request. Do not overwrite its description.
