---
'cyber-asana': minor
---

Ship a plugin-local `cyber-asana` launcher in `bin/`, which Claude Code puts on PATH while the plugin is enabled. It runs the `dist/cli.js` that ships with the plugin, so the CLI always matches the plugin's version and a permission rule written for `cyber-asana ...` matches. The skills call the launcher and no longer fall back to `npx cyber-asana@<version>`. Also documents that `--custom-type` on an existing default task needs `--resource-subtype custom`.
