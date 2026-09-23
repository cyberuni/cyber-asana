---
name: manage-asana-registry
description: Use this skill when adding, removing, or updating Asana projects or users in the repo or global registry.
argument-hint: [add|remove|sync|show] [project|user] [keyword...] [--global] [--merged]
---

# Manage Asana Registry

## When to use

Whenever the user wants to change or inspect what `.agents/cyber-asana.json` (committed, per-repo)
or the personal global registry (`--global`, uncommitted, cross-repo) knows about — projects or
users. That covers:

- **Add / pin** a project or a person, by search or by GID, to either registry.
- **Remove** a project, a user, or one of a user's aliases, from either registry.
- **Refresh** names that drifted since they were registered (`sync`).
- **Show / verify** what's registered — including the **merged** (repo config + global, combined)
  view a skill script or agent actually resolves against.

Good triggers: "pin our Asana projects", "register ali as an alias for Alice", "remove that old
project from the registry", "this repo's config is stale", "what does `--assignee ali` actually
resolve to", "I want this pinned personally, don't commit it", "set up cyber-asana.json".

Requires `ASANA_ACCESS_TOKEN` and `ASANA_WORKSPACE_GID` (see **init-asana**; the same skill covers
the deprecated `ASANA_TOKEN`/`ASANA_WORKSPACE` aliases). When using npx, pin `<exact>` with
`npm view cyber-asana version` (same rule as **init-asana**).

## Repo config vs. global registry

Two registries hold the same two kinds of entry — projects and users — but differently:

| | Repo config (`.agents/cyber-asana.json`) | Global registry (`--global`) |
|---|---|---|
| Where | Committed, inside the repo | `~/.config/cyber-asana/config.json` (or `$CYBER_ASANA_GLOBAL_CONFIG`), outside every repo |
| Scope | This repo only | Every repo, keyed by a normalized git remote (`--repo <key>` to override or work outside a checkout) |
| Projects | Listed under this repo | Filed per repo key — pass `--repo` to manage one you're not currently in |
| Users | Listed here | **Flat** — one personal list, no `--repo`, because identity doesn't change with the repo |
| Commit it? | Yes — that's the point | No — nothing to commit |

Default to the repo config unless the user says "personal", "don't commit this", "global",
"cross-repo", or the repo has no `.agents/cyber-asana.json` and they'd rather not create one.

`--merged` (on `show`, `list`, `resolve-project`, `resolve-user`, `list-users`) reads both and
unions them, the repo config winning a conflict — use it to check what a skill script or
`--assignee` will actually resolve to, without guessing which registry answered.

## Instructions

Figure out which of these the user wants, then follow that section. Confirm the **target
registry** (repo config vs. `--global`) whenever it isn't already clear — see the table above.

### A. Add / pin a project

1. **Gather keywords.** Derive one or more short, distinctive fragments from project names the
   user mentioned, the repo/package name, or team/product names tied to the codebase — not full
   sentences.
2. **Search.** For each keyword (requires `ASANA_WORKSPACE_GID` or `--workspace-gid`):

   ```bash
   cyber-asana project search "<keyword>" --toon
   cyber-asana project search "<keyword>" --no-completed --toon   # skip archived work
   ```

   Read the `{ gid, name }` rows (`--toon` is token-efficient; `--json` for raw JSON). Deduplicate
   by `gid` across keywords. Too many hits → tighten the query or add `--no-completed`. Too few →
   a shorter fragment or a second keyword.
3. **Confirm.** Present the merged candidate list and the target registry; don't add anything
   unconfirmed.
4. **Add** (fetches the canonical name from Asana; creates the file/entry if it doesn't exist yet):

   ```bash
   cyber-asana config add <project-gid>                    # repo config
   cyber-asana config add <project-gid> --global            # personal registry, this repo
   cyber-asana config add <project-gid> --global --repo <key>  # a repo you're not currently in
   ```
5. **Verify:** `cyber-asana config show --json` (or `--global`, or `--merged`).
6. If it was the repo config, tell the user to commit `.agents/cyber-asana.json`. `--global` has
   nothing to commit.

### B. Add / register a user

1. **Find the GID**, if not given: `cyber-asana config add-user --search "<query>" --alias <alias>`
   uses Asana's typeahead search — see **Finding a user** below for how ties are broken.
2. **Add** (fetches name and email from Asana; aliases accumulate on repeat calls):

   ```bash
   cyber-asana config add-user <user-gid> --alias <alias>            # repo config
   cyber-asana config add-user <user-gid> --global --alias <alias>   # personal registry (no --repo — flat)
   ```
3. **Verify:** `cyber-asana config resolve-user <alias> --json` (add `--global` or `--merged` to
   match).

#### Finding a user

Typeahead is fuzzy, so `add-user --search` only picks a match automatically when it's clear:

- A single hit is registered.
- Among several hits, one whose name or email equals the query exactly is registered.
- Otherwise nothing is written — the candidates are listed; re-run with the right GID. Searching
  by email is the most reliable way to land one exact hit.

### C. Remove a project

```bash
cyber-asana config remove <gid-or-name>                       # repo config
cyber-asana config remove <gid-or-name> --global --repo <key> # personal registry
```

### D. Remove a user or an alias

```bash
cyber-asana config remove-user <gid-alias-email-or-name>              # drop the whole user
cyber-asana config remove-alias <alias>[,<alias>...]                  # drop aliases, keep the user
```

Add `--global` to either for the personal registry (no `--repo` — flat, like all user verbs).
`remove-alias` fails without changing anything if an alias isn't registered.

### E. Refresh stale names

```bash
cyber-asana config sync            # repo config: projects and users
cyber-asana config sync --global   # personal registry: every repo's projects, and every user
cyber-asana config sync --global --repo <key>   # scope the *project* refresh to one repo (users always refresh)
```

Run this after a batch of renames in Asana. `add`, `add-user`, and `sync` are the only commands
that call Asana — everything else reads the file. `project get` / `asana_project_get` also
opportunistically refresh a registered project's cached name.

### F. Show / verify what's registered

```bash
cyber-asana config show               # repo config
cyber-asana config show --global      # personal registry, this repo (or --repo <key>)
cyber-asana config show --merged      # both, combined — what a skill script actually sees
cyber-asana config list-users [--global|--merged]
cyber-asana config path [--global]    # where the file lives
```

## Assigning by name

`task create`, `task update`, and `task subtask create` (`--assignee <value>`; MCP: `assignee`)
resolve a GID, `me`, or a query the same way `resolve-user` does — trying the repo config first,
falling back to the personal registry only on a clean miss, so an alias that's unambiguous in each
registry never becomes a false collision. A name matching nobody in either is an error naming both
`config add-user --search` and `config add-user --global` as the fix. `--assignee-gid` /
`assignee_gid` takes a GID as-is and wins when both are set.
