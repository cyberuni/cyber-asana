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
- A local MCP server powered by `@modelcontextprotocol/sdk` (`cyber-asana mcp`) — opt-in, never started by the plugin; see [CONTRIBUTING.md](CONTRIBUTING.md) for in-repo setup
- An agent plugin — the package root *is* the plugin root, so the tarball ships `plugin.json`, `skills/`, and the per-vendor manifests

### Plugin layout

Everything the plugin needs lives in `packages/cyber-asana/` and must stay listed in that package's `files`, or it will not reach consumers.

Root `plugin.json` is the **only** manifest anyone authors. Every vendor's form is derived from it by [universal-plugin](https://github.com/cyberuni/universal-plugin) (`pnpm plugin:build`); never hand-edit a derived file — the next build overwrites it.

| Path | Read by | Authored? |
| --- | --- | --- |
| `plugin.json` | [Agent Plugins 1.0.0](https://github.com/agentplugins/agent-plugins-spec) clients and Copilot CLI. Top level is the spec's **closed** field set; component paths and per-vendor fields live under `extensions["org.cyberuni.universal-plugin"]` (`skills`, `commands`, `vendors`, `harnesses.<vendor>`) | yes — the canonical manifest |
| `.claude-plugin/plugin.json` | Claude Code | derived |
| `.cursor-plugin/plugin.json` | Cursor | derived |
| `.codex-plugin/plugin.json` | Codex | derived |
| `com.github.copilot/commands/` | Copilot CLI, which reads native components only from here once `plugin.json` declares the spec `$schema` | derived (copied from `commands/`) |
| `skills/<name>/SKILL.md`, `commands/<name>.md` | All of them | yes |

There is no `.plugin/plugin.json`: it would outrank root in Copilot CLI's search order and shadow the canonical manifest.

After editing `plugin.json`, `skills/`, or `commands/`, run `pnpm plugin:build` and commit the derived files with the change. `pnpm plugin:check` (also run by `pnpm verify`) rebuilds and fails if a derived file drifted.

`.claude-plugin/marketplace.json` at the **repo root** lists the plugin with an `npm` source; the build refreshes its entry from `plugin.json`. Versions flow from `packages/cyber-asana/package.json` on `pnpm version`: `changeset version`, then `universal-plugin publish sync-version` carries the number into `plugin.json`, then `pnpm plugin:build` re-derives every manifest and the catalog. Never hand-edit a `version` field.

The plugin declares **no MCP server** — no `mcp.json`, no `.mcp.json`, no `mcpServers` in any manifest; `src/plugin-manifests.test.ts` guards this. The skills drive the CLI. The MCP server is opt-in: the `init-asana` skill writes it into the client's own MCP config when the user asks (see [Why CLI + skills](apps/web/src/content/docs/reference/cli-vs-mcp.md)).

When writing an MCP config entry (in `init-asana` or the docs), never put a `"${SOME_VAR}"` value in its `env` for a client that does not expand it — it arrives literally and shadows the real variable. Prefer letting the server inherit the client's environment. Claude Code's `.mcp.json` does expand `${VAR}`, but forwards the literal text when the variable is unset. `envValue` in `src/env.ts` is the guard: a value that is exactly an unexpanded reference counts as absent, so the fallback alias still applies and a missing credential reports itself as missing. Keep that guard rather than working around it per config — it is the only thing covering configs this repo does not author.

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
| `ASANA_SYSTEM_TEST_SECTION_GID` | tasks create-in-section (a section of `ASANA_SYSTEM_TEST_PROJECT_GID`; also needs `ASANA_WORKSPACE_GID`). Creates and deletes a probe task |
| `ASANA_SYSTEM_TEST_AI_STUDIO` | AI Studio runs/seats list pagination; needs a service-account token in an AI Studio–licensed org |

Shared acceptance helpers: `src/testing/list-pagination.acceptance.ts`, `src/testing/paginating-gateway.ts`, `src/testing/system.ts`.

## Key Conventions

- **Authentication**: `ASANA_ACCESS_TOKEN` env var (personal access token); override per-invocation with `--token <pat>`
- **Workspace**: `ASANA_WORKSPACE_GID` env var for workspace GID; override with `--workspace <gid>`
- **Asana SDK**: `asana` npm package v3.x — API methods return `{ data: ... }`; always unwrap to `res.data`
- **No duplication**: CLI and MCP both call `api.ts`; never inline Asana SDK calls in cli.ts or mcp.ts
- **Workspace GID in requests**: pass as a plain string (`workspace: workspaceGid`), not as an object (`workspace: { gid: ... }`)
- **Task conventions**: `task_name_format`, `description_template`, and `default_tags` come only from the frontmatter of the `cyber-asana.task-conventions` reference (`packages/cyber-asana/references/`), resolved through buddy-agent-harness layers by `loadConventions()` in `src/conventions.ts`. Never add them back to `.agents/cyber-asana.json`; that block is rejected and `config migrate-conventions` moves it

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
- Asana work routing → [`packages/cyber-asana/skills/asana/SKILL.md`](packages/cyber-asana/skills/asana/SKILL.md); planning units of work before creating or reusing tasks → [`packages/cyber-asana/skills/asana/references/plan-work.md`](packages/cyber-asana/skills/asana/references/plan-work.md); task creation → [`packages/cyber-asana/skills/asana/references/create-task.md`](packages/cyber-asana/skills/asana/references/create-task.md) (also the `/cyber-asana:create-task` command in `packages/cyber-asana/commands/`); TODO/FIXME import → [`packages/cyber-asana/skills/asana/references/import-todos.md`](packages/cyber-asana/skills/asana/references/import-todos.md) (also `/cyber-asana:import-todos`); PR/MR linking on any git host → [`packages/cyber-asana/skills/asana/references/link-pr.md`](packages/cyber-asana/skills/asana/references/link-pr.md) (also `/cyber-asana:link-pr`); URL parsing → [`src/url.ts`](src/url.ts) when a URL is present; repo project registry → [`src/repo-config.ts`](src/repo-config.ts) / `.agents/cyber-asana.json`
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
ASANA_SYSTEM_TEST_SECTION_GID=...      # tasks create-in-section (section of the project above)
ASANA_SYSTEM_TEST_AI_STUDIO=1          # AI Studio usage (service account, licensed org)
```
