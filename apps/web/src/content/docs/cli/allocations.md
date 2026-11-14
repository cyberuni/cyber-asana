---
title: Allocations
description: Read and write Asana allocations, the only source of team capacity for the scrum workload report.
sidebar:
  order: 25
---

An allocation says how much of a person's time a project gets over a date range, as a
percentage of their working time or as hours. Asana's resource management holds it. The
scrum workload report reads it as capacity and nothing else.

A workspace whose plan has no resource management answers `402`. The CLI exits `7` with
`error.code` and a hint naming the plan limit, as it does for other plan-limited calls.

## Reading allocations

```sh
cyber-asana allocation list --assignee me
cyber-asana allocation list --parent <project-gid>
cyber-asana allocation list --workspace <gid> --toon
cyber-asana allocation get <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--parent <gid>` (a project), `--assignee <gid>` (`me` works), `--workspace <gid>`, [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | — |

`--workspace` falls back to `ASANA_WORKSPACE_GID`. An empty result prints `0 allocations found`.

## Writing allocations

```sh
cyber-asana allocation create --assignee <gid> --parent <project-gid> \
  --start-date 2026-01-05 --end-date 2026-01-18 --percent 50
cyber-asana allocation update <gid> --hours 20
cyber-asana allocation delete <gid>
```

| Command | Options |
| --- | --- |
| `create` | `--assignee`, `--parent`, `--start-date`, `--end-date` (all required), and `--percent <n>` or `--hours <n>` |
| `update <gid>` | any of `--start-date`, `--end-date`, `--percent`, `--hours` |
| `delete <gid>` | — |

`--percent` and `--hours` cannot be combined. Dates are ISO 8601 days (`YYYY-MM-DD`). Deleting an
allocation that is already gone succeeds and says so.

## MCP

`asana_allocation_list`, `asana_allocation_get`, `asana_allocation_create`,
`asana_allocation_update`, and `asana_allocation_delete`. Create and update take `effort_type`
(`hours` or `percent`) and `effort_value`.
