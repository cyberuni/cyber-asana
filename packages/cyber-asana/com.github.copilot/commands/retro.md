---
description: Run a sprint retro — the computed facts, the discussion, action tasks, and an offer to close the sprint.
argument-hint: '<optional: a scope or a sprint, e.g. previous>'
---

Run a retro for this request:

$ARGUMENTS

Load the `asana-scrum` skill from the cyber-asana plugin and follow its **Retro** route, which
reads the retro procedure in the skill's `references/retro.md`. Pass the request above as its
input. When the request is empty, run the retro for the current sprint of the default scope.
