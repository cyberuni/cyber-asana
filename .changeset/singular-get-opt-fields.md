---
"cyber-asana": minor
---

Every singular `get` command now accepts `--opt-fields`, and every `asana_<resource>_get` MCP tool accepts `opt_fields`. `user me` and `asana_user_me` accept them too. Use them to request fields that Asana leaves out of a single-resource read.

When you leave the option out, each `get` returns the same fields as before. `membership get` does not take the option, because Asana's endpoint has no `opt_fields`.
