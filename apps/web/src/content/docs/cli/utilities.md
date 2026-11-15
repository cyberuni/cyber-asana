---
title: Utilities
description: URL parsing, Asana HTML checks, TODO scanning, agent session setup, and running the MCP server.
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

## Check and fix Asana HTML

Asana accepts a different subset of rich text on each surface, and some failures are silent: a
status update holding a heading is accepted, then stored with the whole body escaped as text.
These commands read one rule table and make no API call. Pass a file, or pipe the HTML on stdin.

```sh
cyber-asana html check body.html --surface status-update --json
cyber-asana html fix body.html --surface status-update > fixed.html
cyber-asana html rules --surface task-notes --json
```

| Surface | Used by |
| --- | --- |
| `task-notes` | `html_notes` on tasks (probed on `PUT /tasks/{gid}`) |
| `status-update` | `html_text` on status updates; headings are written as `<strong>` lines |

`check` returns `ok` and the `problems` it found, and exits 0 either way. `fix` writes a bare
`<body>`, `<b>`/`<i>` as `<strong>`/`<em>`, paragraphs and breaks as newlines, and replaces any
heading the surface does not keep. What it cannot repair, such as an `<img>` or a `<li>` outside a
list, goes to stderr, or to `problems` with `--json`. `rules` lists each surface's allowed and
rejected tags, the live probe behind them, and the tags not yet verified on that surface.

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
