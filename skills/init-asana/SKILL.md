---
name: init-asana
description: Use this skill when the user asks to set up, initialize, or configure cyber-asana or their Asana credentials. Guides through setting ASANA_TOKEN and ASANA_WORKSPACE, verifies the connection, and helps find the workspace GID.
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
3. Add to shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
export ASANA_TOKEN=your_token_here
```

Or pass per-command with `--token <pat>`.

### 3. Verify the connection and find workspace GID

```bash
cyber-asana workspaces list
```

If it fails, the token is invalid or not set. Fix credentials and retry.

The output lists workspaces with their GIDs. Ask the user which workspace to use.

### 4. Set ASANA_WORKSPACE

Add to shell profile:

```bash
export ASANA_WORKSPACE=<workspace-gid>
```

This avoids passing `--workspace` on every command.

### 5. Confirm setup

```bash
cyber-asana projects list
```

A successful project listing confirms everything is working.
