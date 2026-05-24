# cyber-asana

## 0.1.0

### Minor Changes

- b6a34b0: Initial release of `cyber-asana` — an Asana CLI and MCP server for AI agents.

  **CLI** (`cyber-asana <resource> <action>`):

  - Covers all major Asana resources: workspaces, projects, tasks, sections, users, teams, portfolios, goals, tags, attachments, and stories
  - Human-readable output by default (key-value for single items, table for lists); pass `--json` for raw API JSON
  - `ASANA_TOKEN` env var for authentication; `--token` flag overrides per invocation
  - `ASANA_WORKSPACE` env var for default workspace GID; `--workspace` flag overrides per invocation
  - Clear setup instructions printed when `ASANA_TOKEN` is missing

  **MCP server** (`node dist/mcp.js`, stdio transport):

  - Exposes all CLI operations as MCP tools named `asana_<resource>_<action>`
  - Drop-in for any MCP-compatible AI agent host
