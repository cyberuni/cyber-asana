---
description: Tidy an Asana task or project description — a light copy-edit by default, written back in Asana's HTML subset.
argument-hint: '[task-gid] [emoji] [template:prd|bug|research] [tone] [sources]'
---

Tidy an Asana description for this request:

$ARGUMENTS

Load the `asana` skill from the cyber-asana plugin and follow its **Tidy a description** route,
which reads the description-tidying procedure in the skill's `references/tidy-description.md`. Pass
the request above as its input. When the request names no task or project, ask which description to
tidy.
