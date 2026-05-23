# asana-agent

Asana CLI and MCP server for AI agents.

## Installation

```sh
npm install -g asana-agent
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
cyber-asana task list --project <gid> --limit 50 --json
cyber-asana task list --project <gid> --limit 50 --offset <next_page.offset>
cyber-asana project list --opt-fields gid,name,permalink_url
```

When pagination is requested with `--limit` or `--offset`, JSON output includes `data` and `next_page`.
Readable output prints the page table and a `Next offset` hint when another page is available.

### Resources

| Resource | Actions |
|---|---|
| `workspace` | `list`, `get` |
| `project` | `list`, `get`, `create`, `update`, `delete` |
| `task` | `list`, `get`, `create`, `update`, `delete`, `search` |
| `section` | `list`, `get`, `create`, `update`, `delete` |
| `user` | `list`, `get`, `me` |
| `team` | `list`, `get` |
| `portfolio` | `list`, `get`, `create`, `update`, `delete` |
| `goal` | `list`, `get`, `create`, `update`, `delete` |
| `tag` | `list`, `get`, `create` |
| `attachment` | `list`, `get` |
| `story` | `list`, `create` |

### Examples

```sh
# List projects
cyber-asana project list

# Create a task
cyber-asana task create "Fix the bug" --project <gid> --due-on 2026-06-01

# Search tasks
cyber-asana task search "login" --json
```

## MCP Server

Add to your MCP host config:

```json
{
  "mcpServers": {
    "asana": {
      "command": "node",
      "args": ["node_modules/asana-agent/dist/mcp.js"],
      "env": {
        "ASANA_TOKEN": "<your-pat>",
        "ASANA_WORKSPACE": "<workspace-gid>"
      }
    }
  }
}
```

Tools are named `asana_<resource>_<action>` (e.g. `asana_task_create`).

List tools accept `limit`, `offset`, and `opt_fields` parameters where Asana supports them.
Paginated MCP responses include `data` and `next_page`.

## License

MIT
