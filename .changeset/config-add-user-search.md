---
"cyber-asana": minor
---

`config add-user --search <query>` finds a user by name or email through Asana's typeahead search and registers them, so you no longer need the GID up front. It registers a single hit, or the one hit whose name or email matches exactly. Otherwise it lists the candidates and writes nothing.
