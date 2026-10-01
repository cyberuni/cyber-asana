---
spec-type: reference
concept: [cyber-asana, skills, setup, environment]
---

# init-asana — the first-run skill

A **reference artifact**: the shipped skill at `packages/cyber-asana/skills/init-asana/`, which
walks an agent through getting `cyber-asana` working for the first time.

## Subject

- **Artifact** — `skills/init-asana/SKILL.md`, with `reference.md` for the per-client MCP config.
- **Trigger** — a first-time setup, or any command failing on authentication or a missing
  workspace. Its front block reads: *"Use this skill when setting up cyber-asana — PAT, workspace
  GID, connection verify, optional registry."*
- **What it covers** — resolving and pinning the CLI version before running anything, checking
  whether a token and workspace are already set, guiding the user through creating a personal
  access token, verifying the connection, offering to seed the repo project registry, and
  offering the MCP server as an opt-in (default no) written into the detected client's own config.

**Its place in the catalog.** This skill is the **entry point of the whole plugin**: the universal
manifest names it as the first-run skill, and the other eight assume the credentials it establishes.
It is also where the **version-pinning rule** the catalog contract enforces is *explained* rather
than merely obeyed — it tells the agent to resolve the exact published version once with
`npm view cyber-asana version` and reuse it everywhere, and says in so many words never to use
`@latest` and never to leave a literal placeholder. Several sibling skills point back here for that
rule instead of restating it.

**What it adopts.** The catalog contract in [skills](../README.md) — front block, description
budget, pinned invocations, listing in both published tables. It re-specifies none of them.

**What decides its behavior lives elsewhere.** Where a token and a workspace GID actually come from,
and in what order, is [config](../../config/README.md)'s contract; this skill teaches it and does
not define it. Whether an agent facing a broken setup engages this skill, and whether it follows the
steps in order, is agent behavior — measured by ACED, not frozen here (see
[skills](../README.md), *What this node does not own*).
