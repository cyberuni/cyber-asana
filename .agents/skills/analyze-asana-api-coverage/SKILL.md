---
name: analyze-asana-api-coverage
description: "Internal skill: Use this skill when REST API support changes or a maintainer asks to refresh API coverage."
metadata:
  internal: true
---

# Analyze Asana API Coverage

## When to use

- After adding, removing, or changing a cyber-asana REST operation
- Maintainer asks to audit, refresh, or correct API coverage
- Before publishing a release that changes supported Asana resources

## Prerequisites

- Repo dependencies installed
- The `asana` SDK version resolved from `packages/cyber-asana/package.json`

## Workflow

### 1. Inventory implemented REST support

1. Inspect API domains registered from `packages/cyber-asana/src/composition.ts`.
2. For each domain, inspect its `gateway.ts`, `api.ts`, `cli.ts`, and `mcp.ts`.
3. Count distinct Asana SDK operations, excluding SDK aliases and wrapper helpers.
4. Classify helpers that compose REST operations or make no REST call separately.
5. Confirm every documented REST operation has both a CLI command and MCP tool, or document the intentional exception.

### 2. Reconcile coverage claims

1. Compare the inventory with the installed SDK API groups.
2. Set a resource to ✅ only when every distinct operation in its API group is available.
3. Set a resource to 🟡 when one or more operations are absent; name the omitted operations.
4. List unwrapped API groups in the Not wrapped section.
5. Keep resource-group and operation counts scoped to the SDK version named in the page.

### 3. Update the web documentation

Update [`apps/web/src/content/docs/reference/api-coverage.md`](../../apps/web/src/content/docs/reference/api-coverage.md):

- Coverage-at-a-glance counts and statuses
- Resource rows and notes
- Operation-level CLI/MCP mappings
- Not-wrapped resources
- cyber-asana helpers under What cyber-asana adds on top

### 4. Reconcile parameter coverage

Operation counts say nothing about the options an operation takes. Every path, query, and top-level
body parameter of each wrapped operation is classified in
[`tools/gap-analysis/data/parameter-coverage.json`](../../../tools/gap-analysis/data/parameter-coverage.json):
`covered` (name the CLI flag and the MCP field), `skipped` (give the reason), or `gap` (link the issue
that tracks it).

1. After refreshing the baseline or wrapping a new operation, run
   `pnpm --filter @cyberuni/gap-analysis run parameters -- --skeleton` to add a `todo` entry for each
   wrapped operation that has none.
2. Replace every `todo`, and classify any parameter `pnpm --filter @cyberuni/gap-analysis test` names.
3. File one issue per gap, or per group of gaps that one change closes, and put its URL in `issue`.
4. Run `pnpm --filter @cyberuni/gap-analysis run parameters` to regenerate
   [the parameter coverage page](../../../apps/web/src/content/docs/reference/parameter-coverage.md).

### 5. Verify

```sh
pnpm check
pnpm --dir apps/web build
```

Run focused package tests when the inventory found source behavior that needs correction.

### 6. Commit discipline

Commit documentation corrections with the API change they describe. If the audit finds only doc drift, commit the web-doc update as its own `docs:` commit.
