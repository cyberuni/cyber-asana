---
name: init-asana
description: Use this skill when setting up cyber-asana — PAT, workspace GID, connection verify, optional registry.
---

# Init Asana

## When to use

When the user is setting up `cyber-asana` for the first time, or when commands fail with auth or workspace errors.

## Ensure cyber-asana CLI

Before running any `cyber-asana` command:

1. **Resolve pinned version** — latest published semver: `npm view cyber-asana version`. Use this value as `<exact>` for every `npx cyber-asana@<exact>` in this skill and all other cyber-asana skills (never `@latest`, never a literal placeholder).
2. **Check availability**: `npx cyber-asana@<exact> --version` (or `cyber-asana --version` if globally installed).
3. If that succeeds, proceed normally.

If it fails (npx install prompt, `command not found`, or other non-zero exit):

1. Tell the user the workflow needs to download `cyber-asana` from npm (no `package.json` change).
2. **Ask** whether to install.
3. After yes, run the one-time install only: `npx --yes cyber-asana@<exact> --version`
4. For all later commands, use `npx cyber-asana@<exact> <subcommand>` (no `--yes`) or `cyber-asana` if globally installed.
5. If the user declines npx, ask whether to add `cyber-asana` as a devDependency instead. Note drawbacks: it modifies `package.json` and may need ignoring in unused-dependency tools (e.g. `knip`). If they decline both, skip CLI steps.

## Instructions

### 1. Check for existing credentials

```bash
echo "Token set: ${ASANA_ACCESS_TOKEN:+yes}${ASANA_TOKEN:+ (deprecated ASANA_TOKEN set)}"
echo "Workspace set: ${ASANA_WORKSPACE_GID:+yes}${ASANA_WORKSPACE:+ (deprecated ASANA_WORKSPACE set)}"
```

### 2. Set ASANA_ACCESS_TOKEN

If not set, guide the user:

1. Go to Asana → Profile Settings → Apps → Personal access tokens
2. Create a new token and copy it
3. Add to the user's shell profile (e.g. `export ASANA_ACCESS_TOKEN=...` in the file their shell loads on login)
4. If the user already has `ASANA_TOKEN`, tell them it still works as a deprecated fallback but new setup should use `ASANA_ACCESS_TOKEN`

Or pass per-command with `--token <pat>`.

### 3. Verify the connection and find workspace GID

Ensure the CLI is available first (see **Ensure cyber-asana CLI**), then run:

```bash
cyber-asana workspace list --toon
# or, if using npx without global install:
npx cyber-asana@<exact> workspace list --toon
```

If it fails, the token is invalid or not set. Fix credentials and retry.

Read the `{ gid, name }` rows from the output (`--toon` is the token-efficient format; use `--json` for raw JSON). Ask the user which workspace to use.

### 4. Set ASANA_WORKSPACE_GID

Add to the user's shell profile:

```bash
export ASANA_WORKSPACE_GID=<workspace-gid>
```

This avoids passing `--workspace` on every command. Keep workspace GID in env — not in committed repo config (`.agents/cyber-asana.json` stores projects only).

### 5. Confirm setup

```bash
cyber-asana --version
# or, if using npx without global install:
npx cyber-asana@<exact> --version
```

A successful version print confirms the CLI runs with credentials loaded. If workspace-scoped commands still fail, recheck `ASANA_WORKSPACE_GID` from step 4.

### 6. Optional — repo project registry

For repos that work against a fixed set of Asana projects, use the **pin-asana-projects** skill. It searches projects by keyword with `project search`, confirms selections with the user, and pins them in `.agents/cyber-asana.json` via `config add`.

### 7. Recommended — connect the MCP server (ambient session integration)

For AI agents, prefer connecting the cyber-asana MCP server as an ambient,
always-available session integration first — then reach for the on-demand
skills (standup, sprint report, sync, etc.) as needed. Add the cyber-asana MCP
server to your host (see [readme — MCP Server](https://github.com/cyberuni/cyber-asana/blob/main/readme.md#mcp-server))
and set `CYBER_ASANA_MCP_FORMAT=toon` in its `env` for token-efficient output.

### 8. Optional — dual MCP with official Asana

Both servers can run together with separate config keys and credentials:

- **Official Asana MCP** — config key `asana`; OAuth app with `ASANA_CLIENT_ID` and `ASANA_CLIENT_SECRET` (not `ASANA_ACCESS_TOKEN`).
- **cyber-asana** — config key `cyber-asana`; PAT via `ASANA_ACCESS_TOKEN` and workspace via `ASANA_WORKSPACE_GID` (steps 2–4 above).

See [reference.md](./reference.md) for dual-config JSON examples and routing guidance.

## References

- [reference.md](./reference.md) — dual MCP setup and routing
- [Official Asana MCP docs](https://developers.asana.com/docs/mcp-tools-reference)
- [cyber-asana readme — dual MCP](https://github.com/cyberuni/cyber-asana/blob/main/readme.md#using-alongside-official-asana-mcp)
