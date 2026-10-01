# init-asana

Set up `cyber-asana` — personal access token, workspace GID, connection verify, and optional repo project registry.

## When to use

Use this skill when setting up `cyber-asana` for the first time or when commands fail with auth or workspace errors.

Good triggers include:

- "Set up Asana for this repo"
- "Configure ASANA_ACCESS_TOKEN"
- "Find my Asana workspace GID"
- First-time install of the cyber-asana CLI or plugin
- Enabling the cyber-asana MCP server

## What it does

The skill guides:

- Ensuring the `cyber-asana` CLI is available (`npx` or global install); pinning `npx cyber-asana@<exact>` to the latest npm version (`npm view cyber-asana version`) for this and all other cyber-asana skills
- Setting `ASANA_ACCESS_TOKEN` and verifying the connection
- Listing workspaces and setting `ASANA_WORKSPACE_GID`
- Optional pinned projects and users in `.agents/cyber-asana.json` (via [`config-asana`](../config-asana/README.md))
- Optional opt-in to the MCP server, written into the client's own config (default: no), and dual MCP setup with the official Asana server (see [reference.md](./reference.md))

## Install

```bash
npx skills add cyberuni/cyber-asana --skill init-asana
```
