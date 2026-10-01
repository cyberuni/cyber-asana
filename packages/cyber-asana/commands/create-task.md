---
description: Create an Asana task with consistent workspace, project, and URL resolution, following the repo's task conventions.
argument-hint: '<what the task is for, an Asana URL, a project, an assignee, a section>'
---

Create an Asana task for this request:

$ARGUMENTS

Load the `asana` skill from the cyber-asana plugin and follow its **Create a task** route, which
reads the task-creation procedure in the skill's `references/create-task.md`. Pass the request
above as its input. When the request is empty, ask what the task is for.
