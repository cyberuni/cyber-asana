---
"cyber-asana": minor
---

Cover the remaining story and record API parameters. `story create` and `comment create` take `--reply-to <comment-gid>` (MCP `parent_comment_gid`) to reply in a thread; `story list`, `comment list` and `story list-goal` take `--created-after`, `--comments-only` and `--newest-first` (MCP `created_after`, `comments_only`, `sort_ascending`); `record create` takes `--default-access-level`; `record stories create` takes `--pin` and `--sticker`; and `record search` takes `--created-on`, `--created-on-after`, `--created-on-before`, `--followers-not` and `--tables-all`.
