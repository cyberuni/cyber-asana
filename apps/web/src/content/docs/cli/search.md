---
title: Search
description: Turn a name into a GID with Asana's typeahead endpoint.
sidebar:
  order: 15
---

Every other cyber-asana command takes a GID. `search objects` is how you get one when all
you have is a name.

```sh
cyber-asana search objects project "website"
cyber-asana search objects user "ada" --count 5
cyber-asana search objects task --workspace-gid <gid> --toon
```

| Command | Arguments | Options |
| --- | --- | --- |
| `objects` | `<resource-type>` `[query]` | `--workspace-gid <gid>` / `--workspace <gid>`, `--count <number>`, `--opt-fields <fields>` |

`objects` falls back to `ASANA_WORKSPACE_GID` when `--workspace-gid` is omitted.

## Resource types

Asana accepts exactly **one** type per call — searching several at once is not supported:

`actor`, `agent`, `custom_field`, `goal`, `portfolio`, `project`, `project_template`,
`tag`, `task`, `team`, `user`

`actor` returns users and agents together; `agent` returns only Asana's first-party AI
teammates.

Omitting `[query]` still returns results — the top of the ordering for that type, which is
a cheap way to see the projects or people most relevant to your token.

## This is autocomplete, not search

The typeahead endpoint returns a **single page** capped by `--count` (1–100, default 20),
ordered by relevance and recency. Asana's own documentation says not to rely on it for
accurate search results, and the result set is explicitly **not exhaustive**.

There is no pagination, so the [shared pagination options](/cyber-asana/cli/#pagination)
— `--all`, `--offset`, `--limit` — do not apply here. Widen the single page with `--count`
instead.

Ordering by type: `user` is most-contacted first, `project` is most-recently-touched
first, `task` prioritises tasks you follow, and `project_template` prioritises favourites.

When you need exhaustive, filterable results, use
[`task search`](/cyber-asana/cli/tasks/#search) or
[`project search`](/cyber-asana/cli/projects/#search) instead — those hit Asana's real
search endpoints.

## Output

Results print as a Name / ID / Type table with a count summary, and `0 <type> results
found` when nothing matches. `--toon` and `--json` return the raw array of compact
objects. The default field set is `gid,name,resource_type`; widen it with `--opt-fields`.
