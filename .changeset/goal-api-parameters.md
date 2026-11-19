---
"cyber-asana": minor
---

Cover the remaining goal and time period API parameters. `goal create` and `goal update` take a time period, owner, team, workspace-level flag and like (create also takes followers; update takes a status and custom fields), `goal metric set` takes a custom weight flag, `goal list` filters by portfolio, project, task, team, workspace level and time periods, and `goal time-period list` filters by start and end date. The MCP tools take the same fields. A goal's workspace stays fixed at creation, so `goal update` has no workspace option.
