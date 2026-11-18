---
name: init-asana
description: Use this skill when setting up cyber-asana — PAT, workspace GID, connection verify, optional registry.
metadata:
  pin-exempt: true
---

# Init Asana

## When to use

When the user is setting up `cyber-asana` for the first time, or when commands fail with auth or workspace errors.

## Ensure cyber-asana CLI

Each cyber-asana skill runs the CLI through the forwarder in its own folder:

```bash
node <this skill's folder>/scripts/cyber-asana.mjs --version
```

The forwarder runs the CLI of the plugin's own version on every install route, and the local build in a cyber-asana checkout. Run every command exactly as a skill writes it, with no `npx`, `pnpm exec`, or bare `cyber-asana` call in its place. If `--version` prints no version, tell the user the plugin install is incomplete (reinstall or update the plugin) and skip the CLI steps.

## Instructions

### 1. Check for existing credentials

```bash
echo "Token set: ${ASANA_ACCESS_TOKEN:+yes}${ASANA_TOKEN:+ (ASANA_TOKEN set, no longer read)}"
echo "Workspace set: ${ASANA_WORKSPACE_GID:+yes}${ASANA_WORKSPACE:+ (ASANA_WORKSPACE set, no longer read)}"
```

### 2. Set ASANA_ACCESS_TOKEN

If not set, guide the user:

1. Go to Asana → Profile Settings → Apps → Personal access tokens
2. Create a new token and copy it
3. Add to the user's shell profile (e.g. `export ASANA_ACCESS_TOKEN=...` in the file their shell loads on login)
4. If the user has only `ASANA_TOKEN` (or only `ASANA_WORKSPACE`) set, tell them those names are no longer read and to rename them to `ASANA_ACCESS_TOKEN` (or `ASANA_WORKSPACE_GID`)

Or pass per-command with `--token <pat>`.

### 3. Verify the connection and find workspace GID

Ensure the CLI is available first (see **Ensure cyber-asana CLI**), then run:

```bash
node <this skill's folder>/scripts/cyber-asana.mjs workspace list --toon
```

If it fails, the token is invalid or not set. Fix credentials and retry.

Read the `{ gid, name }` rows from the output (`--toon` is the token-efficient format; use `--json` for raw JSON). Ask the user which workspace to use.

### 4. Set ASANA_WORKSPACE_GID

Add to the user's shell profile:

```bash
export ASANA_WORKSPACE_GID=<workspace-gid>
```

This avoids passing `--workspace` on every command. Keep workspace GID in env — not in committed repo config (`.agents/cyber-asana.json` stores projects, users, fields and defaults, not the workspace).

### 5. Confirm setup

```bash
node <this skill's folder>/scripts/cyber-asana.mjs --version
```

A successful version print confirms the CLI runs with credentials loaded. If workspace-scoped commands still fail, recheck `ASANA_WORKSPACE_GID` from step 4.

### 6. Optional — project and user registry

For repos that work against a fixed set of Asana projects, or a fixed set of people, use the
**config-asana** skill. It searches projects by keyword with `project search` and users
by typeahead with `add-user --search`, confirms selections with the user, and adds, removes, or
refreshes them in `.agents/cyber-asana.json` — or, with `--global`, a personal cross-repo registry.

### 7. Optional — enable the MCP server (default: no)

The plugin does not start an MCP server; every cyber-asana skill drives the CLI. Ask the user once:

> Also enable the cyber-asana MCP server? The skills already work through the CLI, which keeps
> every MCP tool schema out of context in clients that load them all up front. Enable it for a
> client without a shell (Claude Desktop or claude.ai chat, an API MCP connector) or to approve each
> Asana tool separately. If you prefer MCP, you can also use
> [Asana's official MCP server](https://developers.asana.com/docs/mcp-server) instead of or alongside it.

Treat no answer as **no** and skip to step 8. The official server is the user's own choice: link it,
do not set it up as part of this step. On yes:

1. **Detect the client** you are running in: Claude Code, Cursor, Codex, or Copilot CLI. Ask if unsure.
2. **Ask the scope** where the client supports both — this project, or every project for this user.
   Recommend user scope, so the server and its credentials stay out of the repository.
3. **Check for an existing `cyber-asana` entry** in that client and scope. If one exists, show it and
   ask before changing it; if it already runs `cyber-asana@<exact>`, report it and stop.
4. **Write the entry the client's own way**, from [reference.md — Enable the MCP server](./reference.md#enable-the-mcp-server).
   The command is always `npx -y cyber-asana@<exact> mcp`, with `<exact>` the output of the
   forwarder's `--version` (the plugin's own version, so the server matches the CLI the skills run).
   The MCP entry lives in the client's config, outside the plugin, so it cannot use the plugin's path. Let the server inherit `ASANA_ACCESS_TOKEN` and `ASANA_WORKSPACE_GID`
   from the environment where the client allows it. Never write a literal `"${VAR}"` value for a client
   that does not expand it. Never write a token into a project-scoped file.
5. **Tell the user to restart or reload the client**, then confirm the `asana_*` tools are listed.

To set `CYBER_ASANA_MCP_FORMAT=toon` for token-efficient output, add it to the entry's environment.

### 8. Optional — dual MCP with official Asana

Only relevant when the user enabled the MCP server in step 7, or runs the official Asana MCP server
alongside the CLI. Both servers can run together with separate config keys and credentials:

- **Official Asana MCP** — config key `asana`; an **MCP app** registration, whose `ASANA_CLIENT_ID` and `ASANA_CLIENT_SECRET` belong in the host config's `auth` block (not `ASANA_ACCESS_TOKEN`).
- **cyber-asana** — config key `cyber-asana`; PAT via `ASANA_ACCESS_TOKEN` and workspace via `ASANA_WORKSPACE_GID` (steps 2–4 above). For OAuth instead of a PAT, it needs its own **API app** via `ASANA_API_CLIENT_ID` / `ASANA_API_CLIENT_SECRET` — an MCP app's credentials will not work.

See [reference.md](./reference.md) for dual-config JSON examples and routing guidance.

### 9. Optional — scrum setup

Last, offer scrum: ask once whether the user wants to run sprints from Asana for this repo or team. On yes, hand off to the `init-asana-scrum` skill, which adds a scope, picks the sprint model, creates the backlog and current sprint, and writes the sprint policy. Treat no answer as **no** and finish.

## References

- [reference.md](./reference.md) — per-client MCP opt-in, dual MCP setup and routing
- [Why CLI + skills, not MCP by default](https://cyberuni.github.io/cyber-asana/reference/cli-vs-mcp/)
- [Official Asana MCP docs](https://developers.asana.com/docs/mcp-tools-reference)
- [cyber-asana readme — dual MCP](https://github.com/cyberuni/cyber-asana/blob/main/readme.md#using-alongside-official-asana-mcp)
