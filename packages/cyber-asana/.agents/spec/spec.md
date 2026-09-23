---
status: approved
project-path: packages/cyber-asana
name: cyber-asana
approval:
  spec:
    verdict: approve
    by: unional
---

# cyber-asana

Asana CLI and MCP server for AI agents. Wraps the Asana API as a CLI (`cyber-asana <resource> <action>`, via Commander) and a local MCP server (`@modelcontextprotocol/sdk`), sharing one set of gateway/api operations between both surfaces.

## Placement map

Strategy: **capability-first**, following the existing Screaming Architecture (`src/<domain>/{gateway,api,cli,mcp}.ts`) 1:1.

- New Asana-resource CRUD/list surface → its domain folder (or a new one if the SDK adds a resource — see `update-asana-sdk` skill).
- CLI/MCP output, error, pagination, or truncation contract → `axi/`.
- Asana URL parsing → `url/`.
- Repo-local project registry, env-var config resolution (`ASANA_TOKEN`/`ASANA_WORKSPACE`) → `config/`.
- A rule, wiring pattern, or composition-root concern → `design/` (descriptive prose, not a node).
- A decision + rationale → `design/decisions/`.
- A flow spanning ≥2 domains (e.g. attach a file then post a status update) → `workflows/`, never a capability folder.
- Build/CI/release/packaging concerns (turbo, changesets, biome, GH Actions) → `tooling/`.
- A new shipped agent skill (a directory under `packages/cyber-asana/skills/`) → `skills/<skill-name>/`,
  as a **reference** node naming its artifact, its trigger, and the domains it composes.
- A structural rule every skill must satisfy (front block, description budget, references, version
  pinning, listing, packaging reach) → `skills/`, which owns the cross-skill catalog contract and
  its suite.
- A term → `glossary.md`.

### Routing table — tie-breaks

Rows recorded because the strategy above does not settle them on its own. A node placed by a row
here is correctly placed even where the strategy would derive a different home.

| Contested concern | Home | Why |
|---|---|---|
| whether the skill catalog **reaches** the consumer — the `files` allowlist entry, the plugin manifests' `skills` pointer | `skills/` | reads as packaging, so `tooling/` would claim it; but it is the catalog's own reach, and `tooling/` is descriptive with no suite, so placing it there would leave the edge unfrozen |
| whether an agent **engages** a skill, follows its steps, or produces a good result | **outside this corpus** | agent behavior is settled by running a model against a rubric, not by reading the repository — it belongs to the ACED evaluation suites, and freezing it here would claim a contract this spec cannot verify |
| a skill's underlying Asana operation (create a task, search projects, post a comment) | the resource domain folder | a skill composes domains; it never re-freezes them |

## Capabilities

- [attachments](attachments/README.md)
- [goals](goals/README.md)
- [portfolios](portfolios/README.md)
- [projects](projects/README.md)
- [sections](sections/README.md)
- [status](status/README.md)
- [stories](stories/README.md)
- [tags](tags/README.md)
- [tasks](tasks/README.md)
- [teams](teams/README.md)
- [users](users/README.md)
- [workspaces](workspaces/README.md)
- [url](url/README.md)
- [config](config/README.md)
- [axi](axi/README.md)
- [skills](skills/README.md)

### Shipped skills

Each is a reference node under the [skills](skills/README.md) capability, which owns the contract
they all satisfy.

- [init-asana](skills/init-asana/README.md)
- [manage-asana-registry](skills/manage-asana-registry/README.md)
- [create-asana-task](skills/create-asana-task/README.md)
- [improve-description](skills/improve-description/README.md)
- [asana-standup](skills/asana-standup/README.md)
- [asana-sprint-report](skills/asana-sprint-report/README.md)
- [sync-asana-project](skills/sync-asana-project/README.md)
- [create-tasks-from-code](skills/create-tasks-from-code/README.md)
- [link-pr-to-task](skills/link-pr-to-task/README.md)

<!-- BEGIN generated: by-concept (project-spec/concept-index) -->

## By concept

> Generated from `concept:` frontmatter by `project-spec/concept-index` — do not edit by hand.

