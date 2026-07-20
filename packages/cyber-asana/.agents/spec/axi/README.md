---
spec-type: reference
---

# axi

## Subject

The shared CLI/MCP output contract every domain module conforms to, implementing the [10 agent-CLI principles](https://github.com/kunchenguid/axi#the-10-principles): `output.ts`, `cli-error.ts`, `cli-options.ts`, `mcp-error.ts`, `mcp-options.ts`, `mcp-output.ts`, `pagination.ts`, `toon.ts`, `truncate.ts`, `version.ts`, `default-command.ts`. Structured output (`--json`/`--toon`), empty-state handling, truncation, and error/exit-code conventions live here — never re-implemented per domain.
