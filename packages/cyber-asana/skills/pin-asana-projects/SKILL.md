---
name: pin-asana-projects
description: Use this skill when pinning Asana projects to a repo's config, local or global, via keyword search.
argument-hint: [keyword...] [--global]
---

# Pin Asana Projects

## When to use

When the user wants to pin Asana projects to this repo — a commit-friendly name → GID map in `.agents/cyber-asana.json` for init, onboarding, or when the file is missing or stale.

Also use this when the user wants to pin a project **without committing it** — a personal setup,
a repo they don't control, or scratch work — or when they mention "global registry",
"cross-repo", or a repo with no `.agents/cyber-asana.json` yet. That's the same flow with `--global`
added to the `config` commands (see **Step 4a**), writing to a personal file outside the repo instead.

Requires `ASANA_TOKEN` and `ASANA_WORKSPACE` (see **init-asana**). When using npx, pin `<exact>` with `npm view cyber-asana version` (same rule as **init-asana**).

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
cyber-asana project search "<keyword>" --toon
# or, if using npx without global install:
npx cyber-asana@<exact> project search "<keyword>" --toon
```

Prefer active work when the user did not ask for archived projects:

```bash
cyber-asana project search "<keyword>" --no-completed --toon
```

Read the `{ gid, name }` rows from the output (`--toon` is token-efficient; use `--json` for raw JSON). Deduplicate by `gid` across keyword searches.

If a keyword returns too many hits, tighten the query or add `--no-completed`. If too few, try a shorter fragment or a second keyword.

### 3. Confirm selections

Present the merged candidate list. Ask the user which projects to pin — do not add projects they did not confirm. Also confirm **where** to pin them if it isn't already clear: the committed repo config (default), or the personal global registry (`--global`, Step 4a) when the user said "personal", "don't commit this", "global", or the repo has no `.agents/cyber-asana.json` and they'd rather not create one.

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

### 4a. Or pin to the personal global registry instead

Add `--global` to write to a personal registry file outside the repo
(`~/.config/cyber-asana/config.json` by default, or `$CYBER_ASANA_GLOBAL_CONFIG`) instead of the
committed one — nothing to commit, and it still applies wherever this repo is cloned:

```bash
cyber-asana config add <project-gid> --global
```

The repo is auto-detected from the git remote. Outside a git checkout, or to pin a repo you're not
currently in, pass `--repo <key>` (see `cyber-asana config path --global` to find the file, and
`cyber-asana config show --global` to verify).

If **both** a repo config and a global entry exist for this repo, `cyber-asana config show --merged`
prints the combined view (the committed entry wins a name conflict) — use it to check what a skill
script or agent will actually resolve.

### 5. Finish

Tell the user to commit `.agents/cyber-asana.json` (skip this for `--global` — nothing to commit). Workspace GID stays in `ASANA_WORKSPACE` — not in either file.

After bulk renames in Asana, run `cyber-asana config sync` (or `cyber-asana config sync --global`). For task creation with pinned projects, use **create-asana-task**.
