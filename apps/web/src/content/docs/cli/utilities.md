---
title: Utilities
description: URL parsing, TODO scanning, agent session setup, and running the MCP server.
sidebar:
  order: 14
---

Commands that are not tied to one Asana resource.

## Parse Asana URLs

Extract GIDs from a pasted Asana app URL without calling the API:

```sh
cyber-asana url parse 'https://app.asana.com/1/<workspace>/project/<project>/list/<view>' --json
```

Supported paths include `/project/...`, `/project/.../task/...`, `/project/.../list/...`,
and legacy `/0/<workspace>/<task>`.

| Field | Use for task create? |
| --- | --- |
| `workspace_gid` | Yes |
| `project_gid` | Yes |
| `task_gid` | Comments and updates — not create |
| `list_view_gid` | **No** — browser list-view metadata, not a section GID |

The `list_view_gid` trap is the reason this command exists: it looks like a section GID in
the URL but is not one, and passing it as a section is a common failure.

## Scan a codebase for TODOs

```sh
cyber-asana task scan-todos
cyber-asana task scan-todos ./src
cyber-asana task scan-todos --ext .ts,.py --exclude node_modules,dist
```

Walks source files for `TODO`, `FIXME`, and `HACK` comments and returns structured results
you can turn into tasks. No API call — it only reads the filesystem.

| Option | Default |
| --- | --- |
| `--ext <extensions>` | `.ts,.tsx,.js,.jsx,.mjs,.py,.go,.rs,.java,.rb` |
| `--exclude <dirs>` | `node_modules,dist,.git,build,coverage,__pycache__` |

The directory argument defaults to the current working directory.

## Ambient agent context

Install a SessionStart hook so each agent session opens with live Asana context:

```sh
cyber-asana setup hook              # merges into .claude/settings.json
cyber-asana setup hook --dry-run    # report what would change, without writing
```

| Option | Description |
| --- | --- |
| `--settings <path>` | Settings file to write |
| `--dry-run` | Show what would change without writing |

Installing twice is a no-op, and unrelated settings in the file are preserved.

## Run the MCP server

```sh
cyber-asana mcp
```

Starts the stdio MCP server. This is the command MCP hosts invoke. MCP is opt-in; the plugin does not start it (see [CLI vs MCP](/cyber-asana/reference/cli-vs-mcp/)). See the
[MCP reference](/cyber-asana/mcp/) for host configuration and the
[comparison with Asana's official server](/cyber-asana/reference/mcp-comparison/).
