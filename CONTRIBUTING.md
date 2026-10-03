# Contributing

Guide for developing `cyber-asana` locally. AI coding assistants should also read [AGENTS.md](AGENTS.md).

## Setup

```sh
pnpm install
export ASANA_ACCESS_TOKEN=<your-pat>        # required for system tests
export ASANA_WORKSPACE_GID=<workspace-gid>  # optional default workspace
```

## Build and test

```sh
pnpm verify                             # lint + build + typecheck + test + knip
pnpm ca dev task list --project <gid>   # run CLI without building (tsx)
pnpm ca test:system                     # live API tests (requires ASANA_SYSTEM_TEST=1)
```

`pnpm ca <script>` is the root shortcut for `pnpm run --filter=./packages/cyber-asana <script>`;
`dev`, `test:system` and `test:watch` live on the package, not the workspace root.

See [AGENTS.md](AGENTS.md) for the full command list, architecture, and conventions.

## Plugin manifests

`packages/cyber-asana/plugin.json` is the only manifest you edit. The Claude Code, Cursor, and Codex manifests, the Copilot CLI `com.github.copilot/` tree, and the entry in `.claude-plugin/marketplace.json` are derived from it.

After changing `plugin.json`, a skill, or a command:

```sh
pnpm plugin:build   # regenerate every derived manifest, then format them
pnpm plugin:check   # rebuild and fail on drift (pnpm verify runs this)
```

Commit the derived files together with the change that caused them. Do not edit a `version` field; `pnpm version` moves it. See [AGENTS.md](AGENTS.md#plugin-layout) for the layout.

## MCP server

The plugin does not ship or start the MCP server; it is opt-in for consumers. This section is for running it from this source tree.

When working in this source tree, `import('cyber-asana/mcp')` does not resolve — there is no `node_modules/cyber-asana` self-link. Build first, then point MCP hosts at the built entry under `packages/cyber-asana/dist/`.

```sh
pnpm build
```

| Context | `command` | `args` |
| --- | --- | --- |
| MCP host (Cursor, Claude Desktop, etc.) | `node` | `["packages/cyber-asana/dist/cli.js", "mcp"]` or `["packages/cyber-asana/dist/mcp.js"]` |
| MCP Inspector | `node` | `["packages/cyber-asana/dist/cli.js", "mcp"]` — see [MCP Inspector](readme.md#mcp-inspector) |

### Cursor

In `~/.cursor/mcp.json` or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "cyber-asana": {
      "command": "node",
      "args": ["/absolute/path/to/cyber-asana/packages/cyber-asana/dist/mcp.js"],
      "env": {
        "ASANA_ACCESS_TOKEN": "${env:ASANA_ACCESS_TOKEN}",
        "ASANA_WORKSPACE_GID": "${env:ASANA_WORKSPACE_GID}"
      }
    }
  }
}
```

Reload MCP servers after changes.

**Dual MCP:** Both the official Asana OAuth MCP and cyber-asana can run together with separate config keys and credentials. Routing guidance is in [readme.md — Using alongside official Asana MCP](readme.md#using-alongside-official-asana-mcp).

### Gap analysis vs the official MCP

The docs site's [cyber-asana vs official Asana MCP](https://cyberuni.github.io/cyber-asana/reference/mcp-comparison/) page reports tool counts, overlap pairs, and gaps. Those numbers come from `tools/gap-analysis`, which extracts cyber-asana's tools from `packages/cyber-asana/src/**/mcp.ts` and diffs them against a checked-in snapshot of Asana's documented tool list.

```sh
cd tools/gap-analysis
pnpm fetch-official   # refresh data/official-asana-mcp-baseline.json
pnpm catalog          # re-extract cyber-asana's tools
pnpm report           # print the gap report
```

Regenerate and update the comparison page whenever MCP tools are added or removed, or when Asana publishes new ones. `pnpm check` fails if the checked-in catalog has drifted from the source.

### MCP Inspector

Debug tools and schemas without an agent host. UI defaults to [http://localhost:6274](http://localhost:6274).

```sh
pnpm build
npx @modelcontextprotocol/inspector \
  -e ASANA_ACCESS_TOKEN="$ASANA_ACCESS_TOKEN" \
  -e ASANA_WORKSPACE_GID="$ASANA_WORKSPACE_GID" \
  -- node packages/cyber-asana/dist/cli.js mcp
```

Consumer MCP setup (installed package) is documented in [readme.md](readme.md#mcp-server).
