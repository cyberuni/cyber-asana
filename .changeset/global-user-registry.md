---
"cyber-asana": minor
---

Mirror users into the global registry (`--global` on `add-user`, `resolve-user`, `remove-user`, `remove-alias`, and `list-users`), and add `--merged` to `resolve-user` / `list-users` to union them with the repo config. Unlike projects, global users are a flat list — not filed per repo — since a person's identity doesn't change with which repo you're in. `--assignee` on task create/update now falls back to the global registry when the repo config has no match (via the new `resolveEffectiveAssignee`/`resolveEffectiveUser` exports), trying the repo config to completion first so an alias that's unambiguous in each registry never becomes a false cross-scope collision.
