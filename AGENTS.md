# AGENTS.md

This file provides guidance to AI coding assistants when working with code in this repository.

## Skill Augmentations

When reading any `SKILL.md` file, always check whether a `SKILL.local.md` exists in the same directory. If it does, treat its contents as additional instructions that extend the base skill. Local augmentations take precedence over the base skill where they conflict.

## Commit Discipline

**Auto-commit rule:** When a unit of work is complete and verified, commit it immediately — do not wait for the user to ask. Batching multiple units into one commit, or finishing all work before committing, are both violations of this rule.

**Unit of work:** one coherent, independently revertable change — one domain's refactor, one feature, one bugfix, one test suite expansion for one concern, one config change. Never two unrelated concerns in the same commit. A TDD red-green-refactor cycle alone is not a commit boundary; commit when the full intended change is complete and tests pass. If the working tree has unrelated changes, leave them unstaged — commit the current unit first, then continue.

- Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- One concern per commit; never batch unrelated changes
- Stage only files for this unit: `git add <files>`, then verify with `git diff --cached`
- Never use `git add .`, `git add -A`, or `git add -p` (interactive commands agents cannot run)
- Never commit with red tests; run validation commands first

### References

- **`commit-work` skill** — staging, splitting, and message writing when committing
- `npx cyber-skills@<version> governance show skill-repo-structure` — discipline section format rules

## Development Workflow

Before writing any production code, invoke the `test-driven-development` skill. This applies whether coding starts from a user request or from your own initiative after plan approval.

## What This Repo Is

`cyber-asana` — an npm package that wraps the Asana API as:
- A CLI (`cyber-asana <resource> <action>`) powered by Commander
- A local MCP server powered by `@modelcontextprotocol/sdk` — see [CONTRIBUTING.md](CONTRIBUTING.md) for in-repo setup

## Commands

```
pnpm test src/client.test.ts  # run one test file
pnpm test                     # unit + acceptance tests
pnpm test:system              # live API tests when env vars are set
pnpm verify                   # typecheck + lint + test + build
pnpm build                    # compile to dist/
pnpm dev <resource> <action>  # run CLI from source
```

## Architecture: Screaming Architecture

The codebase is organized by Asana resource domain rather than by technical layer. Each domain keeps its gateway, API facade, CLI bindings, and MCP registrations together so CLI commands and MCP tools share the same core operations instead of duplicating Asana SDK calls.

Shared wiring lives in `src/composition.ts`, while common concerns such as client creation, pagination, option normalization, and output formatting stay in top-level support modules. Tests mirror the architecture: unit tests sit beside modules, acceptance specs exercise gateway contracts against doubles, and system tests reuse those specs against the live API.

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
| `ASANA_WORKSPACE` | workspace-scoped list pagination system tests |
| `ASANA_SYSTEM_TEST_PROJECT_GID` | sections and tasks list pagination system tests |
| `ASANA_SYSTEM_TEST_TASK_GID` | tasks batch lookup; attachments and stories list pagination |
| `ASANA_SYSTEM_TEST_SECOND_TASK_GID` | tasks batch lookup (multi-GID order) |

Shared acceptance helpers: `src/testing/list-pagination.acceptance.ts`, `src/testing/paginating-gateway.ts`, `src/testing/system.ts`.

## Key Conventions

- **Authentication**: `ASANA_TOKEN` env var (personal access token); override per-invocation with `--token <pat>`
- **Workspace**: `ASANA_WORKSPACE` env var for workspace GID; override with `--workspace <gid>`
- **Asana SDK**: `asana` npm package v3.x — API methods return `{ data: ... }`; always unwrap to `res.data`
- **No duplication**: CLI and MCP both call `api.ts`; never inline Asana SDK calls in cli.ts or mcp.ts
- **Workspace GID in requests**: pass as a plain string (`workspace: workspaceGid`), not as an object (`workspace: { gid: ... }`)

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
- Registrations live in each domain's `mcp.ts`; wired via `registerMcpTools` in `src/composition.ts`
- List tools spread `paginationParams` from `src/mcp-options.ts` (see **Pagination** above); `asana_user_list` uses `paginationParamsWithoutLimit` (no `limit`)

Reference (load on demand, not duplicated here):

- Tool catalog by resource → `readme.md` MCP section
- Per-tool params and Zod schemas → `src/<domain>/mcp.ts` for the domain you are editing
- Task creation → [`skills/create-asana-task/SKILL.md`](skills/create-asana-task/SKILL.md); URL parsing → [`src/url.ts`](src/url.ts) when a URL is present; repo project registry → [`src/repo-config.ts`](src/repo-config.ts) / `.agents/cyber-asana.json`
- Adding or updating tools → `update-asana-sdk` skill

## Environment

```
ASANA_TOKEN=<personal access token>
ASANA_WORKSPACE=<workspace GID>   # optional; avoids --workspace on every command
```

System tests (see **Testing** above):

```
ASANA_SYSTEM_TEST=1                    # enable *.system.ts suites
ASANA_WORKSPACE=...                    # workspace-scoped list pagination
ASANA_SYSTEM_TEST_PROJECT_GID=...      # sections/tasks list pagination
ASANA_SYSTEM_TEST_TASK_GID=...         # batch lookup, attachments/stories lists
ASANA_SYSTEM_TEST_SECOND_TASK_GID=...  # tasks batch lookup (multi-GID)
```
