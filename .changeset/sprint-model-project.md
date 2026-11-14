---
'cyber-asana': minor
---

Add the `project` sprint model. Set `sprint_model: project` on the policy or a scope and every `sprint` and `backlog` command works with one project per sprint, grouped in a portfolio: tasks are multi-homed from a backlog project, `sprint start` creates (or duplicates a template for) the sprint project, and `sprint close` carries incomplete tasks to the next one. A scope names its objects with `--backlog-project`, `--sprint-portfolio`, and `--sprint-template` on `config scope add`; a scope that lacks the first two stops with `scope-incomplete` (exit `2`). It ships as the `cyber-asana.sprint-model.project` reference, and `state_carrier: sections` is now noted by the standup and health reports instead of treated as an unknown carrier.