| Concept | Facets |
|---|---|
| `agent-configuration` | `skills/` (behavior) |
| `attachments` | `attachments/` (behavior) |
| `axi` | `axi/` (reference) |
| `batch-lookup` | `tasks/` (behavior) |
| `catalog` | `skills/` (behavior) |
| `comments` | `skills/link-pr-to-task/` (reference) · `stories/` (behavior) |
| `config` | `config/` (behavior) |
| `cyber-asana` | `attachments/` (behavior) · `axi/` (reference) · `config/` (behavior) · `goals/` (behavior) · `portfolios/` (behavior) · `projects/` (behavior) · `sections/` (behavior) · `skills/` (behavior) · `skills/asana-sprint-report/` (reference) · `skills/asana-standup/` (reference) · `skills/create-asana-task/` (reference) · `skills/create-tasks-from-code/` (reference) · `skills/improve-description/` (reference) · `skills/init-asana/` (reference) · `skills/link-pr-to-task/` (reference) · `skills/manage-asana-registry/` (reference) · `skills/sync-asana-project/` (reference) · `status/` (behavior) · `stories/` (behavior) · `tags/` (behavior) · `tasks/` (behavior) · `teams/` (behavior) · `url/` (behavior) · `users/` (behavior) · `workspaces/` (behavior) |
| `dependencies` | `tasks/` (behavior) |
| `directory` | `users/` (behavior) |
| `discovery` | `workspaces/` (behavior) |
| `environment` | `config/` (behavior) · `skills/init-asana/` (reference) |
| `files` | `attachments/` (behavior) |
| `goals` | `goals/` (behavior) |
| `identity` | `users/` (behavior) |
| `labels` | `tags/` (behavior) |
| `my-tasks` | `tasks/` (behavior) |
| `objectives` | `goals/` (behavior) |
| `offline` | `skills/sync-asana-project/` (reference) · `url/` (behavior) |
| `output-contract` | `axi/` (reference) |
| `packaging` | `skills/` (behavior) |
| `parsing` | `url/` (behavior) |
| `portfolio-write` | `portfolios/` (behavior) |
| `portfolios` | `portfolios/` (behavior) |
| `precedence` | `config/` (behavior) |
| `progress-reporting` | `status/` (behavior) |
| `project-export` | `projects/` (behavior) · `skills/sync-asana-project/` (reference) |
| `project-lifecycle` | `projects/` (behavior) |
| `project-scoped-read` | `sections/` (behavior) |
| `project-scoped-write` | `sections/` (behavior) |
| `projects` | `projects/` (behavior) |
| `repo-registry` | `config/` (behavior) · `skills/manage-asana-registry/` (reference) |
| `reporting` | `skills/asana-sprint-report/` (reference) · `skills/asana-standup/` (reference) |
| `resolution` | `skills/create-asana-task/` (reference) |
| `rich-text` | `skills/improve-description/` (reference) · `stories/` (behavior) |
| `search` | `tasks/` (behavior) |
| `sections` | `sections/` (behavior) |
| `setup` | `skills/init-asana/` (reference) · `skills/manage-asana-registry/` (reference) |
| `skills` | `skills/` (behavior) · `skills/asana-sprint-report/` (reference) · `skills/asana-standup/` (reference) · `skills/create-asana-task/` (reference) · `skills/create-tasks-from-code/` (reference) · `skills/improve-description/` (reference) · `skills/init-asana/` (reference) · `skills/link-pr-to-task/` (reference) · `skills/manage-asana-registry/` (reference) · `skills/sync-asana-project/` (reference) |
| `status` | `status/` (behavior) |
| `status-updates` | `status/` (behavior) |
| `stories` | `stories/` (behavior) |
| `subtasks` | `tasks/` (behavior) |
| `tags` | `tags/` (behavior) |
| `task-association` | `skills/link-pr-to-task/` (reference) · `tags/` (behavior) |
| `tasks` | `skills/create-asana-task/` (reference) · `skills/create-tasks-from-code/` (reference) · `skills/improve-description/` (reference) · `tasks/` (behavior) |
| `teams` | `teams/` (behavior) |
| `templates` | `stories/` (behavior) |
| `todo-scan` | `skills/create-tasks-from-code/` (reference) · `tasks/` (behavior) |
| `url` | `url/` (behavior) |
| `users` | `users/` (behavior) |
| `workspace-scoped-crud` | `goals/` (behavior) |
| `workspace-scoped-read` | `portfolios/` (behavior) · `projects/` (behavior) · `teams/` (behavior) |
| `workspaces` | `workspaces/` (behavior) |

<!-- END generated: by-concept -->
