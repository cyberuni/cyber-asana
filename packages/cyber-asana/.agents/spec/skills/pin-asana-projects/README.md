---
spec-type: reference
concept: [cyber-asana, skills, repo-registry, setup]
---

# pin-asana-projects — the registry-seeding skill

A **reference artifact**: the shipped skill at `packages/cyber-asana/skills/pin-asana-projects/`,
which fills a repository's committed project registry — or a caller's personal, uncommitted global
registry for that repo — by searching Asana for the projects this codebase actually works with.

## Subject

- **Artifact** — `skills/pin-asana-projects/SKILL.md`. No references directory.
- **Trigger** — someone wants this repository to know its Asana projects by name, the committed
  registry is missing or stale, or they want a project pinned personally without committing it.
  Its front block reads: *"Use this skill when pinning Asana projects to a repo's config, local or
  global, via keyword search."*
- **What it covers** — deriving short search keywords from the repository and the user's own words,
  searching the workspace once per keyword, deduplicating hits by GID, confirming the shortlist and
  the target registry (committed repo config, or the personal global one via `--global`) with the
  user, and writing the chosen entries.

**Its place in the catalog.** It is the second half of setup: [init-asana](../init-asana/README.md)
establishes the credential, this skill establishes the *names*. Everything downstream that resolves
a project by name rather than by GID — task creation, the reports — depends on it having been run.

**What it adopts.** The catalog contract in [skills](../README.md).

**What decides its behavior lives elsewhere.** The registry's schema, where the file is written, and
the rule that a workspace GID is never committed into it are [config](../../config/README.md)'s
contract; project search is [projects](../../projects/README.md)'. This skill composes both and
freezes neither.

**Recorded gap, not hidden.** The skill still names `ASANA_TOKEN` and `ASANA_WORKSPACE` as its
requirements. Both still resolve, but they are the **deprecated aliases** — the current names are
`ASANA_ACCESS_TOKEN` and `ASANA_WORKSPACE_GID`, which `src/env.ts` tries first. The skill lags the
rename rather than contradicting it; this is the same documentation-lag finding
[axi](../../axi/README.md) and [config](../../config/README.md) already record, reaching one more
file.
