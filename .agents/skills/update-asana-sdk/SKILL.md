---
name: update-asana-sdk
description: Use this skill when updating the `asana` npm package and adding the CLI commands and MCP tools its changes call for.
metadata:
  internal: true
---

# Update Asana SDK

## When to use

When the user asks to update the `asana` package, bump the SDK version, or check for new Asana API capabilities.

## Instructions

### 1. Check current and latest versions

Run this skill from `packages/cyber-asana`.

```bash
node -e "console.log(require('./node_modules/asana/package.json').version)"
npm show asana version
```

### 2. Upgrade the package

Detect the package manager from the lockfile — `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, else npm — then run:

```bash
<pm> add asana@latest
```

### 3. Review what changed

Fetch the asana SDK changelog and diff the TypeScript types between old and new versions:

```bash
# View the changelog
cat node_modules/asana/CHANGELOG.md | head -200
```

`node_modules/` is untracked, so git cannot diff it. Before Step 2, copy `node_modules/asana/index.d.ts` aside, then diff the copy against the new file after upgrading (the most reliable signal for new or changed API surface). If the copy was not taken, check the npm release page for the asana package.

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

Invoke the `buddy-changesets:changesets` skill. Use `patch` for parameter additions or fixes, `minor` for new resources or new actions.

### 8. Summarize

Report:
- SDK version bumped from X to Y
- New resources added (if any)
- New actions added (if any)
- Changed parameters updated (if any)
- Anything skipped and why
