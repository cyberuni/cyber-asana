---
title: CLI Overview
description: Global options, output formats, and pagination shared by every cyber-asana command.
sidebar:
  order: 1
---

The `cyber-asana` CLI exposes the same operations as the MCP server, without needing an
agent host. Every command follows the same shape:

```sh
cyber-asana <resource> <action> [options]
```

```sh
cyber-asana task list --project <gid>
cyber-asana project create "Launch" --workspace-gid <gid>
cyber-asana comment create "Shipped!" --task <gid>
```

Run `cyber-asana` with no arguments to see the authenticated user and version instead of
help text. Every resource group's `--help` ends with worked examples.

## Command reference

| Resource | Actions |
| --- | --- |
| [Tasks](/cyber-asana/cli/tasks/) | `list`, `get`, `get-many`, `create`, `update`, `delete`, `search`, `my-tasks`, `subtask`, `project`, `follower`, `dependency`, `dependent` |
| [Projects](/cyber-asana/cli/projects/) | `list`, `get`, `counts`, `search`, `create`, `update`, `delete`, `export` |
| [Sections](/cyber-asana/cli/sections/) | `list`, `get`, `create`, `update`, `delete` |
| [Comments](/cyber-asana/cli/comments/) | `list`, `get`, `create`, `update`, `delete` (as `story` or `comment`) |
| [Tags](/cyber-asana/cli/tags/) | `list`, `get`, `create`, `update`, `delete`, `tasks`, `task list/add/remove` |
| [Goals](/cyber-asana/cli/goals/) | `list`, `get`, `create`, `update`, `delete` |
| [Portfolios](/cyber-asana/cli/portfolios/) | `list`, `items`, `get`, `create`, `update`, `delete` |
| [Status updates](/cyber-asana/cli/status-updates/) | `list`, `get`, `create`, `delete` |
| [Attachments](/cyber-asana/cli/attachments/) | `list`, `get`, `create`, `delete` |
| [Events](/cyber-asana/cli/events/) | `list` (change feed; sync-token cursored, not paginated) |
| [People & places](/cyber-asana/cli/people/) | `user list/get/me`, `team list/get`, `workspace list/get` |
| [Custom fields](/cyber-asana/cli/custom-fields/) | `list`, `get` (find the GIDs task writes are keyed by) |
| [Authentication](/cyber-asana/cli/auth/) | `auth status`, `auth login`, `auth token`, `auth logout` |
| [Repo config](/cyber-asana/cli/repo-config/) | `config show/list/path/resolve-project/add/remove/sync` |
| [Memberships](/cyber-asana/cli/memberships/) | `list`, `get`, `create`, `update`, `delete` |
| [Out of office](/cyber-asana/cli/ooo/) | `list`, `get`, `create`, `update`, `delete` |
| [Search](/cyber-asana/cli/search/) | `objects` (typeahead; turn a name into a GID) |
| [Utilities](/cyber-asana/cli/utilities/) | `url parse`, `task scan-todos`, `setup hook`, `mcp` |

## Global options

These work on every command:

| Option | Description |
| --- | --- |
| `--token <token>` | Asana PAT — overrides the `ASANA_ACCESS_TOKEN` env var |
| `--json` | Raw API JSON instead of formatted text |
| `--toon` | Token-efficient TOON instead of formatted text (recommended for agents) |
| `--full` | Show full field values instead of truncating large text |

Output is human-readable by default. `--toon` emits
[TOON](https://github.com/kunchenguid/axi#the-10-principles), a compact tabular format
that drops repeated keys for roughly 40% fewer tokens than pretty JSON.

## GID options

Commands that take a resource GID accept both a canonical `--<resource>-gid` flag and a
shorter legacy alias:

```sh
cyber-asana task list --project-gid <gid>
cyber-asana task list --project <gid>      # legacy alias
```

Workspace-scoped commands read `ASANA_WORKSPACE` when `--workspace-gid` is omitted, so
setting it once in your shell removes it from every call.

## Pagination

Every list command supports the same pagination options:

| Option | Description |
| --- | --- |
| `--limit <number>` | Results per page, 1–100 (default: 100) |
| `--offset <token>` | Offset token from a previous paginated response |
| `--opt-fields <fields>` | Comma-separated Asana fields to include |
| `--all` | Fetch all pages up to `--max-pages` |
| `--max-pages <number>` | Cap pages fetched with `--all` (default: 10) |

```sh
cyber-asana task list --project <gid> --limit 50
cyber-asana task list --project <gid> --offset <next_page.offset>
cyber-asana task list --project <gid> --all --max-pages 5
```

`--all` and `--offset` are mutually exclusive. Under `--json`, paginated responses include
`data`, `next_page`, and `limit`; in text mode a `Next offset` hint prints when another
page is available.

Each list command requests a small default field set — task lists ask for only
`gid,name,completed,due_on` — so responses stay cheap. Pass `--opt-fields` to widen.

`get` commands (and `user me`) take `--opt-fields` as well, to ask for fields Asana leaves
out of a single-resource read. Without it, a `get` returns the same fields as before.
`membership get` is the exception, because Asana's endpoint takes no `opt_fields`.

```sh
cyber-asana section get <gid> --opt-fields name,project.name,created_at
```

## Output conventions

- **Definitive empty states** — an empty result names what was empty (`0 tasks found`),
  never a blank line.
- **Content truncation** — large text (task notes, project notes, status update and
  comment bodies) is truncated with a size hint; pass `--full` for the complete value.
- **Aggregates & next steps** — list commands print a count summary and follow-up command
  suggestions in text mode, suppressed under `--toon`/`--json`.
- **Non-interactive mutations** — no prompts, so everything is safe to script.
- **Idempotent deletes** — deleting something already gone succeeds and reports
  `already_absent: true` instead of failing with a 404.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Generic error |
| `2` | Usage error (bad flag or subcommand) |
| `3` | Auth or config error |
| `4` | Forbidden |
| `5` | Not found |
| `6` | Rate limited |

Under `--json`/`--toon`, errors are structured objects. An unknown flag reports the flags
that command actually accepts, plus a `--help` pointer, and exits `2`.
