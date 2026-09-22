---
"cyber-asana": minor
---

Add a global, cross-repo Asana project registry. Pass `--global` to `config show`, `list`, `path`, `resolve-project`, `add`, `remove`, or `sync` to read or write a personal registry outside any repo (default `$XDG_CONFIG_HOME/cyber-asana/config.json`, or `CYBER_ASANA_GLOBAL_CONFIG`), keyed by a normalized git remote URL (override with `--repo <key>`). Pass `--merged` to `show`, `list`, or `resolve-project` to union it with the repo config, with the repo config winning a `gid` conflict. Also exports `resolveRepoKey` and `loadEffectiveProjects` for skill scripts to resolve the same merged view in-process.
