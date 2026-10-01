---
title: Getting Started
description: Install and configure cyber-asana
---

## Installation

```bash
npm install -g cyber-asana
```

## Authentication

Set your [Asana personal access token](https://app.asana.com/0/my-apps):

```bash
export ASANA_ACCESS_TOKEN=<your-pat>
export ASANA_WORKSPACE_GID=<workspace-gid>   # optional default workspace
```

Or pass `--token <pat>` and `--workspace <gid>` per command.

To see which credential is actually in effect:

```bash
cyber-asana auth status
```

### Where to keep the token

:::caution
Do not paste that `export` into `~/.zshrc` or `~/.bashrc`. A personal access token never expires, shell profiles are created world-readable, and they are the files most likely to end up in a dotfiles repo or a screen share — exposing a permanent credential to your entire workspace.
:::

Keep the secret in its own restricted file and source it from your profile:

```bash
touch ~/.secrets && chmod 600 ~/.secrets
echo 'export ASANA_ACCESS_TOKEN=your_token_here' >> ~/.secrets
```

```bash
# in ~/.zshrc or ~/.bashrc
[[ -f ~/.secrets ]] && source ~/.secrets
```

Your profile now carries a path instead of a credential, so it stays safe to commit and share. Non-secrets like `ASANA_WORKSPACE_GID` can live in the profile — a workspace GID identifies, it does not authorize.

Better still, avoid the long-lived secret altogether. [OAuth](#oauth) stores a self-refreshing token in a `0600` file under `~/.config/cyber-asana`, so nothing sensitive touches your shell config. A password manager's CLI works too — `export ASANA_ACCESS_TOKEN=$(op read op://vault/asana/token)` keeps the value off disk entirely.

If a token has already been sitting in a shared or committed file, treat it as compromised and issue a new one from [Asana's My Apps page](https://app.asana.com/0/my-apps). Deleting the line does not revoke the token, and rewriting git history does not un-publish it.

### OAuth

A PAT is the simpler choice for a single user. OAuth is worth the setup when several people use the same install, or when you want a credential that refreshes itself.

cyber-asana uses **your own** Asana app, so no third-party registration ever sees your data. Create one at [app.asana.com/0/my-apps](https://app.asana.com/0/my-apps) — it must be an **API app**, not an **MCP app**, whose tokens only work with Asana's hosted MCP server. Then:

```bash
export ASANA_API_CLIENT_ID=<client-id>
export ASANA_API_CLIENT_SECRET=<client-secret>
cyber-asana auth login
```

`ASANA_CLIENT_ID` / `ASANA_CLIENT_SECRET` still work as a fallback, but the prefixed names let cyber-asana's API app coexist with an MCP app registered under Asana's documented names.

See the [full OAuth documentation](https://github.com/cyberuni/cyber-asana#oauth) for redirect URL options, token management, and logout.

## Quick Start

```bash
# Check your connection
cyber-asana auth status

# List your projects
cyber-asana project list

# List tasks in a project
cyber-asana task list --project <gid>

# Create a task
cyber-asana task create "Fix the bug" --workspace-gid <gid> --project-gid <gid>

# Start the MCP server (optional; MCP is opt-in)
cyber-asana mcp
```

## Next Steps

- [Install agent skills](/cyber-asana/skills/) for guided workflows
- [Opt in to MCP](/cyber-asana/mcp/) if your agent should use tools instead of the CLI ([why the CLI is the default](/cyber-asana/reference/cli-vs-mcp/))
- [Explore CLI commands](/cyber-asana/cli/) for scripting
