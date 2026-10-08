---
"cyber-asana": minor
---

The `improve-description` skill is now the `/cyber-asana:tidy-description` command. Its procedure moved into the `asana` skill as the **Tidy a description** route (`skills/asana/references/tidy-description.md`), so a request to clean up a task or project description, or to recover when `html_notes` fails with "XML is invalid", reaches it through the `asana` skill. The command takes the same arguments: `[task-gid] [emoji] [template:prd|bug|research] [tone] [sources]`. If you invoked `improve-description` by name, use `/cyber-asana:tidy-description` or ask the `asana` skill instead.
