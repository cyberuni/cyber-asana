# Dual MCP reference

Run the [official Asana MCP](https://developers.asana.com/docs/mcp-tools-reference) and cyber-asana together. Tool names differ (`create_tasks` vs `asana_task_create`); use separate **config keys** — `"asana"` for official, `"cyber-asana"` for this package.

| Server | Config key | Auth | Env vars |
| --- | --- | --- | --- |
| Official Asana MCP | `asana` | OAuth 2.0 | `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET` |
| cyber-asana | `cyber-asana` | Personal access token | `ASANA_ASSESS_TOKEN`, optional `ASANA_WORKSPACE_GID` |

**Credentials are not interchangeable:** MCP OAuth tokens from the official server cannot be used as `ASANA_ASSESS_TOKEN`. PATs cannot substitute for official MCP OAuth.

Dual-config example (Cursor-style):

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
        "ASANA_ASSESS_TOKEN": "${ASANA_ASSESS_TOKEN}",
        "ASANA_WORKSPACE_GID": "${ASANA_WORKSPACE_GID}"
      }
    }
  }
}
```

**Which server to use:**

| Prefer official `asana` | Prefer `cyber-asana` |
| --- | --- |
| `search_objects`, `get_status_overview` | `asana_url_parse`, repo config (`.agents/cyber-asana.json`) |
| Interactive previews (`create_task_preview`, etc.) | Subtasks, dependencies, followers, section placement |
| New MCP-only capabilities Asana ships first | `asana_task_scan_todos`, `asana_project_export`, rich REST-backed writes |

Default: official for discovery/status; cyber-asana for write-heavy automation.
