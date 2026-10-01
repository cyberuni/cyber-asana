---
name: init-asana
description: Use this skill when setting up cyber-asana — PAT, workspace GID, connection verify, optional registry.
---

# Init Asana

## When to use

When the user is setting up `cyber-asana` for the first time, or when commands fail with auth or workspace errors.

## Ensure cyber-asana CLI

Before running any `cyber-asana` command, settle how to invoke it — once, in this order. Whichever form resolves is what every `cyber-asana <subcommand>` in this skill and all other cyber-asana skills means.

1. **Shipped CLI (preferred).** When these skills came from an installed `cyber-asana` plugin or npm package, the CLI ships beside them and is bundled with its dependencies inlined, so it needs no install and no network:

   ```bash
   node <cyber-asana-root>/skills/init-asana/scripts/cyber-asana.mjs --version
   ```

   `<cyber-asana-root>` is the package root, four levels up from that script; from another cyber-asana skill's own directory the same launcher is `../init-asana/scripts/cyber-asana.mjs`. If it prints a version, use it for every later command and skip the rest of this section.
2. **Global install** — `cyber-asana --version`. If that succeeds, use the bare `cyber-asana` spelling.
3. **npx fallback** — resolve the latest published semver with `npm view cyber-asana version` and use it as `<exact>` for every `npx cyber-asana@<exact>` (never `@latest`, never a literal placeholder). Check with `npx cyber-asana@<exact> --version`.

If only the npx path is left and it fails (install prompt, `command not found`, or other non-zero exit):

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

### 6. Optional — project and user registry

For repos that work against a fixed set of Asana projects, or a fixed set of people, use the
**config-asana** skill. It searches projects by keyword with `project search` and users
by typeahead with `add-user --search`, confirms selections with the user, and adds, removes, or
refreshes them in `.agents/cyber-asana.json` — or, with `--global`, a personal cross-repo registry.

### 7. Optional — enable the MCP server (default: no)

The plugin does not start an MCP server; every cyber-asana skill drives the CLI. Ask the user once:

> Also enable the cyber-asana MCP server? The skills already work through the CLI, which avoids up
> to about 21k tokens of tool schemas in clients that load every MCP tool up front. Enable it for a
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
   The command is always `npx -y cyber-asana@<exact> mcp`, with `<exact>` resolved as in
   **Ensure cyber-asana CLI**. Let the server inherit `ASANA_ACCESS_TOKEN` and `ASANA_WORKSPACE_GID`
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

## References

- [reference.md](./reference.md) — per-client MCP opt-in, dual MCP setup and routing
- [Why CLI + skills, not MCP by default](https://cyberuni.github.io/cyber-asana/reference/cli-vs-mcp/)
- [Official Asana MCP docs](https://developers.asana.com/docs/mcp-tools-reference)
- [cyber-asana readme — dual MCP](https://github.com/cyberuni/cyber-asana/blob/main/readme.md#using-alongside-official-asana-mcp)
