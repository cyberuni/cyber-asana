# init-asana

Set up `cyber-asana` — personal access token, workspace GID, connection verify, and optional repo project registry.

## When to use

Use this skill when setting up `cyber-asana` for the first time or when commands fail with auth or workspace errors.

Good triggers include:

- "Set up Asana for this repo"
- "Configure ASANA_TOKEN"
- "Find my Asana workspace GID"
- First-time install of cyber-asana CLI or MCP

## What it does

The skill guides:

- Ensuring the `cyber-asana` CLI is available (`npx` or global install)
- Setting `ASANA_TOKEN` and verifying the connection
- Listing workspaces and setting `ASANA_WORKSPACE`
- Optional `.agents/cyber-asana.json` project registry
- Optional dual MCP setup with the official Asana server (see [reference.md](./reference.md))

## Install

```bash
npx skills add cyberuni/cyber-asana --skill init-asana
```
