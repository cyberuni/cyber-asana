---
name: init
description: Use this skill when initializing or improving an AGENTS.md file with codebase documentation for AI coding assistants.
metadata:
  internal: true
---

Analyze this codebase and create or improve an AGENTS.md file, then symlink CLAUDE.md to it.

## AGENTS.md structure

Prefix the file with:

```markdown
# AGENTS.md

This file provides guidance to AI coding assistants when working with code in this repository.
```

Then add sections in this order:

1. **Skill Augmentations** — always first. Use this exact content:

```markdown
## Skill Augmentations

When reading any `SKILL.md` file, always check whether a `SKILL.local.md` exists in the same directory. If it does, treat its contents as additional instructions that extend the base skill. Local augmentations take precedence over the base skill where they conflict.
```

2. **Commands** — commonly used for building, linting, and running tests, including how to run a single test.
3. **Architecture** — high-level structure that requires reading multiple files to understand. Focus on the big picture, not file listings.
4. **Discipline sections** (when present, e.g. `## Commit Discipline`) — agent-first: dense normative rules in the body, `### References` at section bottom for commit-helper skills and `governance show` pointers. Load `governance show skill-repo-structure` for the Discipline sections rules.
5. Other sections only when grounded in existing project files (see usage notes below).

## Usage notes

- If there's already an AGENTS.md, compare each section you would add against what is already there. When content differs — not just missing, but substantively different — ask the user whether to update that section before changing it. Do not overwrite existing sections silently.
- If sections are missing entirely, add them without asking.
- Avoid listing every component or file structure that can be easily discovered.
- Do not make up sections like "Common Development Tasks" or "Tips for Development" unless that content appears in existing project files.
- If there are Cursor rules (in `.cursor/rules/` or `.cursorrules`) or Copilot rules (in `.github/copilot-instructions.md`), include the important parts.
- If there is a README.md, include the important parts.

## Ensure cyber-skills package

Check in order:

1. **Pinned npx (default)** — resolve `npm view cyber-skills version`, then `npx cyber-skills@<exact> <subcommand>` (never `@latest`, never a literal `<version>` placeholder). No `package.json` change.
2. **Existing devDependency** — if `cyber-skills` is already in `package.json`, use `pnpm exec cyber-skills` or the local bin.
3. **Optional devDependency** — when the user needs offline CLI access and the AI agent runs locally against that repo: `pnpm add -D cyber-skills`.
4. If neither npx nor a local install works, ask the user to confirm an exact pinned version or opt in to the devDependency above.

## Repo-internal skills

After writing AGENTS.md, repair repo-private skills with the CLI — do not read each `SKILL.md` under `.agents/skills/` manually.

Run `skill repair-private` using the CLI resolved above. Use `skill validate-private` to check without writing.

This sets `metadata: internal: true` on repo-private skills and removes erroneous symlinks into `skills/`.

**Ongoing rule:** When writing or editing any `SKILL.md` under `.agents/skills/`, always include `metadata: internal: true` in the frontmatter.

## CLAUDE.md symlink

Symlink `CLAUDE.md` → `AGENTS.md`; if `CLAUDE.md` is a regular file, merge it into `AGENTS.md` first.

## Follow-up init skills

After init completes, discover companion `init-*` skills with `npx cyber-skills@<version> skill list --grep 'init-*'`.

List any found skills with a one-line summary from each skill's description. Ask the user whether they also want to run any of them.
