# AGENTS.md

This file provides guidance to AI coding assistants when working with code in this repository.

## What This Repo Is

`asana-agent` — an npm package that wraps the Asana API as:
- A CLI (`cyber-asana <resource> <action>`) powered by Commander
- A local MCP server (`node dist/mcp.js`) powered by `@modelcontextprotocol/sdk`

## Commands

```
pnpm build        # tsc → dist/
pnpm typecheck    # tsc --noEmit
pnpm lint         # biome check
pnpm check        # biome check --write (auto-fix)
pnpm format       # biome format --write
pnpm test         # vitest run
pnpm test:watch   # vitest
pnpm test <file>  # run a single test file, e.g. pnpm test src/client.test.ts
pnpm verify       # typecheck + lint + test + build (full CI check)
pnpm cs           # changeset (add changeset for release)
```

During development, run the CLI directly without building:

```
pnpm dev <resource> <action>   # tsx src/cli.ts <resource> <action>
```

## Architecture: Screaming Architecture

The source is organized by Asana domain resource, not by technical layer:

```
src/
├── client.ts              # Shared Asana API client factory
├── cli.ts                 # CLI entry point (cyber-asana bin)
├── mcp.ts                 # MCP server entry point
├── output.ts              # CLI output helpers (readable vs --json mode)
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

- **Authentication**: `ASANA_TOKEN` env var (personal access token); override per-invocation with `--token <pat>`
- **Workspace**: `ASANA_WORKSPACE` env var for workspace GID; override with `--workspace <gid>`
- **Asana SDK**: `asana` npm package v3.x — API methods return `{ data: ... }`; always unwrap to `res.data`
- **No duplication**: CLI and MCP both call `api.ts`; never inline Asana SDK calls in cli.ts or mcp.ts
- **Workspace GID in requests**: pass as a plain string (`workspace: workspaceGid`), not as an object (`workspace: { gid: ... }`)

### CLI Output

Default output is human-readable (key-value for single items, table for lists). Pass `--json` anywhere on the command line to get raw API JSON instead.

Use helpers from `src/output.ts`:
- `output(data, readableFn)` — switches between JSON and readable based on `--json` flag
- `printFields(record)` — aligned key-value block; skips null/undefined values
- `printTable(items, cols)` — padded table with header row

### MCP Tools

- Naming: `asana_<resource>_<action>` (e.g. `asana_project_create`)
- Schemas: use Zod (`z.string()`, `z.string().optional()`) for all parameters
- Return: `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`

## Environment

```
ASANA_TOKEN=<personal access token>
ASANA_WORKSPACE=<workspace GID>   # optional; avoids --workspace on every command
```
