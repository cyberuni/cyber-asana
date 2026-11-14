---
description: Write the sprint review — committed vs completed vs added vs removed, burndown, and the demo list — from Asana.
argument-hint: '<optional: a scope or a sprint, e.g. previous>'
---

Write a sprint review for this request:

$ARGUMENTS

Load the `asana-scrum` skill from the cyber-asana plugin and follow its **Review** route, which
reads the review procedure in the skill's `references/review.md`. Pass the request above as its
input. When the request is empty, review the current sprint of the default scope.
