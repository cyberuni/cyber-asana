---
name: analyze-official-asana-mcp
description: Internal — run when official Asana MCP catalog changed or maintainer asks for MCP gap analysis. Compares baselines, updates overlap map and routing docs, recommends implementation vs docs-only.
metadata:
  internal: true
---

# Analyze Official Asana MCP Gap

## When to use

- GitHub issue labeled `mcp-gap-analysis` or titled `chore: official Asana MCP catalog changed`
- Maintainer asks for "MCP gap analysis" or "official catalog changed"
- After adding or removing cyber-asana MCP tools (run `pnpm --filter @cyberuni/gap-analysis run catalog` first)

## Prerequisites

- Repo dependencies installed (`pnpm install`)
- Committed baselines present under `data/`

## Workflow

### 1. Refresh cyber-asana catalog if MCP source changed

```sh
pnpm --filter @cyberuni/gap-analysis run catalog
pnpm --filter @cyberuni/gap-analysis run check
```

### 2. Generate gap report

```sh
pnpm --filter @cyberuni/gap-analysis run report -- --json
```

Read the four buckets:

| Bucket | Meaning |
| --- | --- |
| `official_only` | Prefer official MCP; document routing |
| `cyber_only` | cyber-asana advantages; keep |
| `overlap` | Both servers can serve the workflow; update routing |
| `unmapped_*` | Overlap map references a tool missing from a catalog |

### 3. Classify catalog deltas

For each **added** official tool:

- **Official-only** — no sensible cyber-asana REST equivalent (e.g. previews, `search_objects`)
- **New overlap** — add entry to [`tools/gap-analysis/src/overlap-map.ts`](../../tools/gap-analysis/src/overlap-map.ts)
- **cyber-asana gap** — official added capability we should implement via REST

For each **removed** official tool:

- Note deprecation in maintainer summary
- Remove stale entries from `overlap-map.ts`

### 4. Update routing and overlap map

- Edit [`tools/gap-analysis/src/overlap-map.ts`](../../tools/gap-analysis/src/overlap-map.ts) for new or changed pairs
- When dual-MCP readme routing exists, update the routing table there
- Update affected skills under `skills/` if they reference MCP tool choice

### 5. Implementation handoff

If cyber-asana should gain tools:

- Follow [update-asana-sdk](../update-asana-sdk/SKILL.md) — gateway, api, cli, mcp, tests
- Regenerate catalog: `pnpm --filter @cyberuni/gap-analysis run catalog`

If docs-only:

- Routing/readme/skills changes suffice

### 6. Refresh official baseline (separate commit)

After analysis is complete:

```sh
pnpm --filter @cyberuni/gap-analysis run fetch-official -- --write
```

Verify:

```sh
# should exit 0 (unchanged vs itself — use a temp fetch instead)
pnpm --filter @cyberuni/gap-analysis run fetch-official -- --json > /tmp/official.json
pnpm --filter @cyberuni/gap-analysis run diff-official -- /tmp/official.json
# should exit 0 after baseline refresh
```

### 7. Maintainer summary

Post or include in PR:

- Added/removed official tools
- Overlap map edits
- Routing doc edits
- Recommended follow-up PRs (implement vs docs-only)

## Commands reference

| Command | Purpose |
| --- | --- |
| `pnpm --filter @cyberuni/gap-analysis run catalog` | Regenerate `data/cyber-asana-mcp-catalog.json` |
| `pnpm --filter @cyberuni/gap-analysis run check` | CI check — catalog matches source |
| `pnpm --filter @cyberuni/gap-analysis run fetch-official` | Fetch live official tool list |
| `pnpm --filter @cyberuni/gap-analysis run fetch-official -- --write` | Update official baseline |
| `pnpm --filter @cyberuni/gap-analysis run diff-official -- <file>` | Compare fetch vs baseline |
| `pnpm --filter @cyberuni/gap-analysis run report` | Human-readable gap report |
| `pnpm --filter @cyberuni/gap-analysis run report -- --json` | Machine-readable gap report |

## Commit discipline

1. Analysis + overlap-map + docs (one commit)
2. Baseline JSON refresh (separate commit)

Never commit with red tests. Run `pnpm --filter @cyberuni/gap-analysis run test` before pushing.
