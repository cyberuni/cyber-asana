---
name: update-asana-sdk
description: Use this skill when updating the `asana` npm package to its latest version in the asana-agent repo. After upgrading, reviews the SDK changelog and TypeScript types to identify new resources, new actions, changed parameters, and deprecated methods — then adds or updates the corresponding CLI commands and MCP tools.
---

# Update Asana SDK

## When to use

When the user asks to update the `asana` package, bump the SDK version, or check for new Asana API capabilities.

## Instructions

### 1. Check current and latest versions

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

# Diff the generated types (most reliable signal for new/changed API surface)
git diff HEAD node_modules/asana/index.d.ts 2>/dev/null || \
  npx diff-so-fancy <(git show HEAD:node_modules/asana/index.d.ts 2>/dev/null) node_modules/asana/index.d.ts
```

If the types diff is unavailable, check the npm release page for the asana package.

### 4. Identify gaps

For each new or changed resource/method in the SDK, check whether `asana-agent` already covers it:

- Look for new top-level resource objects in the SDK types (e.g. `GoalsApi`, `RulesApi`)
- Look for new methods on existing resources
- Look for changed parameter shapes (new optional fields, renamed fields)
- Look for deprecated methods that should be removed or updated

Cross-reference against the existing domains in `src/`:

```bash
ls src/
```

### 5. Implement changes

For each gap found, follow the repo's screaming architecture pattern — one domain folder per Asana resource, each with exactly three files:

- `src/<resource>/api.ts` — Asana SDK wrappers (no inline SDK calls elsewhere)
- `src/<resource>/cli.ts` — Commander command factory
- `src/<resource>/mcp.ts` — MCP tool registrations

**New resource**: create all three files, wire into `src/cli.ts` and `src/mcp.ts`, export from `src/index.ts`.

**New action on existing resource**: add to `api.ts`, add CLI subcommand in `cli.ts`, add MCP tool in `mcp.ts`.

**Changed parameters**: update the relevant `api.ts` wrapper and propagate to CLI options and MCP schema.

Key conventions to follow:
- Unwrap SDK responses: `res.data`, not `res`
- Workspace GID as plain string: `workspace: workspaceGid`
- MCP tool naming: `asana_<resource>_<action>`
- CLI output: use `output()`, `printFields()`, `printTable()` from `src/output.ts`
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
