---
"cyber-asana": minor
---

The plugin no longer starts the MCP server. It ships the CLI and skills only, and the MCP server is opt-in.

**Breaking:** a plugin install (Claude Code, Cursor, Codex, Copilot CLI) no longer registers the `cyber-asana` MCP server, and the package no longer publishes `mcp.json` or `.mcp.json`. The skills drive the CLI instead, which costs far fewer context tokens than 100+ MCP tool schemas. To keep the MCP tools, run the `init-asana` skill and accept its MCP step, or add `npx -y cyber-asana@<version> mcp` to your client's MCP config yourself. The `cyber-asana mcp` command, the `cyber-asana/mcp` export, and every MCP tool are unchanged.
