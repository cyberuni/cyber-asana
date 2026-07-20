# Design

Rules, invariants, and the runtime-wiring pattern shared across every capability. Not a capability itself — no `spec-type` marker.

## Runtime wiring

- `src/composition.ts` is the composition root: it wires each domain's gateway → api → cli/mcp registration together, and registers all CLI subcommands / MCP tools.
- `src/client.ts` constructs the Asana SDK client from `ASANA_TOKEN` (env or `--token`).
- `src/cli.ts` / `src/mcp.ts` are the two entrypoints (bin + MCP server) that call into `composition.ts`; `src/mcp-server.ts` / `src/mcp-cli.ts` handle MCP process wiring; `src/index.ts` is the package's export barrel.
- `src/env.ts` resolves env-var aliases; documented in [config](../config/README.md), since it's config resolution, not composition.
- Every domain follows the same internal shape: `gateway.ts` (SDK calls, unwraps `res.data`) → `api.ts` (facade) → `cli.ts` (Commander bindings) + `mcp.ts` (MCP tool registrations). CLI and MCP never inline SDK calls — both go through `api.ts`.

## Shared test/type infrastructure

- `src/testing/` — shared acceptance-spec helpers (`list-pagination.acceptance.ts`, `paginating-gateway.ts`, `system.ts`); used across every domain's `*.acceptance.test.ts` / `*.system.ts`, not a capability of its own.
- `src/types/` — type-only module (`node.d.ts`).
