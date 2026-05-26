# cyber-asana

Asana CLI and MCP server for AI agents.

## Installation

```sh
npm install -g cyber-asana
```

## Authentication

Set your [Asana personal access token](https://app.asana.com/0/my-apps):

```sh
export ASANA_TOKEN=<your-pat>
export ASANA_WORKSPACE=<workspace-gid>   # optional default workspace
```

Or pass `--token <pat>` and `--workspace <gid>` per command.

## CLI

```sh
cyber-asana <resource> <action> [options]
```

Output is human-readable by default. Add `--json` for raw API JSON.

List commands support pagination and field selection where Asana supports it:

```sh
cyber-asana task list --project <gid> --json
cyber-asana task list --project <gid> --limit 50 --offset <next_page.offset>
cyber-asana task list --project <gid> --all --max-pages 5
cyber-asana project list --opt-fields gid,name,permalink_url
```

List commands request 100 results per page by default.
When pagination is used, JSON output includes `data`, `next_page`, and `limit`.
Readable output prints the page table and a `Next offset` hint when another page is available.
Use `--all` to fetch multiple pages intentionally; `--max-pages` caps the number of pages fetched.

### Resources

| Resource | Actions |
|---|---|
| `workspace` | `list`, `get` |
| `project` | `list`, `get`, `counts`, `search`, `create`, `update`, `delete` |
| `task` | `list`, `my-tasks list`, `get`, `create`, `update`, `delete`, `subtask list`, `subtask create`, `search`, `project add/remove`, `follower add/remove`, `dependency list/add/remove`, `dependent list/add/remove` |
| `section` | `list`, `get`, `create`, `update`, `delete` |
| `user` | `list`, `get`, `me` |
| `team` | `list`, `get` |
| `portfolio` | `list`, `get`, `create`, `update`, `delete` |
| `goal` | `list`, `get`, `create`, `update`, `delete` |
| `tag` | `list`, `get`, `create` |
| `attachment` | `list`, `get` |
| `story` | `list`, `create` |
| `comment` | `list`, `create` (alias for `story`) |

### GID options

Commands that accept a resource GID support both a canonical `--foo-gid` flag and a shorter legacy alias `--foo`:

```sh
cyber-asana task list --project-gid <gid>
cyber-asana task list --project <gid>      # legacy alias
```

### Incomplete tasks

All task list commands accept `--incomplete` as a shorthand for `--completed-since now`:

```sh
# Only incomplete tasks in a project
cyber-asana task list --project <gid> --incomplete

# Only incomplete My Tasks
cyber-asana task my-tasks list --incomplete

# Only incomplete subtasks
cyber-asana task subtask list <task-gid> --incomplete
```

### Subtask opt_fields shortcuts

`task subtask list` provides named flags for commonly needed extra fields. These compose with `--opt-fields`:

```sh
# Get assignee emails for all incomplete subtasks
cyber-asana task subtask list <task-gid> --incomplete --assignee-email

# Get follower emails (for blast email)
cyber-asana task subtask list <task-gid> --follower-emails

# Combine shortcuts with custom opt-fields
cyber-asana task subtask list <task-gid> --assignee-email --opt-fields "due_on,notes"
```

| Flag | Adds to opt_fields |
|---|---|
| `--assignee-email` | `assignee,assignee.email` |
| `--follower-emails` | `followers,followers.email` |
| `--num-subtasks` | `num_subtasks` |
| `--custom-fields` | `custom_fields` |

### Task project membership

A task can belong to multiple projects simultaneously (multi-homing). Use `project add` and `project remove` to manage this, with optional section placement and insert positioning.

```sh
# Add task to a project (appended at end)
cyber-asana task project add <task-gid> <project-gid>

# Add into a specific section
cyber-asana task project add <task-gid> <project-gid> --section <section-gid>

# Position relative to another task
cyber-asana task project add <task-gid> <project-gid> --insert-after <other-task-gid>
cyber-asana task project add <task-gid> <project-gid> --insert-before <other-task-gid>

# Remove from a project (task is not deleted)
cyber-asana task project remove <task-gid> <project-gid>
```

`--insert-after` and `--insert-before` are mutually exclusive. Omitting both places the task at the end of the project or section.

`task create` also accepts a comma-separated project list with `--project-gid <gid[,gid...]>` or `--project <gid[,gid...]>` for initial multi-project placement.

### Task create and update fields

`task create` and `task update` support plain-text or HTML notes, custom field values, resource subtype, and parent relationships.

```sh
# Create a milestone task in multiple projects with HTML notes
cyber-asana task create "Launch" \
  --workspace-gid <workspace-gid> \
  --project-gid <proj-a,proj-b> \
  --resource-subtype milestone \
  --html-notes '<body><strong>Ship it</strong></body>'

# Update a task's parent and custom fields
cyber-asana task update <task-gid> \
  --parent-gid <parent-task-gid> \
  --custom-fields-json '{"<custom-field-gid>":"value"}'
```

`notes` and `html_notes` are mutually exclusive on both create and update.

| Flag | Command(s) | Notes |
|---|---|---|
| `--html-notes <html>` | `task create`, `task update` | Send task notes as HTML |
| `--parent-gid <gid>` / `--parent <gid>` | `task create`, `task update` | Set the task parent |
| `--clear-parent` | `task update` | Remove the task parent |
| `--resource-subtype <subtype>` | `task create`, `task update` | Example: `default_task`, `milestone` |
| `--custom-fields-json <json>` | `task create`, `task update` | JSON object keyed by custom field GID |
| `--custom-field <gid=value>` | `task create`, `task update` | Repeatable convenience override for simple values |
| `--follower <gid[,gid...]>` | `task create` | Add followers immediately after task creation |

When both custom-field forms are provided, repeated `--custom-field` entries override duplicate keys from `--custom-fields-json`.

### Task followers

Use follower commands to add or remove followers on an existing task.

```sh
cyber-asana task follower add <task-gid> <user-gid> [<user-gid>...]
cyber-asana task follower remove <task-gid> <user-gid> [<user-gid>...]
```

### Task dependencies and dependents

Asana models dependencies as simple blocking relationships (Finish-to-Start only). A dependency is a task that must finish before this task can start; a dependent is a task that cannot start until this task finishes.

```sh
# List tasks this task depends on (includes completed/due_on by default)
cyber-asana task dependency list <task-gid>
cyber-asana task dependency list <task-gid> --opt-fields "gid,name,assignee"

# Add/remove dependencies
cyber-asana task dependency add <task-gid> <dep-gid> [<dep-gid>...]
cyber-asana task dependency remove <task-gid> <dep-gid> [<dep-gid>...]

# List tasks that are blocked by this task
cyber-asana task dependent list <task-gid>

# Add/remove dependents
cyber-asana task dependent add <task-gid> <dep-gid> [<dep-gid>...]
cyber-asana task dependent remove <task-gid> <dep-gid> [<dep-gid>...]
```

Asana enforces a combined limit of 30 dependencies and dependents per task.

### Comments (stories)

`comment` is an alias for `story`. Both commands are identical:

```sh
cyber-asana comment list --task <gid>
cyber-asana comment create "Great work!" --task <gid>

# Equivalent:
cyber-asana story list --task <gid>
cyber-asana story create "Great work!" --task <gid>
```

Use `--template` to interpolate task data into the comment text before posting. Supported variables: `{task.name}`, `{task.assignee}`, `{task.due_on}`, `{task.notes}`.

```sh
cyber-asana comment create \
  "Hey {task.assignee}, your task '{task.name}' is due {task.due_on}. Please update!" \
  --task <gid> --template
```

### Task search filters

`task search` accepts an optional text query plus filters.

Filters that accept `<gid[,gid...]>` take one or more comma-separated GIDs.

```sh
# Text search
cyber-asana task search "login"

# Incomplete tasks in a project
cyber-asana task search --no-completed --project <gid>

# Overdue milestones assigned to a user
cyber-asana task search --assignee <user-gid> --subtype milestone --due-on-before 2026-01-01

# Blocked tasks, sorted by due date
cyber-asana task search --is-blocked --sort-by due_date --json

# Tasks modified this week, excluding a specific project
cyber-asana task search --modified-on-after 2026-05-17 --project-not <gid>
```

**Status filters:** `--completed/--no-completed`, `--subtask/--no-subtask`, `--has-attachment`, `--is-blocking`, `--is-blocked`

**Resource filters** (accept `<gid[,gid...]>`):
- `--assignee`, `--assignee-not`
- `--project`, `--project-not`, `--project-all`
- `--section`, `--section-not`, `--section-all`
- `--tag`, `--tag-not`, `--tag-all`
- `--team`, `--portfolio`
- `--follower`, `--follower-not`
- `--created-by`, `--created-by-not`
- `--assigned-by`, `--assigned-by-not`
- `--liked-by-not`, `--commented-on-by-not`

**Date filters** (YYYY-MM-DD for `*-on`, ISO 8601 for `*-at`):
- `--due-on`, `--due-on-before`, `--due-on-after`, `--due-at-before`, `--due-at-after`
- `--start-on`, `--start-on-before`, `--start-on-after`
- `--created-on`, `--created-on-before`, `--created-on-after`, `--created-at-before`, `--created-at-after`
- `--completed-on`, `--completed-on-before`, `--completed-on-after`, `--completed-at-before`, `--completed-at-after`
- `--modified-on`, `--modified-on-before`, `--modified-on-after`, `--modified-at-before`, `--modified-at-after`

**Other:** `--subtype <subtype>`, `--sort-by <field>`, `--sort-asc`, `--opt-fields <fields>`

### Project search filters

`project search` accepts an optional text query plus filters.

Filters that accept `<gid[,gid...]>` take one or more comma-separated identifiers.

```sh
# Search by name pattern
cyber-asana project search "launch" --workspace-gid <gid>

# Incomplete projects owned by me
cyber-asana project search --workspace-gid <gid> --no-completed --owner me

# Projects in a portfolio, sorted by due date
cyber-asana project search --workspace-gid <gid> --portfolio <gid> --sort-by due_date
```

**Status filters:** `--completed/--no-completed`

**Resource filters** (accept `<gid[,gid...]>`):
- `--team`
- `--owner`
- `--member`, `--member-not`
- `--portfolio`

**Date filters** (YYYY-MM-DD for `*-on`, ISO 8601 for `*-at`):
- `--completed-on`, `--completed-on-before`, `--completed-on-after`, `--completed-at-before`, `--completed-at-after`
- `--created-on`, `--created-on-before`, `--created-on-after`, `--created-at-before`, `--created-at-after`
- `--due-on`, `--due-on-before`, `--due-on-after`, `--due-at-before`, `--due-at-after`
- `--start-on`, `--start-on-before`, `--start-on-after`

**Other:** `--sort-by <field>`, `--sort-asc`, `--opt-fields <fields>`

Project search uses Asana’s premium search endpoint. Results may be eventually consistent, so newly changed projects may not appear immediately.

### Project task counts

Use `project counts` to read task-count fields from Asana’s project task-count endpoint.

```sh
# Default counts
cyber-asana project counts <project-gid>

# Request custom count fields
cyber-asana project counts <project-gid> --opt-fields num_tasks,num_completed_tasks
```

Asana returns no fields from this endpoint unless `opt_fields` is supplied. This wrapper defaults to `num_tasks,num_incomplete_tasks,num_completed_tasks`.

This endpoint has a stricter Asana rate/cost profile than ordinary project reads, so prefer the default field set unless you need additional count fields.

### Examples

```sh
# List projects
cyber-asana project list

# Search projects
cyber-asana project search "launch" --workspace-gid <gid>

# Create a task
cyber-asana task create "Fix the bug" --workspace-gid <gid> --project-gid <gid> --due-on 2026-06-01

# Search tasks
cyber-asana task search "login" --json
```

### Parse Asana URLs

Extract GIDs from pasted Asana app URLs without calling the API:

```sh
cyber-asana url parse 'https://app.asana.com/1/<workspace>/project/<project>/list/<view>' --json
```

Supported paths include `/project/...`, `/project/.../task/...`, `/project/.../list/...`, and legacy `/0/<workspace>/<task>`.

| Field | Use for task create? |
| --- | --- |
| `workspace_gid` | Yes |
| `project_gid` | Yes |
| `task_gid` | Comments, updates — not create |
| `list_view_gid` | **No** — browser list-view metadata, not a section GID |

For task creation (with optional URL parsing), use the [`create-asana-task`](skills/create-asana-task/SKILL.md) skill.

### Repo project registry

Commit a project name → GID map at `.agents/cyber-asana.json` (see [`.agents/cyber-asana.json.example`](.agents/cyber-asana.json.example)). Workspace GID stays in `ASANA_WORKSPACE` — not in this file ([ADR](docs/adr/0001-no-workspace-gid-in-repo-config.md)).

```sh
cyber-asana config add <project-gid>              # seed or update an entry
cyber-asana config resolve-project "Backend" --json  # local lookup, no API
cyber-asana config sync                           # refresh all cached names from Asana
cyber-asana config show
```

`project get` (CLI/MCP) opportunistically updates cached names when results include `{ gid, name }`.

## MCP Server

`cyber-asana` ships a stdio MCP server. Set [authentication](#authentication) env vars (`ASANA_TOKEN`, optional `ASANA_WORKSPACE`) before connecting.

Install `cyber-asana` in the project that hosts your agent (`npm install cyber-asana`). The host spawns a child process and talks MCP over stdio — not a shared daemon.

| Context | `command` | `args` |
| --- | --- | --- |
| Project dependency (`npm install cyber-asana`) | `node` | `["-e", "import('cyber-asana/mcp')"]` |

The package exports `./mcp` → `dist/mcp.js`. Do not use `["--import", "cyber-asana/mcp"]` alone — without a main script, Node does not wire stdin to the MCP server and the host times out on `initialize`. `["--import", "cyber-asana/mcp", "-e", ""]` also works, but prefer the dynamic-import row above.

Developing this repo? See [CONTRIBUTING.md](CONTRIBUTING.md).

### Using alongside official Asana MCP

You can run **both** the [official Asana MCP](https://developers.asana.com/docs/mcp-tools-reference) and cyber-asana in the same host. Tool names already differ (`create_tasks` vs `asana_task_create`), so the real conflict is the **config key** — use `"asana"` for the official server and `"cyber-asana"` for this package.

| Server | Config key | Auth | Env vars |
| --- | --- | --- | --- |
| Official Asana MCP | `asana` | OAuth 2.0 | `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET` |
| cyber-asana | `cyber-asana` | Personal access token | `ASANA_TOKEN`, optional `ASANA_WORKSPACE` |

**Credentials are not interchangeable:** MCP OAuth tokens from the official server cannot be used as `ASANA_TOKEN` for cyber-asana or the REST API. PATs cannot substitute for official MCP OAuth.

Dual-config example (Cursor-style; see [Asana's connecting doc](https://developers.asana.com/docs/connecting-mcp-clients-to-asanas-v2-server) for host-specific OAuth setup):

```json
{
  "mcpServers": {
    "asana": {
      "url": "https://mcp.asana.com/v2/mcp",
      "auth": {
        "CLIENT_ID": "${env:ASANA_CLIENT_ID}",
        "CLIENT_SECRET": "${env:ASANA_CLIENT_SECRET}"
      }
    },
    "cyber-asana": {
      "command": "node",
      "args": ["-e", "import('cyber-asana/mcp')"],
      "env": {
        "ASANA_TOKEN": "${ASANA_TOKEN}",
        "ASANA_WORKSPACE": "${ASANA_WORKSPACE}"
      }
    }
  }
}
```

Shell profile for dual setup:

```sh
export ASANA_CLIENT_ID="..."      # official MCP OAuth app
export ASANA_CLIENT_SECRET="..."  # official MCP OAuth app
export ASANA_TOKEN="..."          # cyber-asana PAT (create at app.asana.com → My Apps)
export ASANA_WORKSPACE="..."      # cyber-asana default workspace (optional)
```

**Migration:** If you already registered cyber-asana under the config key `"asana"`, rename it to `"cyber-asana"` before adding the official `"asana"` server. This is a host-config change only — not a package breaking change.

**Which server to use:**

| Prefer official `asana` | Prefer `cyber-asana` |
| --- | --- |
| `search_objects`, `get_status_overview` | `asana_url_parse`, repo config (`.agents/cyber-asana.json`) |
| Interactive previews (`create_task_preview`, etc.) | Subtasks, dependencies, followers, section placement |
| New MCP-only capabilities Asana ships first | `asana_task_scan_todos`, `asana_project_export`, rich REST-backed writes |
| Simple reads when V2 coverage suffices | Goals/tags/portfolios CRUD beyond V2 scope |

Default: if both can do the job, prefer **official for discovery/status** and **cyber-asana for write-heavy automation**.

Shared JSON block (cyber-asana only, project install):

```json
{
  "mcpServers": {
    "cyber-asana": {
      "command": "node",
      "args": ["-e", "import('cyber-asana/mcp')"],
      "env": {
        "ASANA_TOKEN": "<your-pat>",
        "ASANA_WORKSPACE": "<workspace-gid>"
      }
    }
  }
}
```

### Claude Desktop

| OS | Config file |
| --- | --- |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

Merge the shared JSON block above into the top-level `mcpServers` object. Restart Claude Desktop after saving.

### Claude Code

**User or local scope** (recommended for personal tokens):

```sh
claude mcp add -e ASANA_TOKEN=<your-pat> -e ASANA_WORKSPACE=<workspace-gid> cyber-asana -- \
  node -e "import('cyber-asana/mcp')"
```

Official Asana MCP (OAuth; see [Asana connecting doc](https://developers.asana.com/docs/connecting-mcp-clients-to-asanas-v2-server) for exact flags):

```sh
claude mcp add --transport http asana https://mcp.asana.com/v2/mcp
```

**Project scope** — commit `.mcp.json` in the repo root. Claude Code expands `${VAR}` from your shell environment (export `ASANA_TOKEN` before launching):

```json
{
  "mcpServers": {
    "cyber-asana": {
      "command": "node",
      "args": ["-e", "import('cyber-asana/mcp')"],
      "env": {
        "ASANA_TOKEN": "${ASANA_TOKEN}",
        "ASANA_WORKSPACE": "${ASANA_WORKSPACE}"
      }
    }
  }
}
```

Verify with `claude mcp list`. Use `/mcp` in a session to reconnect without restarting.

### Cursor

User-wide: `~/.cursor/mcp.json`. Project-specific: `.cursor/mcp.json` in the repo root. Use the shared JSON block above. Reload MCP servers after changes; Agent mode is required for tool use.

### Codex

Add to `~/.codex/config.toml` (project-local Codex config is also supported under `.codex/config.toml`):

```toml
[mcp_servers.cyber-asana]
command = "node"
args = ["-e", "import('cyber-asana/mcp')"]

[mcp_servers.cyber-asana.env]
ASANA_TOKEN = "<your-pat>"
ASANA_WORKSPACE = "<workspace-gid>"
```

### MCP Inspector

Debug tools and schemas without an agent host. UI defaults to [http://localhost:6274](http://localhost:6274).

Project dependency:

```sh
npx @modelcontextprotocol/inspector \
  -e ASANA_TOKEN=<your-pat> \
  -e ASANA_WORKSPACE=<workspace-gid> \
  -- node -e "import('cyber-asana/mcp')"
```

Tools are named `asana_<resource>_<action>` (e.g. `asana_task_create`).

### MCP tools

| Resource | Tools |
| --- | --- |
| `workspace` | `asana_workspace_list`, `asana_workspace_get` |
| `project` | `asana_project_list`, `asana_project_get`, `asana_project_counts`, `asana_project_search`, `asana_project_create`, `asana_project_update`, `asana_project_delete`, `asana_project_export` |
| `task` | `asana_task_list`, `asana_task_my_tasks`, `asana_task_subtask_list`, `asana_task_subtask_create`, `asana_task_get`, `asana_task_get_many`, `asana_task_create`, `asana_task_update`, `asana_task_delete`, `asana_task_search`, `asana_task_follower_add`, `asana_task_follower_remove`, `asana_task_project_add`, `asana_task_project_remove`, `asana_task_dependency_list`, `asana_task_dependency_add`, `asana_task_dependency_remove`, `asana_task_dependent_list`, `asana_task_dependent_add`, `asana_task_dependent_remove`, `asana_task_scan_todos` |
| `section` | `asana_section_list`, `asana_section_get`, `asana_section_create`, `asana_section_update`, `asana_section_delete` |
| `user` | `asana_user_list`, `asana_user_get`, `asana_user_me` |
| `team` | `asana_team_list`, `asana_team_get` |
| `portfolio` | `asana_portfolio_list`, `asana_portfolio_get`, `asana_portfolio_create`, `asana_portfolio_update`, `asana_portfolio_delete` |
| `goal` | `asana_goal_list`, `asana_goal_get`, `asana_goal_create`, `asana_goal_update`, `asana_goal_delete` |
| `tag` | `asana_tag_list`, `asana_tag_get`, `asana_tag_create`, `asana_tag_update`, `asana_tag_delete`, `asana_tag_list_for_task`, `asana_tag_list_tasks`, `asana_tag_add_to_task`, `asana_tag_remove_from_task` |
| `attachment` | `asana_attachment_list`, `asana_attachment_get` |
| `story` | `asana_story_list`, `asana_story_create` |
| `comment` | `asana_comment_list`, `asana_comment_create` (aliases for `story`) |
| `url` | `asana_url_parse` (no API call; extracts GIDs from Asana app URLs) |

List tools accept `limit`, `offset`, `opt_fields`, `fetch_all`, and `max_pages` where Asana supports them.
Paginated responses include `data`, `next_page`, and `limit`; fetch-all responses also include `page_count` and `truncated`.
`asana_user_list` omits `limit`; search tools are not paginated.

Notable parameters:

- `asana_task_list`, `asana_task_my_tasks`, `asana_task_subtask_list` — `incomplete: true` filters to incomplete tasks
- `asana_task_subtask_list` — `assignee_email`, `follower_emails`, `num_subtasks`, `custom_fields` expand returned fields
- `asana_task_create` — `project_gid`, `project_gids`, `follower_gids`, `html_notes`, `parent_gid`, `resource_subtype`, `custom_fields`
- `asana_task_update` — `html_notes`, `parent_gid`, `clear_parent`, `resource_subtype`, `custom_fields`
- `asana_task_follower_add` / `asana_task_follower_remove` — manage followers on existing tasks
- `asana_project_search` — `text`, `completed`, team/owner/member/portfolio filters, date filters, `sort_by`, `sort_ascending`, `opt_fields`
- `asana_project_counts` — `opt_fields` defaults to `num_tasks,num_incomplete_tasks,num_completed_tasks`
- `asana_story_create` / `asana_comment_create` — `template: true` interpolates `{task.name}`, `{task.assignee}`, `{task.due_on}`, `{task.notes}`
- `asana_url_parse` — local URL parsing; use `workspace_gid` + `project_gid` for create; `list_view_gid` is not a section GID

Per-tool parameter schemas live in `src/<domain>/mcp.ts` (e.g. `src/tasks/mcp.ts`) and [`src/url-mcp.ts`](src/url-mcp.ts). MCP hosts also expose tool schemas at runtime when the server is connected.

Agent workflow for creating tasks: [`skills/create-asana-task/SKILL.md`](skills/create-asana-task/SKILL.md).

## License

MIT
