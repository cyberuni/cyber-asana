# Tooling

How this package is built, checked, released, and kept current. A descriptive home — it carries
rules and pointers, not behavior, so it has no `spec-type` marker and no suite.

## The workspace

A pnpm workspace (`pnpm-workspace.yaml`) whose root package is private glue, not a shipped artifact.
The published package is `packages/cyber-asana`. **turbo** (`turbo.json`) runs tasks across it, with
`build`, `typecheck`, and `test` all declaring `dependsOn: ["^build"]` — a task never runs against a
dependency that has not been built.

`pnpm verify` (`turbo run build typecheck test`) is the one command that answers "is this
change safe", and is what a contributor runs before pushing.

## Per-package tasks

| Task | Tool |
|---|---|
| `build` | **tsdown** → `dist/` |
| `typecheck` | `tsc --noEmit` |
| `test` | **vitest**, over `src` |
| `test:system` | vitest under `vitest.system.config.ts` — the live-API suites, env-gated and skipped when the variables are unset |
| `dev` | **tsx** running `src/cli.ts` directly, so the CLI can be exercised without a build |

Lint and format are **biome** (`biome.json`), run from the root as `pnpm check` / `check:fix`.
Unused-export detection is **knip**. Git hooks are **husky**.

## What ships

`package.json`'s `files` is `["dist", "!dist/**/*.test.*", "!dist/**/*.system.*"]` — the built output
only, with test and system-test artifacts excluded. This is why the spec corpus under `.agents/` is
never published: it is not on the allowlist. Two entry points are exported, `.` and `./mcp`, plus the
`cyber-asana` binary.

## CI

- **`pull-request.yml`** — on every PR. Delegates the main check to the shared org workflow
  `cyberuni/.github/.github/workflows/pnpm-verify.yml@main` rather than re-declaring the matrix
  locally, and adds one repo-specific job: a gap-analysis check over the MCP catalog.
- **`release.yml`** — changesets. `pnpm version` applies pending changesets, `pnpm release` publishes.
- **`dependabot-autofix.yml`** / **`dependabot-automerge.yml`** — dependency PR handling.
- **`mcp-catalog-watch.yml`** — a scheduled job (Mondays 09:00 UTC, plus manual dispatch with a
  `dry_run` input) that watches the MCP catalog and opens an issue when it drifts. It is the reason
  new Asana SDK surface tends to arrive as a filed issue rather than being noticed by hand.

## Releasing

**changesets** (`.changeset/config.json`). A user-visible change to the published package needs a
changeset; spec-corpus and internal-tooling changes do not, since they never reach `dist/`.

## Related

- Adding or updating MCP tools after an SDK bump → the `update-asana-sdk` skill.
- The output conventions every command must satisfy → [axi](../axi/README.md).
