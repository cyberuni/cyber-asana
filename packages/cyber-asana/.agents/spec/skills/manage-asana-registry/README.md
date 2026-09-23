---
spec-type: reference
concept: [cyber-asana, skills, repo-registry, setup]
---

# manage-asana-registry — the registry management skill

A **reference artifact**: the shipped skill at `packages/cyber-asana/skills/manage-asana-registry/`
(renamed and broadened from `pin-asana-projects`, `git mv`-preserved), which adds, removes, refreshes,
and shows Asana **projects and users** in either the repo config or the personal global registry.

## Subject

- **Artifact** — `skills/manage-asana-registry/SKILL.md`. No references directory.
- **Trigger** — someone wants a project or a person added to, removed from, or refreshed in either
  registry; wants to see what's registered (including the merged view); or the committed registry
  is missing or stale. Its front block reads: *"Use this skill when adding, removing, or updating
  Asana projects or users in the repo or global registry."*
- **What it covers** — deriving short search keywords and confirming project candidates the same
  way the skill's predecessor did; finding a user by typeahead search; confirming the target
  registry (repo config vs. `--global`) with the user; and dispatching to the right `config` verb
  for add, remove, sync, or show, across both projects and users.

**Its place in the catalog.** It is the second half of setup: [init-asana](../init-asana/README.md)
establishes the credential, this skill establishes the *names* — and now also keeps them current
and lets them be pruned, not just seeded once. Everything downstream that resolves a project or a
person by name rather than by GID — task creation, the reports, `--assignee` — depends on it.

**Why the rename.** `pin-asana-projects` only ever added projects, via search, to the committed
file. Once the global registry and the user registry both grew `--global`/`--merged` support, a
skill named after "pinning projects" no longer matched what it needed to teach an agent to do —
remove, refresh, and manage users, in two registries, not just seed one list. The rename is a
pure `git mv`; the underlying capabilities it composes are unchanged and still frozen elsewhere.

**What it adopts.** The catalog contract in [skills](../README.md).

**What decides its behavior lives elsewhere.** The registries' schemas, where each file is written,
the rule that a workspace GID is never committed into either, the flat (not per-repo) shape of
global users, and the staged (not merged) resolution `--assignee` uses are all
[config](../../config/README.md)'s contract; project and user search (`project search`,
`add-user --search`) is [projects](../../projects/README.md)'s and the `search objects` command's.
This skill composes all of them and freezes none.
