---
"cyber-asana": minor
---

Skills run the CLI through a forwarder in each skill folder, `node <this skill's folder>/scripts/cyber-asana.mjs`, written by universal-plugin 0.23.0. It runs the plugin's own version on every install route (Claude Code, Cursor, Codex, Copilot CLI) and the local build in a checkout. The `bin/cyber-asana` launcher is removed: only Claude Code put it on `PATH`. The `link-pr` route runs repobuddy through a forwarder pinned to `repobuddy@2.2.0`.
