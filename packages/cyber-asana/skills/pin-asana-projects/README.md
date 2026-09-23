# pin-asana-projects

Pin Asana projects to `.agents/cyber-asana.json` (or a personal, uncommitted global registry)
using `project search` and keywords.

## When to use

Use this skill when a repo needs pinned Asana projects, or when updating which projects are mapped.

Good triggers include:

- "Pin our Asana projects for this repo"
- "Set up cyber-asana.json"
- "Find and pin the cyber-asana project"
- "Pin this project for me personally, don't commit it"

## What it does

The skill guides:

- Collecting search keywords from the user or repo context
- Finding projects with `cyber-asana project search "<keyword>"`
- Confirming selections with the user, and which registry to write to
- Pinning entries with `cyber-asana config add` (or `cyber-asana config add --global` for the
  personal, cross-machine registry)
- Verifying with `cyber-asana config show` (or `--global` / `--merged` to see the personal or
  combined view)

## Install

```bash
npx skills add cyberuni/cyber-asana --skill pin-asana-projects
```

Requires `ASANA_TOKEN` and `ASANA_WORKSPACE`. See [`init-asana`](../init-asana/README.md) for setup.
