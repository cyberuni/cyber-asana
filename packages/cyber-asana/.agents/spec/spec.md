---
status: draft
project-path: packages/cyber-asana
name: cyber-asana
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
- A term → `glossary.md`.

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

<!-- BEGIN generated: by-concept (project-spec/concept-index) -->

## By concept

> Generated from `concept:` frontmatter by `project-spec/concept-index` — do not edit by hand.

| Concept | Facets |
|---|---|
| `attachments` | `attachments/` (behavior) |
| `axi` | `axi/` (reference) |
| `batch-lookup` | `tasks/` (behavior) |
| `comments` | `stories/` (behavior) |
| `config` | `config/` (behavior) |
| `cyber-asana` | `attachments/` (behavior) · `axi/` (reference) · `config/` (behavior) · `goals/` (behavior) · `portfolios/` (behavior) · `projects/` (behavior) · `sections/` (behavior) · `status/` (behavior) · `stories/` (behavior) · `tags/` (behavior) · `tasks/` (behavior) · `teams/` (behavior) · `url/` (behavior) · `users/` (behavior) · `workspaces/` (behavior) |
| `dependencies` | `tasks/` (behavior) |
| `directory` | `users/` (behavior) |
| `discovery` | `workspaces/` (behavior) |
| `environment` | `config/` (behavior) |
| `files` | `attachments/` (behavior) |
| `goals` | `goals/` (behavior) |
| `identity` | `users/` (behavior) |
| `labels` | `tags/` (behavior) |
| `my-tasks` | `tasks/` (behavior) |
| `objectives` | `goals/` (behavior) |
| `offline` | `url/` (behavior) |
| `output-contract` | `axi/` (reference) |
| `parsing` | `url/` (behavior) |
| `portfolio-write` | `portfolios/` (behavior) |
| `portfolios` | `portfolios/` (behavior) |
| `precedence` | `config/` (behavior) |
| `progress-reporting` | `status/` (behavior) |
| `project-export` | `projects/` (behavior) |
| `project-lifecycle` | `projects/` (behavior) |
| `project-scoped-read` | `sections/` (behavior) |
| `project-scoped-write` | `sections/` (behavior) |
| `projects` | `projects/` (behavior) |
| `repo-registry` | `config/` (behavior) |
| `rich-text` | `stories/` (behavior) |
| `search` | `tasks/` (behavior) |
| `sections` | `sections/` (behavior) |
| `status` | `status/` (behavior) |
| `status-updates` | `status/` (behavior) |
| `stories` | `stories/` (behavior) |
| `subtasks` | `tasks/` (behavior) |
| `tags` | `tags/` (behavior) |
| `task-association` | `tags/` (behavior) |
| `tasks` | `tasks/` (behavior) |
| `teams` | `teams/` (behavior) |
| `templates` | `stories/` (behavior) |
| `todo-scan` | `tasks/` (behavior) |
| `url` | `url/` (behavior) |
| `users` | `users/` (behavior) |
| `workspace-scoped-crud` | `goals/` (behavior) |
| `workspace-scoped-read` | `portfolios/` (behavior) · `projects/` (behavior) · `teams/` (behavior) |
| `workspaces` | `workspaces/` (behavior) |

<!-- END generated: by-concept -->
