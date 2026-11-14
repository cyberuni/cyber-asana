---
name: run-system-tests
description: "Internal skill: Use this skill when running the live Asana system tests on a paid workspace, after a unit adds a *.system.ts, or before relying on a docs-only Asana field or value."
metadata:
  internal: true
---

# Run system tests

## When to use

- Before relying on an Asana field, enum value, or behavior that only the docs describe (for example a story `resource_subtype`).
- After a unit adds or changes a `*.system.ts`.
- When a suite needs a paid workspace (custom fields, goals, portfolios, search, allocations).

Build sessions usually have no token, so their system suites skip. A skip is not a pass; this skill is how the suites actually run.

## Prerequisites

- A paid Asana workspace and a personal access token for it.
- `ASANA_ACCESS_TOKEN` exported. `ASANA_WORKSPACE_GID` exported, or a project GID passed as an argument.
- Run from `packages/cyber-asana`, or from the repo root as `pnpm ca test:system:paid`.

## Run

```sh
export ASANA_ACCESS_TOKEN=<pat>
export ASANA_WORKSPACE_GID=<paid workspace gid>
pnpm test:system:paid [project-gid]
```

The command sets `ASANA_SYSTEM_TEST=1` and `ASANA_PLAN=paid`, finds or creates the fixtures (same as `pnpm test:system:setup`; it leaves them in place), runs every `*.system.ts`, and prints a summary. It never prints the token. A gitignored `.env` is loaded; an exported variable wins over it.

## Read the summary

One line per suite:

- `PASSED`: ran and every test passed. `(N tests skipped inside)` means some tests in the file skipped.
- `FAILED`: a test failed. Read the vitest output above the summary.
- `SKIPPED (reason)`: did not run. The reason names the missing variable or plan, or says the suite skipped itself.

Exit codes: `0` every required suite passed; `1` a suite failed; `2` setup missing (token or workspace); `3` nothing failed but a required suite skipped. Treat `3` as not done. Suites marked optional in `src/testing/system-suites.ts` may skip without exit `3`.

## When a suite fails

- A live value differs from what the code assumes (for example a story `resource_subtype`): fix the constant, then fix the design doc note that claimed it, and record the finding in the PR.
- Payment Required: the workspace is not on a plan the suite needs. Report it; do not skip the suite.
- A fixture is missing or stale: rerun; setup is idempotent.

Never edit a suite to skip around a failure.

## Suites

The table lives in `SYSTEM_SUITES` in `packages/cyber-asana/src/testing/system-suites.ts`, and `system-suites.test.ts` fails when a `*.system.ts` has no row. **Each new `*.system.ts` must add its row there and in this table.**

"Fixture" variables are set by the command; the rest you export.

| Suite | Variables (besides `ASANA_SYSTEM_TEST`, token) | Plan |
| --- | --- | --- |
| `ai-studio/api` | `ASANA_WORKSPACE_GID`, `ASANA_SYSTEM_TEST_AI_STUDIO` (service account, AI Studio org) | opt-in |
| `allocations/api` | workspace; project (fixture) for the body-fields test. Skips itself on a 402 (plan without resource management) | plan-gated, optional |
| `attachments/api` | task (fixture) | any |
| `custom-fields/api` | workspace, project (fixture) | paid |
| `goals/api` | workspace | paid |
| `memberships/api` | project (fixture) | any |
| `ooo/api` | workspace | any |
| `portfolios/api` | workspace | paid |
| `project-templates/api` | workspace | any |
| `projects/api` | workspace | any |
| `scrum/sprint-sections` | workspace, project (fixture) | any |
| `search/api` | workspace | any |
| `sections/api` | project (fixture) | any |
| `skills/html-subset` | workspace | any |
| `stories/api` | task (fixture) | any |
| `tags/api` | workspace | any |
| `tasks/api` | workspace, project, task, second task (fixtures); `ASANA_SYSTEM_TEST_SECTION_GID` for create-in-section | any |
| `task-templates/api` | project (fixture) | any |
| `teams/api` | workspace | any |
| `workspaces/api` | none | any |
