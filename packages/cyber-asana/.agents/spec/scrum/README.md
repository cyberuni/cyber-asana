---
spec-type: behavioral
concept: [cyber-asana, scrum, scope, repo-registry]
---

# scrum — the scopes a scrum team works in

## What

The scrum system (design: [`docs/design/scrum-system.md`](../../../../../docs/design/scrum-system.md))
runs on a **scope**: the set of Asana projects a team works in. This node specifies the scope layer
only: how a scope is configured, listed, selected, and resolved to its projects. Sprints, reports,
and the policy reference are other units.

A scope names Asana objects by GID, so it lives in config beside the project registry, never in the
`cyber-asana.scrum` reference (which holds policy and no GIDs). A scope has a `name`, a `kind`, and
the members that kind needs, and may override exactly three policy keys: `sprint_model`,
`sprint_length_days`, and `sprint_anchor_date`.

| Kind | Members | Resolves to |
|---|---|---|
| `project` | exactly one project GID | that project |
| `projects` | one or more project GIDs | those projects; a task homed in two of them counts once |
| `portfolio` | one portfolio GID | the portfolio's projects, following nested portfolios |

The `team` kind belongs to a later unit and is rejected today.

**Key terms**

- **Scope** — a named set of projects a scrum team works in.
- **Implicit scope** — the repo's default project, standing in as a `project` scope when no scope is
  configured.
- **Sprint settings** — the effective `sprint_model`, `sprint_length_days`, and `sprint_anchor_date`
  for a scope: the policy's value with the scope's override laid over it.

## Logic

### Configuration

- Scopes live in `scrum.scopes[]` of `.agents/cyber-asana.json`. A `scrum` block needs
  `schema_version: 3`; the loader still reads 1 and 2 (read as 2), and rejects a `scrum` block under
  them. Adding a scope rewrites the file as schema 3. Removing the last scope drops the block.
- A scope name is unique ignoring case. Adding a scope with an existing name replaces it. At most one
  scope in a list is `default`, and a scope added with `default` takes the marker from the others.
- An unknown key on a scope, an unknown `kind`, a member the kind does not allow, a
  `sprint_length_days` that is not a positive integer, and a `sprint_anchor_date` that is not a real
  `YYYY-MM-DD` date are each rejected with a message naming the path.
- The global registry (`~/.config/cyber-asana/config.json`) may hold `scopes` inside a `repos[]`
  entry, with the same shape. The effective list is the repo's scopes then the global ones the repo
  does not shadow: the repo wins a name clash, and supplies the `default` when it has one. Editing a
  repo's projects in the global registry never drops its scopes.
- `config scope add | remove | list` and the `asana_scope_add | remove | list` tools go through one
  `api.ts`. `add` and `remove` write the repo config, or the global registry with `--global`;
  `remove` without it takes the scope from the repo config, else from the global registry. Removing a
  scope that is not configured succeeds with `already_absent: true` and writes nothing.
- Two field roles join `story_points` and `task_points`: `sprint` and `status`, both enum fields.
  `config discover-fields` matches a field named `Sprint` or `Iteration` to `sprint`, and `Status` or
  `Stage` to `status`, ignoring case and separators; a field of another subtype never matches.

### Selecting and resolving

- `--scope <name>` selects a scope, ignoring case. Without it the scope marked `default` is used.
  With no scope configured at all, the repo's default project acts as an implicit `project` scope.
  Once any scope is configured the default project no longer stands in.
- `scrum scope resolve` and `asana_scope_resolve` return the selected scope, whether it is implicit,
  its projects, and its sprint settings; `--tasks` also returns the scope's tasks, each once by GID.
- A `portfolio` scope reads `getItemsForPortfolio`, recurses into items that are portfolios, and
  collects items that are projects. A portfolio is read once however it is reached, so a cycle ends,
  and a project reachable twice is listed once.

### Failure statuses

Two failures are told apart by `error.code`, and both are stable:

| Code | When | Exit |
|---|---|---|
| `scope-unknown` | `--scope` names a scope that is not configured; `options` lists the ones that are | 2 |
| `scope-missing` | no `--scope`, no default scope, and no default project to stand in | 2 |

Both exit 2, the code for a command the caller can fix and retry. They are `kind: config` errors with
`code`, `options`, and `hint`, in the CLI body and in the MCP error alike.

## Scenario map

See [scrum.feature](scrum.feature).
