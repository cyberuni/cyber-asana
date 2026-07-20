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

## By concept

<!-- BEGIN generated: by-concept -->
<!-- END generated: by-concept -->
