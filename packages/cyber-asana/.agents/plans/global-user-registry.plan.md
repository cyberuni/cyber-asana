---
cr: global-user-registry
project-path: packages/cyber-asana
status: active
todos:
  - content: Extend config/README.md + config.feature (additive) for global users and merged assignee resolution
    status: completed
  - content: Export parseUserEntry from repo-config.ts; add users to GlobalConfig + CRUD in global-config.ts
    status: completed
  - content: Add mergeUserEntries/loadEffectiveUsers/resolveEffectiveUser and resolveEffectiveAssignee to effective-config.ts
    status: completed
  - content: Wire --global/--merged onto add-user/resolve-user/remove-user/remove-alias/list-users; extend sync --global for users
    status: completed
  - content: Switch tasks/cli.ts + tasks/mcp.ts --assignee resolution to resolveEffectiveAssignee
    status: completed
  - content: pnpm verify, commit
    status: completed
---

# global-user-registry — mirror users into the global registry, merge assignee resolution

Follow-up from `global-config-registry`: the global registry was scoped to projects only. The user
now wants add/remove/update for **users** too, in both repo and global scope, closing that recorded
gap — and a rename of `pin-asana-projects` into a broader skill (tracked separately as its own
unit, since it's a different domain/concern).

## Decisions (from user grill)

- **Mirror users into the global registry**: yes.
- **Shape**: unlike projects (repo-scoped by nature — different repos work with different Asana
  projects), a user alias identifies the *same person* regardless of which repo you're in. So
  global users are a **flat, top-level `users` list** on the global file (`{ schema_version, repos,
  users? }`), not nested per repo the way projects are. This is my call, not asked verbatim, but
  follows directly from what an alias means; flagged here for visibility.
- **Update semantics**: nothing new — `add-user` already updates on a GID match, `sync` already
  refreshes from Asana. No new manual-edit capability needed.
- **`--assignee <alias>` on task create/update** currently resolves local-only
  (`resolveAssignee` in `repo-config.ts`, undocumented in config.feature — spec debt, not frozen
  behavior). Since global users now exist, add a **new**, additive `resolveEffectiveAssignee` in
  `effective-config.ts` (local first, global fallback) and switch `tasks/cli.ts`/`tasks/mcp.ts` to
  it, leaving the original `resolveAssignee` untouched (no breaking change to that export).

## NEXT

Landed. Global users are a flat top-level `users[]` on the global file (`global-config.ts`,
delegating to `repo-config.ts`'s own add/remove/resolve/observe user logic via a synthetic
wrapped config, so matching rules never drift). `effective-config.ts` gained `loadEffectiveUsers`
(merged listing, union by gid) and `resolveEffectiveUser`/`resolveEffectiveAssignee` (staged:
repo config tried to completion first, global only on a clean miss). `config-cli.ts`'s
`add-user`/`resolve-user`/`remove-user`/`remove-alias`/`list-users` gained `--global` (no `--repo`
— users aren't repo-scoped); `resolve-user`/`list-users` also gained `--merged`. `sync --global`
now also refreshes global users, unaffected by `--repo` (which still scopes projects only).
`tasks/cli.ts` and `tasks/mcp.ts` switched `--assignee` resolution to `resolveEffectiveAssignee`;
the original repo-config-only `resolveAssignee` is untouched (no breaking change). A real bug
(global lookup wrongly gated behind repo-key resolvability) was caught by the spec-judge review and fixed with a regression test. Spec and docs
(`apps/web/.../cli/repo-config.md`) updated; `pnpm verify` green (1424 tests, build, knip). A
changeset and the commit are the only remaining steps. No other follow-ups identified. Next unit:
the `pin-asana-projects` skill rename/rescope (different domain, tracked separately, not started).
