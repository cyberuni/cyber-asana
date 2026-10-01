---
"cyber-asana": minor
---

**Breaking:** task conventions (`task_name_format`, `description_template`, `default_tags`) now come only from the frontmatter of the `cyber-asana.task-conventions` reference, resolved the buddy-agent-harness way (repo `.agents/references/`, user `~/.agents/references/`, installed plugins, then the copy cyber-asana ships) and merged key by key. The `conventions` block in `.agents/cyber-asana.json` is no longer read: a config that still has one fails to load, and `config set`/`config show` no longer accept or print `conventions.*` keys.

Move an existing block with the new `cyber-asana config migrate-conventions` command. It writes the keys into the frontmatter of `.agents/references/cyber-asana.task-conventions.md` (created with `merge: merge-sections` when absent; an existing file only gains frontmatter keys, and a key it already sets is refused) and then drops the block. It honors `--json`, `--toon`, and `--dry-run`.
