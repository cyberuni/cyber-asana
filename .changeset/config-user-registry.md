---
"cyber-asana": minor
---

Add a repo-local user registry to `config`: `config add-user <user-gid> --alias <alias>` fetches and stores a user's name and email, `config resolve-user` turns an alias, email, or name into a GID with no API call, and `config list-users` / `config remove-user` manage the entries. `config sync` now refreshes registered users too.
