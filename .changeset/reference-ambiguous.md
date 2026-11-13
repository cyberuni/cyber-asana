---
'cyber-asana': minor
---

An ambiguous reference name now stops the command instead of being skipped. When two plugins ship `cyber-asana.task-conventions`, `task create` (CLI and MCP) used to warn and apply no conventions; it now fails with a `reference-ambiguous` error that lists the options, and the CLI exits `8`. Settle it with the `reference` skill of `cyber-agentkit`, or `reference customize <name> --extends <pick>`. Every cyber-asana reference now loads its frontmatter through one loader.
