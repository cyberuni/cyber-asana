# Contributing

Guide for developing `cyber-asana` locally. AI coding assistants should also read [AGENTS.md](AGENTS.md).

## Setup

```sh
pnpm install
export ASANA_TOKEN=<your-pat>              # required for system tests
export ASANA_WORKSPACE=<workspace-gid>     # optional default workspace
```

## Build and test

```sh
pnpm verify       # typecheck + lint + test + build
pnpm dev task list --project <gid>        # run CLI without building (tsx)
pnpm test:system  # live API tests (requires ASANA_SYSTEM_TEST=1)
```

See [AGENTS.md](AGENTS.md) for the full command list, architecture, and conventions.

## MCP server

When working in this source tree, `import('cyber-asana/mcp')` does not resolve — there is no `node_modules/cyber-asana` self-link. Build first, then point MCP hosts at `dist/mcp.js`.

```sh
pnpm build
```

| Context | `command` | `args` |
| --- | --- | --- |
| MCP host (Cursor, Claude Desktop, etc.) | `node` | `["dist/mcp.js"]` (relative to repo root) or an absolute path |

### Cursor

In `~/.cursor/mcp.json` or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "cyber-asana": {
      "command": "node",
      "args": ["/absolute/path/to/cyber-asana/dist/mcp.js"],
      "env": {
        "ASANA_TOKEN": "${ASANA_TOKEN}",
        "ASANA_WORKSPACE": "${ASANA_WORKSPACE}"
      }
    }
  }
}
```

Reload MCP servers after changes.

**Dual MCP:** Both the official Asana OAuth MCP and cyber-asana can run together with separate config keys and credentials. Routing guidance is in [readme.md — Using alongside official Asana MCP](readme.md#using-alongside-official-asana-mcp).

### MCP Inspector

Debug tools and schemas without an agent host. UI defaults to [http://localhost:6274](http://localhost:6274).

```sh
pnpm build
npx @modelcontextprotocol/inspector \
  -e ASANA_TOKEN="$ASANA_TOKEN" \
  -e ASANA_WORKSPACE="$ASANA_WORKSPACE" \
  -- node dist/mcp.js
```

Consumer MCP setup (installed package) is documented in [readme.md](readme.md#mcp-server).
