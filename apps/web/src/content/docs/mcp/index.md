---
title: MCP Server
description: cyber-asana Model Context Protocol server reference
---

The `cyber-asana` MCP server exposes Asana operations as tools for AI agents.

## Starting the Server

```bash
cyber-asana mcp
```

## Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cyber-asana": {
      "command": "npx",
      "args": ["-y", "cyber-asana", "mcp"],
      "env": {
        "ASANA_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Available Tools

See the [MCP catalog](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/data/cyber-asana-mcp-catalog.json) for the full list of exposed tools.
