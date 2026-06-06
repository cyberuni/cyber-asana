# cyber-asana

## 0.4.1

### Patch Changes

- aff1e0d: Fix polynomial ReDoS vulnerability in HTML tag validation regex.

## 0.4.0

### Minor Changes

- 042e2ca: Add `config list` subcommand as an alias for `config show`.

## 0.3.2

### Patch Changes

- e1cc84d: Fix the preferred cyber-asana token variable name to `ASANA_ACCESS_TOKEN`, while keeping `ASANA_TOKEN` as a deprecated fallback.

## 0.3.1

### Patch Changes

- 35769bc: Prefer `ASANA_ASSESS_TOKEN` and `ASANA_WORKSPACE_GID` for cyber-asana configuration, while keeping `ASANA_TOKEN` and `ASANA_WORKSPACE` as deprecated fallbacks.

## 0.3.0

### Minor Changes

- f9e1dcc: Add `url parse` CLI command and `asana_url_parse` MCP tool to extract workspace and project GIDs from Asana URLs without API calls.
- 5607d24: Add repo project registry (`.agents/cyber-asana.json`) with `config` CLI commands for add, resolve, sync, and show. Generalize create-asana-task skill for task creation with or without URLs.

## 0.2.0

### Minor Changes

- 952965b: Add batch task lookup by GID via Asana's `/batch` API, including MCP support and manual system tests.
- 6b3e45f: Add `task my-tasks` CLI command and `asana_task_my_tasks` MCP tool to list the authenticated user's My Tasks. Supports `--completed-since`, pagination, and `--opt-fields`.
- 2f073b2: Add pagination and `opt_fields` options to list commands and MCP list tools.
- 3a79c4e: Add `project search` and `asana_project_search` support for searching projects by name pattern and Asana project search filters.
- 51d5d86: Add `project counts` CLI and `asana_project_counts` MCP support for project task counts.
- 2f614ac: Add subtask list and create operations: `task subtask-list <task-gid>` CLI command, `task subtask-create <task-gid> <name>` CLI command, `asana_task_subtask_list` MCP tool, and `asana_task_subtask_create` MCP tool.
- e2b5805: Add injectable `stories` and `tags` gateways plus shared-client composition helpers for cleaner testing and runtime wiring.
- 827b42a: Add default list page sizes and fetch-all pagination options with page caps.
- dceb4f2: Add richer project create and update fields, including rich notes, privacy, default view, and explicit date clearing for projects and tasks.
- 0645b1c: Expand `task search` filters to cover the full Asana search API: `.not` and `.all` variants for assignee, project, section, and tag; portfolio, follower, created-by, assigned-by, liked-by, and commented-on-by filters; and date-range filters for due, start, created, completed, and modified dates. All new filters are exposed in both the CLI and the MCP tool.
- 0061a5d: Add task create and update support for HTML notes, parent relationships, resource subtype, custom fields, follower management, and multi-project creation.
- 8469089: Add `create*Api` factory functions and `*Gateway` types for all remaining domains (workspaces, sections, users, teams, attachments, portfolios, goals, tasks, projects).

  Each domain now exposes a `create*Api(gateway)` factory that accepts an injected gateway, enabling use without the Asana SDK or real API calls. The Asana-backed `createAsana*Gateway(client)` factory is also exported for runtime composition.

- d72e6bc: Add `createRuntimeContext`, `registerCliCommands`, and `registerMcpTools` for composing a shared Asana client across all domain APIs. Fix CLI and MCP to report the package version from `package.json`.
- 4850ead: Add tag update/delete, task-tag relationship commands, and formatted story comment support with `html_text` validation.

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
