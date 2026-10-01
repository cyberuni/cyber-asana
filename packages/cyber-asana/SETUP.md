---
name: setup
description: Use this skill when finishing cyber-asana plugin setup — the token and workspace the CLI needs.
---

# Setup — cyber-asana

Installing the plugin gave the agent the cyber-asana skills and the `cyber-asana` CLI. It did **not**
start an MCP server: the skills drive the CLI, and MCP is opt-in. What the CLI still needs is an
Asana credential and a workspace to scope requests to. Both are read from the environment, so this
is the one part the plugin cannot do for the user.

## What the CLI reads

| Variable | Purpose |
| --- | --- |
| `ASANA_ACCESS_TOKEN` | Personal access token; every request authenticates with it |
| `ASANA_WORKSPACE_GID` | Default workspace, so workspace-scoped commands need no `--workspace` |

## 1. Create a personal access token

Ask the user to open Asana → **Profile Settings** → **Apps** → **Personal access tokens**, create a
token, and copy it. Asana shows the value once.

## 2. Export the token where the agent can see it

The variables must be set in the environment the agent host inherits — the user's shell profile,
not a project `.env` the host never reads.

```sh
export ASANA_ACCESS_TOKEN=<token>
```

Restart the agent host afterwards; a process started before the export keeps the old environment.

## 3. Find the workspace GID

With the token in place, list the workspaces and read the `{ gid, name }` rows. Ask the user which
workspace to use.

```sh
npx -y cyber-asana@<version> workspace list
```

Use the installed plugin's version for `<version>`, or plain `cyber-asana` if it is on `PATH`.

## 4. Export the workspace GID

```sh
export ASANA_WORKSPACE_GID=<gid>
```

Restart the host again.

## 5. Verify

Run `cyber-asana workspace get <gid>` with the chosen GID. A workspace record back means the token
and the workspace both resolve, and setup is done.

## Optional — MCP server

No MCP server is running. If the user wants the `asana_*` tools (for example in a client without a
shell), run the [`init-asana`](./skills/init-asana/SKILL.md) skill and accept its MCP step, which
writes the entry for their client. The default is no. See
[CLI vs MCP](https://cyberuni.github.io/cyber-asana/reference/cli-vs-mcp/) for the trade-off.

With the server enabled, `CYBER_ASANA_MCP_FORMAT=toon` in its environment makes every tool return
TOON instead of JSON, which costs fewer tokens for the same rows. The official Asana MCP can run
alongside it; see [`skills/init-asana/reference.md`](./skills/init-asana/reference.md).

## Where the rest lives

This file covers the credentials the plugin needs to work at all. The shipped skills cover the rest:

- [`init-asana`](./skills/init-asana/SKILL.md) — the same setup for someone using the CLI without
  the plugin, plus verification, the optional MCP step, and the dual-MCP layout.
- [`config-asana`](./skills/config-asana/SKILL.md) — add, remove, and refresh
  Asana projects and users in `.agents/cyber-asana.json` (or, with `--global`, a personal
  cross-repo registry) so skills can resolve them by name.
