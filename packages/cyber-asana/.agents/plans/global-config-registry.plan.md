---
cr: global-config-registry
project-path: packages/cyber-asana
status: active
todos:
  - content: Extend config/README.md with the global registry + merge semantics
    status: completed
  - content: Add additive scenarios to config.feature for the global registry and --merged view
    status: completed
  - content: Implement src/global-config.ts (schema, path resolution, git-remote repo key, CRUD, merge)
    status: completed
  - content: Extend config-cli.ts with --global/--repo/--merged on the existing verbs
    status: completed
  - content: Wire global config into composition.ts if needed and update docs/readme
    status: completed
  - content: pnpm verify, commit per unit
    status: completed
---

# global-config-registry — a personal, cross-repo project registry

`.agents/cyber-asana.json` pairs one repo with its Asana projects, but it is committed and
per-repo: a repo without one (or one you haven't set up yet) gives every skill script nothing to
read. This CR adds a **global** registry — one file outside any repo, pairing a repo identity
(normalized git remote URL) with its Asana project(s) — and a **merged/effective** view that unions
it with the local repo config (local wins on name conflicts for the same GID), exposed through both
the CLI (`--global`, `--repo`, `--merged` on the existing `config` verbs) and the API, so a skill
script can resolve "what Asana projects apply here" without shelling out.

## Decisions (from user grill)

- **Repo key**: normalized git remote `origin` URL (e.g. `github.com/org/repo`), not an absolute
  path — portable across clones/machines. Falls back to the git root's absolute path when there is
  no remote.
- **CLI shape**: reuse the existing `config` verbs with new flags (`--global`, `--repo`, `--merged`)
  rather than a new `config global` subcommand group — every existing scenario in the frozen
  `config.feature` stays untouched (additive only).
- **Merge precedence**: on a GID registered in both scopes with different names, the local
  (repo-committed) name wins — matches the existing "explicit beats ambient" precedence already used
  for `--token`/`--workspace-gid`.
- **Scope**: projects only, matching the literal ask. No workspace GID or token in the global file
  either (same non-goal as decision 0001, restated for the new file) — mirroring local scope, not a
  scan of every possible field. Users/aliases are not mirrored globally (follow-up if requested).

## NEXT

Landed. `src/global-config.ts` (registry + repo-key derivation) and `src/effective-config.ts`
(merge) are new; `src/config-cli.ts` gained `--global`/`--repo`/`--merged` on `show`, `list`,
`path`, `resolve-project`, `add`, `remove`, `sync`; `src/repo-config.ts` had `parseProjectEntries`
and `pathExists` factored out for reuse (no behavior change). `composition.ts` needed no change —
`configCommand`'s existing wiring covers the new flags. Spec (`config/README.md` +
`config.feature`) and docs (`apps/web/.../cli/repo-config.md`) updated. `pnpm verify` green
(1387 tests, build, knip). No remaining follow-ups identified.
