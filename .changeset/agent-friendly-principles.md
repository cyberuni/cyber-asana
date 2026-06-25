---
"cyber-asana": minor
---

Make the CLI and MCP server follow the 10 agent-friendly CLI principles:

- **Token-efficient output** — new `--toon` flag emits compact TOON (~40% fewer
  tokens than JSON); opt-in `CYBER_ASANA_MCP_FORMAT=toon` does the same for every
  MCP tool result.
- **Minimal default schemas** — task lists request only `gid,name,completed,due_on`
  by default (also fixes previously-blank Done/Due columns).
- **Content truncation** — large task notes are truncated with a size hint; `--full`
  restores the complete value.
- **Definitive empty states** — empty results print `0 results` instead of `(none)`.
- **Pre-computed aggregates & next steps** — task lists print a count summary and
  follow-up command suggestions (text mode only).
- **Structured errors & exit codes** — errors are structured under `--json`/`--toon`
  and map to distinct exit codes (auth, forbidden, not found, rate limited, config).
- **Content first** — running with no arguments shows live data (the authenticated
  user) instead of help text.
- **Consistent help** — concise examples in top-level and per-resource `--help`.
