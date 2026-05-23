# AGENTS.md

This file provides guidance to AI coding assistants when working with code in this repository.

## What This Repo Is

`asana-agent` — an npm package that wraps the Asana API as:
- A CLI (`cyber-asana <resource> <action>`) powered by Commander
- A local MCP server (`node dist/mcp.js`) powered by `@modelcontextprotocol/sdk`

## Architecture: Screaming Architecture

The source is organized by Asana domain resource, not by technical layer:

```
src/
├── client.ts              # Shared Asana API client factory
├── cli.ts                 # CLI entry point (cyber-asana bin)
├── mcp.ts                 # MCP server entry point
├── index.ts               # Library re-exports
├── workspaces/            # Workspace domain
│   ├── api.ts             #   Asana SDK wrappers
│   ├── cli.ts             #   Commander command factory
│   └── mcp.ts             #   MCP tool registrations
├── projects/              # Project domain (same pattern)
├── tasks/
├── sections/
├── users/
├── teams/
├── portfolios/
├── goals/
├── tags/
├── attachments/
└── stories/
```

Each domain folder contains exactly three files: `api.ts`, `cli.ts`, `mcp.ts`.

## Key Conventions

- **Authentication**: `ASANA_TOKEN` environment variable (personal access token)
- **CLI output**: Always JSON (`console.log(JSON.stringify(result, null, 2))`)
- **MCP tool naming**: `asana_<resource>_<action>` (e.g. `asana_project_create`)
- **Asana SDK**: `asana` npm package v3.x — API methods return `{ data: ... }`
- **No duplication**: CLI and MCP both call `api.ts`; never inline Asana SDK calls

## Commands

```
pnpm build        # tsc → dist/
pnpm typecheck    # tsc --noEmit
pnpm lint         # biome check
pnpm check        # biome check --write (auto-fix)
pnpm test         # vitest run
pnpm test:watch   # vitest
pnpm cs           # changeset (add changeset for release)
```

## Environment

```
ASANA_TOKEN=<personal access token>
```
