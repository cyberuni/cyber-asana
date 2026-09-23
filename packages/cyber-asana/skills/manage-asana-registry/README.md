# manage-asana-registry

Add, remove, refresh, and show Asana projects and users in the repo config
(`.agents/cyber-asana.json`) or the personal, uncommitted global registry (`--global`).

## When to use

Use this skill for any change to either registry — seeding it, pruning it, refreshing stale
names, or checking what's registered.

Good triggers include:

- "Pin our Asana projects for this repo"
- "Set up cyber-asana.json"
- "Register ali as an alias for Alice"
- "Remove that old project from the registry"
- "This repo's config is stale, refresh it"
- "Pin this project for me personally, don't commit it"
- "What does `--assignee ali` actually resolve to?"

## What it does

The skill guides:

- Collecting search keywords and finding projects with `cyber-asana project search "<keyword>"`,
  or finding a user by typeahead with `cyber-asana config add-user --search "<query>"`
- Confirming selections with the user, and which registry to write to (repo config vs. `--global`)
- Adding entries (`config add`, `config add-user`), removing them (`config remove`,
  `config remove-user`, `config remove-alias`), and refreshing drifted names (`config sync`) — all
  with a `--global` counterpart
- Verifying with `config show` / `config list-users` (`--global` or `--merged` for the personal or
  combined view)

## Install

```bash
npx skills add cyberuni/cyber-asana --skill manage-asana-registry
```

Requires `ASANA_ACCESS_TOKEN` and `ASANA_WORKSPACE_GID`. See [`init-asana`](../init-asana/README.md)
for setup.
