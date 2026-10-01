---
"cyber-asana": patch
---

Ship Copilot CLI the plugin's commands. Root `plugin.json` declares the Agent Plugins `$schema`, so Copilot CLI reads commands only from `com.github.copilot/commands/`, which the package now includes. The vendor manifests are now generated from root `plugin.json` by universal-plugin: the Claude Code and Codex manifests name `skills` and `commands` explicitly, and the shadowing `.plugin/plugin.json` is gone.
