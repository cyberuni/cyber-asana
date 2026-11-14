---
title: init-asana
description: The setup skill, which settles how to run the CLI, sets credentials, verifies the connection, and optionally enables the MCP server.
---

The `init-asana` skill sets up cyber-asana for the first time. Source: [`SKILL.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/init-asana/SKILL.md) and [`reference.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/init-asana/reference.md).

## When it triggers

Use it when setting up cyber-asana (token, workspace GID, connection check, optional registry), or when commands fail with auth or workspace errors.

## How to use it

Ask your agent to set up cyber-asana. The skill works in steps:

1. **Ensure the CLI.** It settles once how to invoke `cyber-asana`, in this order: a direct dependency run through the package manager, a global install, then `npx cyber-asana@<exact>` with the exact version from `npm view cyber-asana version`. If only npx is left and it fails, it asks before downloading anything.
2. **Check credentials.** It reports whether `ASANA_ACCESS_TOKEN` and `ASANA_WORKSPACE_GID` are set, and tells you to rename the retired `ASANA_TOKEN` and `ASANA_WORKSPACE`.
3. **Set the token** by guiding you to create a personal access token. See [Authentication](/cyber-asana/getting-started/#authentication) for where to keep it.
4. **Verify the connection** with `cyber-asana workspace list`, then ask which workspace to use and set `ASANA_WORKSPACE_GID`. The workspace stays in the environment, not in committed repo config.
5. **Confirm** with `cyber-asana --version`.
6. **Optional registry.** For fixed projects or people, it points to [`config-asana`](/cyber-asana/skills/config-asana/).
7. **Optional MCP server (default: no).** It asks once. On yes, it detects your client (Claude Code, Cursor, Codex, or Copilot CLI), asks for scope, checks for an existing entry, writes `npx -y cyber-asana@<exact> mcp` the client's own way, and tells you to reload. It never writes a token into a project-scoped file or a literal `"${VAR}"` into a client that does not expand it.
8. **Optional dual MCP.** If you run Asana's official MCP server too, it keeps the two config keys and credentials apart. See [MCP server](/cyber-asana/mcp/#using-alongside-official-asana-mcp).
9. **Optional scrum setup.** Last, it offers [`init-asana-scrum`](/cyber-asana/skills/init-asana-scrum/) and hands off on yes.

The plugin itself declares no MCP server; this skill is the only place that writes one, and only when you say yes. See [Why CLI + skills, not MCP by default](/cyber-asana/reference/cli-vs-mcp/).
