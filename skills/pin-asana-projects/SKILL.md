---
name: pin-asana-projects
description: Use this skill when pinning repo Asana projects to `.agents/cyber-asana.json` via keyword search.
---

# Pin Asana Projects

## When to use

When the user wants to pin Asana projects to this repo — a commit-friendly name → GID map in `.agents/cyber-asana.json` for init, onboarding, or when the file is missing or stale.

Requires `ASANA_TOKEN` and `ASANA_WORKSPACE` (see **init-asana**).

## Instructions

### 1. Gather search keywords

Ask the user which projects belong in this repo. Derive one or more **keywords** from:

- Project names or fragments they mention
- Repo or package name (e.g. `cyber-asana`)
- Team or product names tied to the codebase

Use short, distinctive fragments — not full sentences.

### 2. Search for projects

For each keyword, search the workspace (requires `ASANA_WORKSPACE` or `--workspace-gid`):

```bash
cyber-asana project search "<keyword>" --json
# or, if using npx without global install:
npx cyber-asana@<version> project search "<keyword>" --json
```

Prefer active work when the user did not ask for archived projects:

```bash
cyber-asana project search "<keyword>" --no-completed --json
```

Parse the JSON `data` array for `{ gid, name }`. Deduplicate by `gid` across keyword searches.

If a keyword returns too many hits, tighten the query or add `--no-completed`. If too few, try a shorter fragment or a second keyword.

### 3. Confirm selections

Present the merged candidate list. Ask the user which projects to pin — do not add projects they did not confirm.

### 4. Pin to the repo config

Add each selected project (fetches the canonical name from Asana):

```bash
cyber-asana config add <project-gid>
```

Repeat for every confirmed project. The first `config add` creates `.agents/cyber-asana.json` when missing.

Verify:

```bash
cyber-asana config show --json
```

### 5. Finish

Tell the user to commit `.agents/cyber-asana.json`. Workspace GID stays in `ASANA_WORKSPACE` — not in this file.

After bulk renames in Asana, run `cyber-asana config sync`. For task creation with pinned projects, use **create-asana-task**.
