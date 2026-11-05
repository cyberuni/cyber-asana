# MCP reference

## Enable the MCP server

Used by step 7 of [SKILL.md](./SKILL.md). `<exact>` is the version resolved in **Ensure cyber-asana
CLI**. Each client below is configured its own way; check for an existing `cyber-asana` entry first.

### Claude Code

Source: [Claude Code — MCP](https://code.claude.com/docs/en/mcp). Scopes are `local` (this project,
private), `project` (`.mcp.json`, committed), and `user` (every project). A stdio server inherits
Claude Code's environment, so pass no credentials.

```bash
claude mcp get cyber-asana        # existing entry?
claude mcp add --scope user cyber-asana -- npx -y cyber-asana@<exact> mcp
```

Add `--env CYBER_ASANA_MCP_FORMAT=toon` before the name for TOON output.

### Cursor

Source: [Cursor — MCP](https://cursor.com/docs/context/mcp). User scope is `~/.cursor/mcp.json`,
project scope is `.cursor/mcp.json`. Merge this entry into `mcpServers`. Cursor's docs do not say the
server inherits the environment, so reference the variables with Cursor's documented `${env:NAME}`
syntax. An unexpanded reference counts as unset, so a missing token reports itself as missing.

```json
{
  "mcpServers": {
    "cyber-asana": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "cyber-asana@<exact>", "mcp"],
      "env": {
        "ASANA_ACCESS_TOKEN": "${env:ASANA_ACCESS_TOKEN}",
        "ASANA_WORKSPACE_GID": "${env:ASANA_WORKSPACE_GID}"
      }
    }
  }
}
```

### Codex

Source: [Codex — MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli). User scope is
`~/.codex/config.toml`; project scope is `.codex/config.toml` in a trusted project. `env_vars` names
the variables Codex forwards from its own environment, so no value is written to the file.

```bash
codex mcp list                    # existing entry?
codex mcp add cyber-asana -- npx -y cyber-asana@<exact> mcp
```

Then make sure the table forwards the credentials:

```toml
[mcp_servers.cyber-asana]
command = "npx"
args = ["-y", "cyber-asana@<exact>", "mcp"]
env_vars = ["ASANA_ACCESS_TOKEN", "ASANA_WORKSPACE_GID"]
```

### Copilot CLI

Source: [Copilot CLI — add MCP servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers).
User scope is `~/.copilot/mcp-config.json`; project scope is `.mcp.json` or `.github/mcp.json`. Copilot
CLI passes only `PATH` from the environment and documents no variable references, so the token must
be written as a value. Use **user scope only**, and ask before writing the token to that file. If the
user declines, do not add the entry.

```json
{
  "mcpServers": {
    "cyber-asana": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "cyber-asana@<exact>", "mcp"],
      "env": {
        "ASANA_ACCESS_TOKEN": "<the user's token>",
        "ASANA_WORKSPACE_GID": "<workspace gid>"
      },
      "tools": ["*"]
    }
  }
}
```

### Official Asana MCP

If the user prefers MCP, Asana publishes its own hosted server:
[Asana MCP server](https://developers.asana.com/docs/mcp-server). It is the user's choice to connect;
the sections below cover running it alongside cyber-asana.

## Dual MCP

Run the [official Asana MCP](https://developers.asana.com/docs/mcp-tools-reference) and cyber-asana together. Tool names differ (`create_tasks` vs `asana_task_create`); use separate **config keys** — `"asana"` for official, `"cyber-asana"` for this package.

| Server | Config key | Auth | Env vars |
| --- | --- | --- | --- |
| Official Asana MCP | `asana` | OAuth 2.0 (hosted, **MCP app** you register) | `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET` (Asana's documented names) |
| cyber-asana | `cyber-asana` | Personal access token, or OAuth 2.0 + PKCE via `cyber-asana auth login` (your own **API app**) | `ASANA_ACCESS_TOKEN`, optional `ASANA_WORKSPACE_GID`; for OAuth, `ASANA_API_CLIENT_ID` / `ASANA_API_CLIENT_SECRET` |

**Credentials are not interchangeable — neither the tokens nor the app registrations.**

Asana's hosted MCP server does not support dynamic client registration, so you pre-register an app of type **MCP app** ([integrating](https://developers.asana.com/docs/integrating-with-asanas-mcp-server), [connecting](https://developers.asana.com/docs/connecting-mcp-clients-to-asanas-v2-server)). Asana states that tokens issued for MCP apps only work with the MCP server, and that standard API requests need a separate **API app**.

- **Tokens** — MCP OAuth tokens from the official server cannot be used as `ASANA_ACCESS_TOKEN`. PATs cannot substitute for official MCP OAuth.
- **Client ids and secrets** — an MCP app's pair cannot drive `cyber-asana auth login`, which needs an API app's. Asana documents the MCP app's pair under `ASANA_CLIENT_ID` / `ASANA_CLIENT_SECRET`, so one exported pair cannot serve both. Give cyber-asana its API app through `ASANA_API_CLIENT_ID` / `ASANA_API_CLIENT_SECRET` (names cyber-asana defines) or `~/.config/cyber-asana/settings.json`, and keep the official server's pair in the host config's `auth` block.
- **Verifying which one won** — `cyber-asana auth status` reports the app registration alongside the token credential: an `App` line with the masked client id and its source, and `App ignored` for the registrations it shadows (`app.client_id_masked` / `app.source` / `app.shadowed` under `--json`). Check it whenever both pairs are exported. A wrong registration that reaches Asana fails with `invalid_client`, and the CLI appends a hint about the API-app / MCP-app distinction.

Dual-config example (Cursor `mcp.json`):

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
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "cyber-asana@<exact>", "mcp"],
      "env": {
        "ASANA_ACCESS_TOKEN": "${env:ASANA_ACCESS_TOKEN}",
        "ASANA_WORKSPACE_GID": "${env:ASANA_WORKSPACE_GID}"
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
