---
name: init-asana
description: Use this skill when setting up cyber-asana — PAT, workspace GID, connection verify, optional registry.
---

# Init Asana

## When to use

When the user is setting up `cyber-asana` for the first time, or when commands fail with auth or workspace errors.

## Instructions

### 1. Check for existing credentials

```bash
echo "Token set: ${ASANA_TOKEN:+yes}"
echo "Workspace set: ${ASANA_WORKSPACE:+yes}"
```

### 2. Set ASANA_TOKEN

If not set, guide the user:

1. Go to Asana → Profile Settings → Apps → Personal access tokens
2. Create a new token and copy it
3. Add to the user's shell profile (e.g. `export ASANA_TOKEN=...` in the file their shell loads on login)

Or pass per-command with `--token <pat>`.

### 3. Verify the connection and find workspace GID

```bash
cyber-asana workspace list --json
```

If it fails, the token is invalid or not set. Fix credentials and retry.

Parse the JSON `data` array for `{ gid, name }`. Ask the user which workspace to use.

### 4. Set ASANA_WORKSPACE

Add to the user's shell profile:

```bash
export ASANA_WORKSPACE=<workspace-gid>
```

This avoids passing `--workspace` on every command. Keep workspace GID in env — not in committed repo config (`.agents/cyber-asana.json` stores projects only).

### 5. Confirm setup

```bash
cyber-asana project list --json
```

A successful JSON response with projects confirms everything is working (`ASANA_WORKSPACE` must be set).

### 6. Optional — repo project registry

For repos that work against a fixed set of Asana projects, add a commit-friendly registry:

```bash
mkdir -p .agents
printf '%s\n' '{"schema_version":1,"projects":[]}' > .agents/cyber-asana.json
cyber-asana config add <project-gid>
```

Repeat `config add` for each project. Commit `.agents/cyber-asana.json` to source control.

Use `cyber-asana config sync` after bulk renames in Asana. For task creation with the registry, use the **create-asana-task** skill.

### 7. Optional — dual MCP with official Asana

Both servers can run together with separate config keys and credentials:

- **Official Asana MCP** — config key `asana`; OAuth app with `ASANA_CLIENT_ID` and `ASANA_CLIENT_SECRET` (not `ASANA_TOKEN`).
- **cyber-asana** — config key `cyber-asana`; PAT via `ASANA_TOKEN` (steps 2–4 above).

See [reference.md](./reference.md) for dual-config JSON examples and routing guidance.

## References

- [reference.md](./reference.md) — dual MCP setup and routing
- [Official Asana MCP docs](https://developers.asana.com/docs/mcp-tools-reference)
- [cyber-asana readme — dual MCP](https://github.com/cyberuni/cyber-asana/blob/main/readme.md#using-alongside-official-asana-mcp)
