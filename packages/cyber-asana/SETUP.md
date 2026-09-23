---
name: setup
description: Use this skill when finishing cyber-asana plugin setup — the token and workspace its MCP server needs.
---

# Setup — cyber-asana

Installing the plugin already registered the MCP server. What it still needs is an Asana credential
and a workspace to scope requests to. Both are read from the environment, so this is the one part
the plugin cannot do for the user.

## What the install already did

`mcp.json` registers a stdio server named `cyber-asana`, launched through `npx` from the published
package. It reads two variables from the environment:

| Variable | Purpose |
| --- | --- |
| `ASANA_ACCESS_TOKEN` | Personal access token; every request authenticates with it |
| `ASANA_WORKSPACE_GID` | Default workspace, so workspace-scoped tools need no argument |

There is no host MCP config to edit. Do not add a second `cyber-asana` entry by hand — see
**Running alongside the official Asana MCP** below for the case where two Asana servers are wanted.

## 1. Create a personal access token

Ask the user to open Asana → **Profile Settings** → **Apps** → **Personal access tokens**, create a
token, and copy it. Asana shows the value once.

## 2. Export the token where the host can see it

`mcp.json` passes the variables through by reference, so they must be set in the environment the
agent host inherits — the user's shell profile, not a project `.env` the host never reads.

```sh
export ASANA_ACCESS_TOKEN=<token>
```

Restart the agent host afterwards; an MCP server started before the export keeps the old
environment.

If a variable is unset, the host may forward the literal text `${ASANA_ACCESS_TOKEN}` instead of a
value. `cyber-asana` treats a value that is exactly an unexpanded reference as absent, so the
failure reports itself as a missing credential rather than as a rejected token.

## 3. Find the workspace GID

With the token in place, the MCP server can answer this itself — call `asana_workspace_list` and
read the `{ gid, name }` rows. Ask the user which workspace to use.

## 4. Export the workspace GID

```sh
export ASANA_WORKSPACE_GID=<gid>
```

Restart the host again.

## 5. Verify

Call `asana_workspace_get` with the chosen GID. A workspace record back means the token and the
workspace both resolve, and setup is done.

## Optional — token-efficient output

Setting `CYBER_ASANA_MCP_FORMAT=toon` in the same environment makes every tool return TOON instead
of JSON, which costs fewer tokens for the same rows.

## Optional — running alongside the official Asana MCP

Both servers can run together; their tool names do not collide. They authenticate differently — the
official server registers as an MCP app with a client ID and secret, while `cyber-asana` uses the
personal access token above. See
[`skills/init-asana/reference.md`](./skills/init-asana/reference.md).

## Where the rest lives

This file covers the credentials the plugin needs to work at all. The shipped skills cover the rest:

- [`init-asana`](./skills/init-asana/SKILL.md) — the same setup for someone using the CLI without
  the plugin, plus verification and the dual-MCP layout.
- [`manage-asana-registry`](./skills/manage-asana-registry/SKILL.md) — add, remove, and refresh
  Asana projects and users in `.agents/cyber-asana.json` (or, with `--global`, a personal
  cross-repo registry) so skills can resolve them by name.
