---
name: update-asana-sdk
description: Use this skill when bumping the asana SDK or when an MCP or REST drift issue asks if the SDK covers a new resource.
metadata:
  internal: true
---

# Update Asana SDK

## When to use

Any time the work touches the `asana` SDK or what it supports:

- Bumping or upgrading `asana`, including a Renovate PR that bumps it
- The weekly official-MCP catalog drift issue (`chore: official Asana MCP catalog changed`, label `mcp-gap-analysis`)
- A REST API drift issue (`chore: Asana REST API changed`, label `rest-api-drift`)
- Checking whether the SDK supports a new Asana resource or tool (for example tables or records)
- Wrapping new SDK resources or methods as CLI commands and MCP tools

Do this before concluding the SDK lacks an API. A stale copy of the package gives a wrong answer.

## Instructions

This repo uses pnpm. Run every command from `packages/cyber-asana`.

### 1. Check current and latest versions

```bash
node -p "require('./node_modules/asana/package.json').version"
grep -n "asana" ../../pnpm-lock.yaml | head
npm view asana version
```

Read the installed version only from `packages/cyber-asana/node_modules/asana/package.json` and `pnpm-lock.yaml`. Do not read it from a `.pnpm` store directory or a root `node_modules`: those can hold stale copies, and a pod once concluded the SDK had no `TablesApi` or `RecordsApi` from one. If `node_modules` is missing, run `pnpm install` first.

### 2. Upgrade the package

Before upgrading, copy the types aside (Step 3 diffs against them):

```bash
cp -r node_modules/asana/dist "${TMPDIR:-/tmp}/asana-before"
```

Then:

```bash
pnpm add asana@latest
```

This keeps the `^` range in `package.json` and updates `pnpm-lock.yaml`. Commit both files. Confirm the installed version matches `npm view asana version`.

### 3. Review what changed

The package ships no changelog. Diff the TypeScript types between old and new versions:

```bash
diff -rq "${TMPDIR:-/tmp}/asana-before" node_modules/asana/dist | grep -v '\.js'
```

`node_modules/` is untracked, so git cannot diff it. The `dist/api/*.d.ts` files are the most reliable signal for new or changed API surface (one `*Api` class per resource). If the copy was not taken, check the npm release page for the asana package.

### 4. Identify gaps

For each new or changed resource/method in the SDK, check whether `cyber-asana` already covers it:

- Look for new top-level resource objects in the SDK types (e.g. `GoalsApi`, `RulesApi`)
- Look for new methods on existing resources
- Look for changed parameter shapes (new optional fields, renamed fields)
- Look for deprecated methods that should be removed or updated

Cross-reference against the existing domains in `src/`:

```bash
ls src/
```

For a drift issue, also confirm each new tool or endpoint has an SDK basis (an `*Api` class and method in the new types). If it does not, say so in the report instead of inventing a REST call.

### 5. Implement changes

For each gap found, follow the repo's screaming architecture (AGENTS.md → Layout and dependency direction) — one domain folder per Asana resource:

- `src/<resource>/gateway.ts` — the port and its Asana SDK adapter, the only place that calls the SDK
- `src/<resource>/api.ts` — use cases, `createXApi(gateway)`
- `src/<resource>/default.ts` — standalone functions exported from the package root
- `src/<resource>/cli.ts` and `mcp.ts` — delivery

**New resource**: create the domain folder, wire it in `src/composition.ts`, re-export from `src/index.ts`.

**New action on existing resource**: add it to `gateway.ts` and `api.ts`, then the CLI subcommand in `cli.ts` and the MCP tool in `mcp.ts`.

**Changed parameters**: update the relevant `api.ts` wrapper and propagate to CLI options and MCP schema.

Key conventions to follow:
- Unwrap SDK responses: `res.data`, not `res`
- Workspace GID as plain string: `workspace: workspaceGid`
- MCP tool naming: `asana_<resource>_<action>`
- CLI output: use `output()`, `printFields()`, `printTable()` from `src/platform/cli/output.ts`
- Zod schemas for all MCP parameters

### 6. Verify

```bash
pnpm verify
```

Fix any type errors or lint failures before finishing.

### 7. Add a changeset

Invoke the `add-changeset` skill. Use `patch` for parameter additions or fixes, `minor` for new resources or new actions.

### 8. Summarize

Report:
- SDK version bumped from X to Y
- New resources added (if any)
- New actions added (if any)
- Changed parameters updated (if any)
- Anything skipped and why
