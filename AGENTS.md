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
- An agent plugin — the package root *is* the plugin root, so the tarball ships `plugin.json`, `mcp.json`, `skills/`, and the per-vendor manifests

### Plugin layout

Everything the plugin needs lives in `packages/cyber-asana/` and must stay listed in that package's `files`, or it will not reach consumers.

| Path | Read by |
| --- | --- |
| `plugin.json` / `mcp.json` | [Agent Plugins 1.0.0](https://github.com/agentplugins/agent-plugins-spec) clients. Manifest schema is **closed** — components come from fixed locations, never inline fields |
| `.claude-plugin/plugin.json` / `.mcp.json` | Claude Code |
| `.cursor-plugin/plugin.json` | Cursor |
| `.codex-plugin/plugin.json` | Codex |
| `.plugin/plugin.json` | Canonical universal-plugin source; not published |
| `skills/<name>/SKILL.md` | All of them (fixed location) |

`.claude-plugin/marketplace.json` at the **repo root** lists the plugin with an `npm` source. Version bumps flow from `packages/cyber-asana/package.json` through `scripts/sync-plugin-version.mjs` on `pnpm version` — add any new manifest to that script's list.

Only `${PLUGIN_ROOT}` and `${PLUGIN_DATA}` expand in `mcp.json`; never put a `"${SOME_VAR}"` value in its `env`, as it arrives literally and shadows the real variable.

Claude Code's `.mcp.json` does expand `${VAR}`, but forwards the literal text when the variable is unset. `envValue` in `src/env.ts` is the guard: a value that is exactly an unexpanded reference counts as absent, so the fallback alias still applies and a missing credential reports itself as missing. Keep that guard rather than working around it per manifest — it is the only thing covering configs this repo does not author.

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
ASANA_SYSTEM_TEST=1 ASANA_ACCESS_TOKEN=<pat> pnpm test:system
```

Optional env vars for specific suites:

| Variable | Used by |
| --- | --- |
| `ASANA_WORKSPACE_GID` | workspace-scoped list pagination; `improve-description` HTML-subset probe |
| `ASANA_SYSTEM_TEST_PROJECT_GID` | sections and tasks list pagination system tests |
| `ASANA_SYSTEM_TEST_TASK_GID` | tasks batch lookup; attachments and stories list pagination |
| `ASANA_SYSTEM_TEST_SECOND_TASK_GID` | tasks batch lookup (multi-GID order) |

Shared acceptance helpers: `src/testing/list-pagination.acceptance.ts`, `src/testing/paginating-gateway.ts`, `src/testing/system.ts`.

## Key Conventions

- **Authentication**: `ASANA_ACCESS_TOKEN` env var (personal access token); override per-invocation with `--token <pat>`
- **Workspace**: `ASANA_WORKSPACE_GID` env var for workspace GID; override with `--workspace <gid>`
- **Asana SDK**: `asana` npm package v3.x — API methods return `{ data: ... }`; always unwrap to `res.data`
- **No duplication**: CLI and MCP both call `api.ts`; never inline Asana SDK calls in cli.ts or mcp.ts
- **Workspace GID in requests**: pass as a plain string (`workspace: workspaceGid`), not as an object (`workspace: { gid: ... }`)

### Agent-friendly output

The CLI and MCP follow the [10 agent-CLI principles](https://github.com/kunchenguid/axi#the-10-principles). Keep new commands consistent:

- **Structured output** goes through `src/output.ts` (`output(data, readable)`); `--toon` (TOON, `src/toon.ts`) and `--json` are handled there — never branch on `process.argv` for format in a command.
- **Empty states**: use `printEmpty(entity)` / `printTable(items, cols, { entity })` so an empty result names what was empty (`0 tasks found`), never `(none)` or a blank line.
- **Truncation**: wrap large free-text fields with `truncate(value, { full: isFull() })` from `src/truncate.ts`.
- **Aggregates & next steps**: use `printCountSummary()` / `printSummary()` and `printNextSteps()` (text-mode only) from `src/output.ts`.
- **Minimal default schemas**: list commands set a small default `optFields` (3–4 fields) when the user gives none.
- **Errors & exit codes**: the top-level CLI catch uses `renderCliError` / `exitCodeFor` from `src/cli-error.ts`; throw structured Asana/Error objects, never call `process.exit` inside a command. Commander usage errors (unknown flag or subcommand) are handled by `src/cli-usage.ts` and exit `2`.
- **Mutations**: acknowledgements go through `output(payload, readable)` so `--json`/`--toon` are honored; deletes go through `deleteIdempotently()` from `src/idempotent-delete.ts`.
- **MCP**: tools serialize JSON; TOON is applied centrally by `withMcpOutputFormat` (env `CYBER_ASANA_MCP_FORMAT=toon`). Do not re-implement formatting per tool.

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
- List tools spread `paginationParams` from `src/mcp-options.ts` (see **Pagination** above)

Reference (load on demand, not duplicated here):

- Tool catalog by resource → `readme.md` MCP section
- Per-tool params and Zod schemas → `src/<domain>/mcp.ts` for the domain you are editing
- Task creation → [`packages/cyber-asana/skills/create-asana-task/SKILL.md`](packages/cyber-asana/skills/create-asana-task/SKILL.md); URL parsing → [`src/url.ts`](src/url.ts) when a URL is present; repo project registry → [`src/repo-config.ts`](src/repo-config.ts) / `.agents/cyber-asana.json`
- Adding or updating tools → `update-asana-sdk` skill

#### Dual MCP (official + cyber-asana)

Both servers can run together with separate config keys and credentials. Tool names do not collide. Routing guidance lives in [readme — Using alongside official Asana MCP](readme.md#using-alongside-official-asana-mcp).

## Environment

```
ASANA_ACCESS_TOKEN=<personal access token>
ASANA_WORKSPACE_GID=<workspace GID>   # optional; avoids --workspace on every command
```

`ASANA_TOKEN` and `ASANA_WORKSPACE` still resolve as deprecated fallbacks (see
`src/env.ts`), but new code and docs should use the names above.

System tests (see **Testing** above):

```
ASANA_SYSTEM_TEST=1                    # enable *.system.ts suites
ASANA_WORKSPACE_GID=...                # workspace-scoped list pagination
ASANA_SYSTEM_TEST_PROJECT_GID=...      # sections/tasks list pagination
ASANA_SYSTEM_TEST_TASK_GID=...         # batch lookup, attachments/stories lists
ASANA_SYSTEM_TEST_SECOND_TASK_GID=...  # tasks batch lookup (multi-GID)
```
