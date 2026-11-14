---
'cyber-asana': minor
---

Add the `init-asana-scrum` skill, which sets up scrum on Asana for a repo or team: it adds a `project` or `projects` scope, shows the `sections` sprint model's requirements, reports which points, sprint, and status fields exist, offers to create the backlog section and start the current sprint, and writes only the non-default keys of the sprint policy into `.agents/references/cyber-asana.scrum.md`. It asks before it creates or writes anything and is safe to re-run. `init-asana` now ends by offering it.
