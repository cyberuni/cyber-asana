---
"cyber-asana": minor
---

Add `report dashboard --post-status` (with `--dry-run`) and the `asana_report_dashboard_post` MCP tool, which post the dashboard as a status update on the scope's project or portfolio. The title and body come from the `## Status update` template of `cyber-asana.dashboard`, now written with named `{placeholders}`, and are checked against Asana's HTML subset first. Nothing is posted when health did not run (`health-required`).
