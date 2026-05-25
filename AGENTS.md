# AGENTS.md

This file provides guidance to AI coding assistants when working with code in this repository.

## Development Workflow

Before writing any production code, invoke the `test-driven-development` skill. This applies whether coding starts from a user request or from your own initiative after plan approval.

## Commit Discipline

Commit every self-contained unit of work — code, docs, config, skills — as its own commit before moving on.

A **unit of work** is one coherent, independently revertable change: one domain's refactor, one feature, one bugfix, one test suite expansion for one concern, one config change. A TDD red-green-refactor cycle alone is not a commit boundary — commit when the full intended change is complete and tests pass.

```bash
git add <files>     # stage only files belonging to this unit of work
git diff --cached   # verify staged changes before committing
git commit -m "<type>: <what changed>"
```

- Conventional commit prefix: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- Message describes the behavior or change, not the implementation
- Never use `git add .` or `git add -A` — these stage everything indiscriminately
- Never batch unrelated changes into one commit
- Never commit with red tests
- If the working tree contains unrelated changes (different domain, different concern), leave them unstaged and commit the current unit first

## Skill Augmentations

When reading any `SKILL.md` file, always check whether a `SKILL.local.md` exists in the same directory. If it does, treat its contents as additional instructions that extend the base skill. Local augmentations take precedence over the base skill where they conflict.

## What This Repo Is

`cyber-asana` — an npm package that wraps the Asana API as:
- A CLI (`cyber-asana <resource> <action>`) powered by Commander
- A local MCP server (`node dist/mcp.js`) powered by `@modelcontextprotocol/sdk`

## Commands

```
pnpm build        # tsc → dist/
pnpm typecheck    # tsc --noEmit
pnpm lint         # biome check
pnpm check        # biome check --write (auto-fix)
pnpm format       # biome format --write
pnpm test         # vitest run (unit + acceptance; excludes *.system.ts)
pnpm test:system  # vitest run against live Asana API (requires env below)
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

Each domain folder contains `gateway.ts` (port + Asana adapter), `api.ts` (factory + defaults), `cli.ts`, and `mcp.ts`. Shared runtime wiring lives in `src/composition.ts`.

### Testing

- **Unit tests**: `*.test.ts` beside the module under test.
- **Acceptance specs**: `*.acceptance.ts` export `define*AcceptanceSpecs()` factories; `*.acceptance.test.ts` runs them against gateway doubles (no SDK).
- **System tests**: `*.system.ts` reuse the same acceptance factories against `createRuntimeContext()` and the live API. Gated by env vars; skipped when unset.

Run system tests:

```sh
ASANA_SYSTEM_TEST=1 ASANA_TOKEN=<pat> pnpm test:system
```

Optional env vars for specific suites:

| Variable | Used by |
| --- | --- |
| `ASANA_SYSTEM_TEST_TASK_GID` | tasks batch lookup |
| `ASANA_SYSTEM_TEST_SECOND_TASK_GID` | tasks batch lookup (multi-GID order) |

Helpers: `src/testing/system.ts` (`isSystemTestEnabled`, `systemEnv`, `requireSystemEnv`).

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

### GID Options

Use helpers from `src/cli-options.ts` for all resource GID parameters:
- `addGidOption(cmd, 'project', 'Project GID')` — adds both `--project-gid` and `--project` alias; optionally pass `{ env: 'ASANA_WORKSPACE' }` to bind an env var
- `requiredGid(opts, 'project', 'Project GID')` — reads `projectGid ?? project`, throws if missing
- `normalizedGid(opts, 'project')` — reads `projectGid ?? project`, returns undefined if absent
- `addPaginationOptions(cmd)` — adds `--limit`, `--offset`, `--opt-fields`, `--all`, `--max-pages`
- `paginationOptionsFromCli(opts)` — maps camelCase CLI opts to `PaginationOptions`
- `itemsForOutput(result)` — extracts the `data` array from a paginated or plain result
- `printNextPageHint(result)` — prints `Next offset: ...` when another page exists

### Pagination

All list endpoints in `api.ts` accept `PaginationOptions` from `src/pagination.ts`:

```ts
type PaginationOptions = {
  limit?: number       // default 100
  offset?: string      // cursor from previous next_page
  optFields?: string   // comma-separated Asana fields
  fetchAll?: boolean   // auto-follow pages up to maxPages
  maxPages?: number    // default 10
}
```

Use `toAsanaPaginationOptions(opts)` to convert to SDK params, and `collectListResponse(res, opts)` to return a `PaginatedResult`. Response shape: `{ data, next_page, limit, page_count?, truncated? }`.

MCP list tools use `paginationParams` / `paginationOptions(params)` from `src/mcp-options.ts`.

### MCP Tools

- Naming: `asana_<resource>_<action>` (e.g. `asana_project_create`)
- Schemas: use Zod (`z.string()`, `z.string().optional()`) for all parameters
- Return: `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`

## Environment

```
ASANA_TOKEN=<personal access token>
ASANA_WORKSPACE=<workspace GID>   # optional; avoids --workspace on every command
```

System tests (see **Testing** above):

```
ASANA_SYSTEM_TEST=1               # enable *.system.ts suites
ASANA_SYSTEM_TEST_TASK_GID=...    # optional; tasks batch lookup
ASANA_SYSTEM_TEST_SECOND_TASK_GID=...  # optional; tasks batch lookup
```
