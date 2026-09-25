---
spec-type: behavioral
concept: [cyber-asana, config, repo-registry, environment, precedence]
---

# config — where cyber-asana's settings come from

## What

Every `cyber-asana` invocation needs two things the command line rarely carries: a **credential** to
talk to Asana, and, for anything workspace-scoped, a **workspace GID**. Many invocations also want a
third: the GID of a project the repository works with every day. Typing all three on every call is
friction; hard-coding them into commands is worse.

This node is the answer to *where does a value come from*. It has two halves.

The first half is the **repo config** — a small JSON file, `.agents/cyber-asana.json`, committed
alongside the code. It maps human project names to Asana project GIDs, so an agent can turn a name
into a GID without searching the workspace first. The `cyber-asana config` verbs create, read, and
maintain it. A project entry also carries `aliases` (trigger keywords resolved ahead of the display
name), an optional `purpose` (one line saying what belongs there), and an optional `default: true`
marking the project commands fall back to when none is given — at most one project. Two optional
top-level blocks round the file out: `defaults` (an `assignee` and a `section` a command falls back
to when not told one) and `conventions` (a `task_name_format`, a `description_template`, and
`default_tags`, so an agent writes a task the way this repo writes one). This is `schema_version: 2`;
a `schema_version: 1` file (project entries with only `gid` and `name`) still parses and is upgraded
in place the next time the CLI writes the file.

The second half is **resolution precedence** — the order in which a value is looked for. An explicit
input always wins; the environment is consulted only when nothing was passed; and each environment
name has an older alias behind it, tried in a fixed order. The order is the whole contract: get it
wrong and a caller who typed a flag silently gets the machine's ambient setting instead.

A third piece extends the first half rather than replacing it: the **global registry**, one file
outside any repository (`--global` on the same verbs) that pairs a **repo key** — a normalized git
remote URL, so the same entry applies wherever that repo is cloned — with its own `{ gid, name }`
project list. It exists because the committed repo config is per-repo and optional: a repository
that has none, or hasn't been set up yet, still needs a way for an agent to know which Asana
projects it works with. The **merged (effective) view** (`--merged`) is the two files read together:
the repo config's entries plus the global registry's entries for the current repo, unioned by GID,
with the repo config's name winning a conflict — the same "explicit beats ambient" shape the
environment precedence already uses, with the committed file playing explicit and the personal
global file playing ambient.

The global registry also mirrors the repo config's **user registry** (`add-user` / `resolve-user` /
`remove-user` / `remove-alias` / `list-users`, all take `--global`) — but not shaped the same way as
projects. A project is inherently tied to one repository; a person is not, so global users are one
flat list on the global file, not filed per repo key the way projects are. That difference is also
why resolving a user is **staged, not merged**: `--assignee <value>` on task create/update
(`resolveEffectiveAssignee`) tries the repo config's own registry to completion first — including
raising *its own* ambiguous-match error if it has one — and only opens the global registry when the
repo config found nothing, so the same alias registered to two different people in the two scopes
never manufactures a cross-scope ambiguity that neither registry actually has on its own. `--merged`
on `resolve-user` / `list-users`, by contrast, is a **listing** view and does union the two (the
repo config's entry winning a `gid` collision, same as projects) — because showing everything that
resolves here is exactly the point of a merged listing, while resolving one value for `--assignee`
is not.

The one thing that never appears in the committed file is the **workspace GID**. That is
[design decision 0001](../design/decisions/0001-no-workspace-gid-in-repo-config.md), and the reason
is security, not tidiness. A committed file is world-readable to everyone who can read the git
history, forever. A project GID is already shared casually — it sits in every Asana task URL people
paste into chat. A workspace GID is different: it names the whole organization, so publishing it
widens the blast radius if a token ever leaks, handing an attacker the one identifier they need to
enumerate and abuse the org. Workspace binding therefore stays in private environment configuration
(`ASANA_WORKSPACE`) or in the individual request — a parsed URL, an explicit flag.

**Key terms**

- **GID** — Asana's global id for an object; an opaque digit string, never parsed and never
  arithmetic.
- **Repo config** — the committed file `.agents/cyber-asana.json`, holding `schema_version`,
  `projects`, an optional `users`, and the optional `defaults` and `conventions` blocks.
- **Registry entry** — one project inside `projects`: `gid`, `name`, `aliases`, an optional
  `purpose`, and an optional `default: true`.
- **Alias** — an older environment variable name still honored behind the current one.
- **Precedence** — the fixed order in which candidate sources for one value are tried; the first
  non-empty one wins and the rest are never consulted.
- **Git root** — the nearest directory at or above the working directory that contains `.git`. It
  bounds the upward search for the config file.
- **Global registry** — the file `<config dir>/cyber-asana/config.json` (`$XDG_CONFIG_HOME` if set,
  else `~/.config`; `CYBER_ASANA_GLOBAL_CONFIG` overrides), holding `schema_version` and a `repos`
  list. Lives outside every repository, so it is never committed and never shared by cloning.
- **Repo key** — the identity a global-registry entry is filed under: the normalized `origin` remote
  URL (`github.com/org/repo`, scheme and `.git` suffix stripped, lowercased) when the current
  directory sits inside a git repo with a remote, else that repo's git-root absolute path, else
  nothing — at which point a caller must pass `--repo` explicitly.
- **Effective (merged) view** — the repo config's projects and the global registry's projects for
  the current repo key, unioned by `gid`; the repo config's entry wins when both name the same `gid`
  differently. Requested with `--merged`; never the default, so every existing verb's behavior is
  unchanged when it is omitted.
- **Global user registry** — the optional top-level `users` list on the global file, same shape as
  the repo config's `users` (`{ gid, name, email?, aliases }`). Flat, not filed per repo key, because
  a person's identity doesn't change with which repo you're in.
- **Staged resolution** (users) — try the repo config's registry to completion first; only consult
  the global registry if the repo config found no match at all. Used by `--assignee` resolution.
  Contrast with the **union** used by `--merged` on `resolve-user` / `list-users`, which is a listing
  view, not a single-value resolution.

**Non-goals.** The repo config is **not** a settings file. It stores no token, no workspace GID, no
default output format, no per-user preference. Two separate reasons: a secret must never be
committed, and a workspace GID must not be published, for the blast-radius reason above. Anything
private is an environment variable or a flag, which live outside the repository and outside this
file's schema. Nor is the registry a **cache of Asana**: it holds only a name and a GID, never a
project's fields, so it can never serve a stale answer to a question it was not asked. And it is
**not authoritative** — a name that is not registered is an error the caller handles, not a signal
to go search Asana; searching is [projects](../projects/README.md)' job. **The global registry
inherits every one of these non-goals** — it is not private-config-outside-git-so-anything-goes; it
stores the same shapes the repo config stores (`{ gid, name }` projects, `{ gid, name, email?,
aliases }` users) and nothing else, for the same reasons, restated rather than relaxed because the
file happens to live outside a repository this time.

**What this node does not own.** The `--json` / `--toon` output formats, the `0 results` empty
state, exit-code mapping, and error rendering are the shared contract in [axi](../axi/README.md),
adopted here rather than re-decided. This node owns the config file's schema, where that file is
found, what may be written into it, and the order in which a value's sources are tried.

## Use Cases

**Subject** — the repo project registry, the global registry, the merged view of the two, and the
resolution of configured values, over the `cyber-asana config` CLI verbs and the functions the other
domains — and skill scripts — call in-process. There is **no MCP surface**: every config verb either
reads the developer's filesystem or writes a file on their machine (inside their repository, or in
their home directory for `--global`), and an MCP client is typically a remote agent with no business
doing either. The values the config *produces* reach MCP anyway — the server process reads the same
environment, and `loadEffectiveProjects` is a plain function any in-process caller (including an MCP
tool handler in another domain) can call — so exposing the verbs themselves would add write
authority without adding reach.

| Entry point | Trigger | Inputs | Outcome |
|---|---|---|---|
| `config path` (CLI) | operator wants to know which file the other verbs will use | optional `--config <path>` | the resolved path, or an empty line when none is found |
| `config show` (CLI) | operator or agent wants the registered projects | optional `--config <path>` | the path plus a GID/Name row per entry |
| `config list` (CLI) | the same, under the name an agent guesses first | optional `--config <path>` | identical to `show` |
| `config resolve-project <name>` (CLI) | a caller holds a project name or alias and needs its GID before calling the API | the name or alias, positionally | the matching entry's name and GID, with no Asana request |
| `config add <project-gid>` (CLI) | a repository starts working with a new Asana project | the project GID, positionally, plus optional `--alias`, `--purpose`, `--default` | the project's current name fetched from Asana, and the entry written to the file with any given aliases, purpose, and default marker |
| `config set-default [gid-name-or-alias]` (CLI) | a repository wants a fallback project for commands that were not told one | a GID, name, or alias, or `--none` | the default marker moved onto that project and cleared everywhere else, or cleared entirely |
| `config remove-project-alias <alias...>` (CLI) | an alias no longer applies | one or more aliases, comma-separated or repeated | the alias dropped from whichever project owns it |
| `config remove <gid-or-name>` (CLI) | a project is no longer relevant to the repository | a GID or a name, positionally | the entry dropped and the file rewritten |
| `config sync` (CLI) | projects were renamed in Asana and the committed names have drifted | optional `--config <path>` | every registered name refreshed from Asana, written only if something changed |
| `config set <key> <value>` (CLI) | a repository wants a fallback or a house-style convention recorded | a dotted key (`defaults.assignee`, `defaults.section`, `conventions.task_name_format`, `conventions.description_template`, `conventions.default_tags`) and a value | the block updated and the file rewritten; `conventions.default_tags` splits its value on commas |
| `config unset <key>` (CLI) | a fallback or convention no longer applies | a dotted key | the key cleared, and the block dropped once it holds nothing |
| `config path --global` (CLI) | operator wants to know where the global registry lives | none | the resolved global file path (default location or `CYBER_ASANA_GLOBAL_CONFIG`) |
| `config show --global` / `config list --global` (CLI) | operator or agent wants the projects paired with a repo in the personal registry | optional `--repo <key>` (else auto-detected) | the global path, the resolved repo key, and a GID/Name row per entry for that repo |
| `config resolve-project <name> --global` (CLI) | a caller wants a name resolved from the personal registry only | the name; optional `--repo <key>` | the matching global entry, with no Asana request |
| `config add <project-gid> --global` (CLI) | a project should be remembered for this repo across every clone/machine, without committing it | the project GID; optional `--repo <key>` | the project's name fetched from Asana, written into that repo's entry in the global file |
| `config remove <gid-or-name> --global` (CLI) | a project no longer belongs in the personal registry for a repo | a GID or a name; optional `--repo <key>` | the entry dropped from that repo's global entry |
| `config sync --global` (CLI) | projects were renamed in Asana since they were pinned globally | optional `--repo <key>` (else every repo in the file); also refreshes every global user regardless of `--repo` | every matching registered project and user name refreshed from Asana |
| `config show --merged` / `config list --merged` (CLI) | an agent wants "every project that applies here," repo config and personal registry combined | optional `--config <path>`; optional `--repo <key>` for the global side | both source paths, the repo key used for the global side (or none, if unresolvable), and the unioned GID/Name rows |
| `config resolve-project <name> --merged` (CLI) | a caller wants a name resolved against the combined view, with no API call | the name; optional `--repo <key>` | the matching entry from either source, repo config winning a `gid` collision |
| `config add-user <user-gid> --global` (CLI) | a person should be resolvable by alias personally, across every repo, without committing it | the user GID or `--search <query>`; `--alias <alias>...` | the user's name and email fetched from Asana, written into the global file's flat `users` list |
| `config resolve-user <query> --global` (CLI) | a caller wants an alias/email/name resolved from the personal registry only | the query | the matching global user, with no Asana request |
| `config resolve-user <query> --merged` (CLI) | a caller wants an alias resolved locally first, falling back to the personal registry | the query | the repo config's own match if it has one; otherwise the global registry's own match; never a cross-scope ambiguity |
| `config remove-user <query> --global` / `config remove-alias <alias> --global` (CLI) | a personally-registered user or alias is no longer wanted | a GID/alias/email/name, or one or more aliases | the user or alias dropped from the global file |
| `config list-users --global` / `config list-users --merged` (CLI) | operator wants the personal user registry, or the combined view | none | the global path and its users; or both source paths and the unioned users |
| `resolveConfigPath` / `findConfigFile` (exported) | any caller needs the config file's location | a starting directory and an optional explicit path | the path, or nothing |
| `resolveProject(config, query)` (exported) | a caller has the parsed config and a name or GID | the config and the query | the matching entry, or nothing |
| `observeProjectIfConfigured(observation)` (exported) | another domain just fetched a project and saw its current name | the GID and name observed | the registered name refreshed in place if that GID is registered |
| `envValue(name)` (exported) | any caller needs a configured value from the environment | the current variable name | the first non-empty value among that name's aliases |
| `resolveRepoKey(startDir)` (exported) | a caller needs the current repo's global-registry key | a starting directory | the normalized remote URL, the git-root path fallback, or nothing |
| `loadEffectiveProjects(opts)` (exported) | a skill script needs "every project that applies here" without shelling out to the CLI | an optional explicit repo config path, global config path, repo key, and starting directory | `{ localPath, globalPath, repo, projects }` — the same union `config show --merged` prints |
| `loadEffectiveUsers(opts)` (exported) | a skill script needs every registered user, repo config and personal registry combined | an optional explicit repo config path and starting directory | `{ localPath, globalPath, users }` — the same union `config list-users --merged` prints |
| `resolveEffectiveUser(query, opts)` (exported) | a caller needs one user resolved, repo config first, then the personal registry | the query and the same options as `loadEffectiveUsers`, plus an optional `--repo` for the global side | the repo config's own match, else the global registry's own match, else nothing — staged, never merged |
| `resolveEffectiveAssignee(value, opts)` (exported) | `--assignee` on task create/update needs a GID | a GID, `me`, or a query for `resolveEffectiveUser` | the value verbatim (GID/`me`), or the staged match's GID, or a thrown error naming both `config add-user` and `config add-user --global` |

## Logic

```mermaid
graph TD
  subgraph locate["locating the config file"]
    P0[a verb needs the config file] --> P1{--config given?}
    P1 -->|yes| PABS[resolve it — absolute as-is,<br/>relative against the working directory]
    P1 -->|no| P2{CYBER_ASANA_CONFIG set?}
    P2 -->|yes| PABS
    P2 -->|no| P3{a read, or a write?}
    P3 -->|read| P4[walk up from the working directory]
    P4 --> P5{.agents/cyber-asana.json here?}
    P5 -->|yes| PHIT[that file]
    P5 -->|no| P6{.git here?}
    P6 -->|yes| PNONE[no config file]
    P6 -->|no| P7{at the filesystem root?}
    P7 -->|yes| PNONE
    P7 -->|no| P4
    P3 -->|write| P8[walk up looking for .git]
    P8 --> PROOT[git root + .agents/cyber-asana.json]
  end

  subgraph read["reading the registry"]
    R0[show / list / resolve-project / sync] --> R1{a path was found?}
    R1 -->|no| RERR[error: Repo config not found]
    R1 -->|yes| R2{schema_version is 1 or 2, and every entry<br/>has a non-empty gid and name?}
    R2 -->|no| RBAD[error naming the offending field]
    R2 -->|yes| R3[keep gid, name, aliases, purpose, default,<br/>plus defaults and conventions if present —<br/>an unknown key in defaults/conventions errors by name]
  end

  subgraph write["writing the registry"]
    W0[add / remove / sync] --> W1{the file exists?}
    W1 -->|no, add| WEMPTY[start from an empty registry]
    W1 -->|no, sync| WERR[error: Repo config not found]
    W1 -->|yes| W2[apply the change]
    WEMPTY --> W2
    W2 --> W3{anything changed?}
    W3 -->|no| WSKIP[leave the file alone]
    W3 -->|yes| WOUT[write schema_version 2 + projects,<br/>plus users, defaults, and conventions when present]
  end

  subgraph env["resolving a configured value"]
    E0[a value is needed] --> E1{given explicitly —<br/>--token, --workspace-gid?}
    E1 -->|yes| EWIN[use it]
    E1 -->|no| E2{newer alias set and non-empty?<br/>ASANA_ACCESS_TOKEN / ASANA_WORKSPACE_GID}
    E2 -->|yes| EWIN
    E2 -->|no| E3{older name set and non-empty?<br/>ASANA_TOKEN / ASANA_WORKSPACE}
    E3 -->|yes| EWIN
    E3 -->|no| ENONE[nothing — the caller raises its own error]
  end

  subgraph repokey["deriving the global-registry repo key"]
    K0[--global or --merged needs a repo key] --> K1{--repo given?}
    K1 -->|yes| KWIN[use it verbatim]
    K1 -->|no| K2[walk up looking for .git]
    K2 --> K3{.git found?}
    K3 -->|no| KNONE[no key — --global/--merged<br/>error naming --repo]
    K3 -->|yes| K4{a remote named origin<br/>is configured?}
    K4 -->|yes| K5[normalize the url —<br/>strip scheme/user, ':'→'/', trailing .git, lowercase]
    K5 --> KWIN
    K4 -->|no| K6[fall back to the git root's absolute path]
    K6 --> KWIN
  end

  subgraph global["reading / writing the global registry"]
    G0[show / resolve-project / add / remove / sync --global] --> G1{the global file exists?}
    G1 -->|no, add| GEMPTY[start from an empty registry]
    G1 -->|no, anything else| GERR[error: Global config not found]
    G1 -->|yes| G2[find the repos[] entry<br/>whose repo equals the derived key]
    G2 --> G3{add, and no entry yet?}
    G3 -->|yes| G4[append a new repos[] entry]
    G3 -->|no| G5[operate on the matched entry's projects —<br/>an unmatched repo reads as zero projects]
    G4 --> G5
  end

  subgraph merged["the merged (effective) view"]
    M0[show / list / resolve-project --merged] --> M1[load the repo config, if any path is found]
    M1 --> M2{--repo given, or a repo key<br/>derivable — same rules as --global?}
    M2 -->|yes| M3[load that repo's global entry, if any]
    M2 -->|no| M3B[global side contributes nothing —<br/>not an error, unlike --global alone]
    M3 --> M4{neither source produced anything?}
    M3B --> M4
    M4 -->|yes| MERR[error: no repo or global config found]
    M4 -->|no| M5[union by gid — a repo-config entry<br/>always wins a gid also present globally]
  end

  subgraph globalusers["reading / writing the global user registry"]
    U0[add-user / resolve-user / remove-user /<br/>remove-alias / list-users --global] --> U1{the global file exists?}
    U1 -->|no, add-user| UEMPTY[start from an empty registry]
    U1 -->|no, anything else| UERR[error: Global config not found]
    U1 -->|yes| U2[operate on the flat top-level users[] —<br/>no repo key involved at all]
  end

  subgraph staged["staged user resolution (--assignee)"]
    S0[resolveEffectiveAssignee / resolveEffectiveUser] --> S1{a numeric gid, or 'me'?}
    S1 -->|yes| SWIN[use it verbatim]
    S1 -->|no| S2{a repo config found?}
    S2 -->|yes| S3[resolveUser against it in full —<br/>its own ambiguous-match error still applies]
    S3 -->|match| SWIN
    S3 -->|no match, or no repo config| S4{a global file, and a repo<br/>-key-independent user list?}
    S2 -->|no| S4
    S4 -->|yes| S5[resolveUser against the global users only]
    S5 -->|match| SWIN
    S5 -->|no match| SNONE[error naming both<br/>config add-user and --global]
    S4 -->|no| SNONE
  end
```

The load-bearing edges:

- **The explicit path is never checked for existence, but the searched path is.** `--config` and
  `CYBER_ASANA_CONFIG` are answers, not hints: if a caller names a file, that is the file, and
  `config path` prints it whether or not it is there. A path arrived at by *searching* is only
  reported when the file was actually found, because a guess that does not exist is not an answer.
- **The upward search stops at the git root.** A config file in a parent of the repository belongs
  to a different repository, and silently adopting it would bind this checkout's project names to a
  neighbor's.
- **Reads find the nearest file; writes always target the git root.** `add` computes its path from
  the git root regardless of a nearer file a read would have picked. In the ordinary
  single-registry repository the two coincide.

  The asymmetry is the rule, not an accident of `add` needing a path: `defaultConfigPath` anchors at
  the git root and ignores any nearer file, because a repository has exactly one registry and it
  belongs at the root. `findConfigFile` may resolve a nearer file for reads, so a nested checkout
  still reads what is there, but a write never creates a second registry beside it.

- **Parsing is a whitelist, and that is what enforces decision 0001.** Only the documented keys
  survive parsing: `schema_version`, each project's `gid`/`name`/`aliases`/`purpose`/`default`,
  each user's `gid`/`name`/`email`/`aliases`, and `defaults`/`conventions` restricted to their own
  known keys. There is no `workspace` key in `defaults` at all — a `defaults.workspace` in the file
  is rejected by name rather than silently dropped, so a config that tries to smuggle one in fails
  loudly instead of writing an empty file back. The rule is enforced by construction rather than by
  a check someone could forget to run.
- **The newer environment alias is tried first.** `envValue` consults `ASANA_ACCESS_TOKEN` before
  `ASANA_TOKEN`, and `ASANA_WORKSPACE_GID` before `ASANA_WORKSPACE`. An empty string counts as
  unset, so an emptied variable falls through to the next name instead of resolving to nothing —
  which is what makes blanking a variable behave the way an operator expects.
- **`ASANA_ACCESS_TOKEN` is the primary name; `ASANA_TOKEN` is a retained alias.** Source, the CLI's
  help text, the MCP error hint, the readme, the docs site, and all four plugin manifests agree, and
  the help text calls `ASANA_TOKEN` deprecated in so many words. `AGENTS.md` and `CONTRIBUTING.md`
  are the only files still leading with the old name; they lag the rename rather than contradict it.
  Both names continue to resolve, so no existing setup breaks.

- **A missing token is an error; a missing workspace is the caller's problem.** `envValue` itself
  never raises — it returns nothing, and the command that wanted the value decides what that means.

- **`--global` and `--merged` are new flags on the existing verbs, never a new verb.** Every scenario
  above still describes the default (no-flag) behavior of `show` / `list` / `resolve-project` /
  `add` / `remove` / `sync` / `path` unchanged; `--global` and `--merged` are additive branches those
  same verbs take, not a parallel command surface.
- **The global file is found by fixed location, never by upward search.** Unlike the repo config,
  there is exactly one global file and it does not live inside any repository, so `--global`/
  `--merged` never walk up looking for it — they resolve `CYBER_ASANA_GLOBAL_CONFIG`, or the default
  under `$XDG_CONFIG_HOME`/`~/.config`, and stop there.
- **An unmatched repo key is an empty registry, not an error.** `show --global` against an existing
  global file that simply has no entry for this repo prints zero rows, the same way an empty
  `projects: []` repo config would — only a missing *file* is the error.
- **The repo config always wins a `gid` collision in the merged view — by construction, not by a
  tie-break step.** Union-by-gid keeps the repo-config entry and only appends global entries whose
  `gid` is not already present, so there is no comparison to get backwards; the repo config's copy is
  simply the one that survives.
- **`--merged` and `--global` are mutually exclusive.** They read different things — one file scoped
  to a repo key, or two files unioned — so combining them is a usage error, not a silently-resolved
  precedence.
- **An unresolvable repo key fails `--global` loudly but `--merged` quietly.** `--global` alone is
  asking specifically for the global side, so a caller outside any git repo with no `--repo` gets an
  error naming the flag. `--merged` is asking for "everything that applies here"; when the repo key
  can't be derived, the global side simply contributes nothing and the repo config alone still
  answers — the same "absence is not an error" shape `--global show` already uses for an unmatched
  repo key.
- **Global users are flat; global projects are filed per repo key. Different shapes, on purpose.**
  A project belongs to one repository; a person doesn't stop being the same person because you `cd`
  into a different checkout. So `add-user --global` and its siblings never touch a repo key at all —
  no `--repo` option, no per-repo filing, just one `users[]` list on the global file.
- **User resolution is staged, not merged — the opposite of the projects `--merged` shape, and
  deliberately so.** Projects union safely because looking a name up with `.find()` already prefers
  whichever entry comes first (the repo config's, since it's placed first in the array) with no
  ambiguity check at all. `resolveUser` is not that simple: it actively detects and rejects an
  ambiguous match within one registry. Merging two registries before searching would let an alias
  that is unambiguous in each scope on its own become an artificial cross-scope collision. Trying the
  repo config to completion first, and only opening the global registry on a clean miss, avoids that
  without weakening either registry's own ambiguity check.
- **`--merged` on `resolve-user` / `list-users` is a listing view, so it unions after all.** Showing
  "everything that resolves here" is the whole point of a merged listing — unlike a single
  `--assignee` resolution, an ambiguous alias across scopes here is a genuine finding worth surfacing
  (`resolveUser`'s own error), not a false collision to route around.
- **`sync --global`'s `--repo` filter scopes projects only.** Global users carry no repo key, so
  every registered global user is refreshed regardless of `--repo`; only which repos' *projects* get
  refreshed narrows.

## Scenario map

### locating the config file

| Edge | Path (Given) | Scenario |
|---|---|---|
| `--config` beats `CYBER_ASANA_CONFIG` | two registry files on disk, each named by a different source | `an explicit --config path wins over the CYBER_ASANA_CONFIG variable` |
| override beats the searched file | a repository holding a committed registry, plus a second registry file named by the variable | `CYBER_ASANA_CONFIG wins over the config file committed in the repo` |
| no override → walk up | a nested working directory under a repository with a committed registry | `with no override the search walks up from the current directory` |
| `.git` here → stop the walk | a registry file in the parent of the git root | `the upward search stops at the git root` |
| relative override → resolve against the working directory | a registry file beside the working directory, named relatively | `a relative override is resolved against the current directory` |
| explicit path is not checked for existence | a variable naming a path where no file has been created | `path prints an override that names a file which does not exist` |
| the search found nothing | a git root with no .agents directory | `path prints an empty line when no config file is found` |

### reading the registry

| Edge | Path (Given) | Scenario |
|---|---|---|
| render the path and a row per entry | a registry holding two projects | `show prints the config path and a row per registered project` |
| `list` reconverges on `show` | a registry holding two projects | `list prints the same rows as show` |
| no path found → error | a git root with no .agents directory | `show without a config file anywhere is an error` |
| name matches after trimming and lowercasing | a registry entry whose name is mixed case | `resolve-project matches a registered name ignoring case and surrounding spaces` |
| resolve locally, never over the network | a registry entry and a reachable Asana endpoint | `resolve-project reaches no Asana endpoint` |
| no entry matches → error | a registry holding one project | `resolve-project reports a name that is not registered` |
| `schema_version` is neither 1 nor 2 → error | a registry file declaring schema_version 3 | `a config file declaring an unsupported schema_version is rejected` |
| an entry field is missing → error | a registry file whose only entry carries a gid alone | `a project entry without a name is rejected` |
| a `schema_version: 1` file still parses | a registry file with plain `{ gid, name }` entries only | `a schema_version 1 file loads with empty aliases and no purpose or default` |
| an unknown `defaults`/`conventions` key → error | a registry file with `defaults.workspace` set | `a defaults.workspace key in the config file is rejected by name` |
| drop every key outside the schema | a registry file carrying a hand-added top-level `workspace_gid` | `show omits a workspace GID found in the config file` |

### writing the registry

| Edge | Path (Given) | Scenario |
|---|---|---|
| GID not registered → append | an empty registry and a project in Asana | `add appends a project whose name comes from Asana` |
| GID already registered → replace in place | a registry entry whose name has drifted from Asana | `add replaces the entry when the GID is already registered` |
| file missing → start from an empty registry | a git repository with no .agents directory | `add creates the config file at the git root when none exists` |
| the write path is the git root, not the nearest file | a registry file in a nested package directory | `add writes at the git root even when a nearer config file was read` |
| the Asana response carries no name → error | a project record from Asana with no name field | `add leaves the file untouched when the Asana response carries no name` |
| never write a workspace GID (barred) | an empty registry and a workspace variable set | `add writes no workspace GID even when the workspace variable is set` |
| never write a workspace GID (barred) | a registry file carrying a hand-added workspace GID | `add drops a workspace GID that was already in the file` |
| a digits-only argument → match by GID | a registry holding two projects | `remove deletes the entry whose GID matches a digits-only argument` |
| an argument with a non-digit → match by name | a registry entry whose name is mixed case | `remove deletes the entry whose name matches, ignoring case` |
| nothing was removed → error | a registry holding one project | `remove reports an argument that matches no entry` |
| a name differs → rewrite the file | a registry entry whose name has drifted from Asana | `sync rewrites the names that differ from Asana` |
| nothing changed → leave the file alone | a registry whose two names match Asana exactly | `sync leaves the file byte-identical when every name already matches` |
| no path found → error | an empty directory outside any git working tree | `sync without a config file anywhere is an error` |
| the observed GID is registered → refresh | a registry entry whose name has drifted from Asana | `a project fetched by another command refreshes its registered name` |
| the observed GID is absent → no write | a registry holding one project | `a project fetched by another command leaves an unregistered GID alone` |

### resolving a configured value

| Edge | Path (Given) | Scenario |
|---|---|---|
| the explicit token beats the environment | a `--token` value and a different `ASANA_ACCESS_TOKEN` | `the token flag wins over the token environment variables` |
| the newer token alias beats the older name | both token variables set to different values | `ASANA_ACCESS_TOKEN wins over ASANA_TOKEN` |
| empty counts as unset | an emptied `ASANA_ACCESS_TOKEN` and a filled `ASANA_TOKEN` | `an empty ASANA_ACCESS_TOKEN falls through to ASANA_TOKEN` |
| no candidate → the caller errors | a shell where both token variables are absent | `no token anywhere is an error naming the environment variable` |
| the newer workspace alias beats the older name | both workspace variables set to different values | `ASANA_WORKSPACE_GID wins over ASANA_WORKSPACE` |
| the explicit workspace beats the environment | a `--workspace-gid` value and a different `ASANA_WORKSPACE_GID` | `an explicit workspace flag wins over the workspace environment variables` |
| the registry supplies no workspace (barred) | a populated registry in a shell where both workspace variables are absent | `the repo config supplies no workspace GID to a workspace-scoped command` |
| no MCP surface for config (barred) | the registered MCP tool set | `no MCP tool is registered for the repo config` |

### deriving the global-registry repo key

| Edge | Path (Given) | Scenario |
|---|---|---|
| `--repo` beats auto-detection | a git repository with a remote, and a different key passed explicitly | `--repo overrides the auto-detected key for the global registry` |
| a remote origin → normalize its URL | a git repository whose origin remote is an SSH-style URL | `the global repo key normalizes an SSH-style origin URL` |
| an HTTPS origin normalizes the same way | a git repository whose origin remote is an HTTPS URL for the same host/org/repo | `an HTTPS origin URL normalizes to the same key as its SSH equivalent` |
| no remote → fall back to the git root path | a git repository with no configured remote | `the global repo key falls back to the git root path when there is no remote` |
| no `.git` and no `--repo` → error | a directory outside any git working tree | `--global without a resolvable repo key and no --repo is an error` |

### reading and writing the global registry

| Edge | Path (Given) | Scenario |
|---|---|---|
| default location, no search | `CYBER_ASANA_GLOBAL_CONFIG` unset, `$XDG_CONFIG_HOME` set | `config path --global prints the default location under XDG_CONFIG_HOME` |
| override wins | `CYBER_ASANA_GLOBAL_CONFIG` set to a path | `CYBER_ASANA_GLOBAL_CONFIG overrides the default global location` |
| render the repo key and a row per entry | a global file holding two projects under the derived repo key | `show --global prints the projects paired with the derived repo key` |
| unmatched repo → zero rows, not an error | a global file holding entries for a different repo key only | `show --global prints zero rows for a repo key with no entry in an existing global file` |
| no global file anywhere → error | no file at the resolved global location | `show --global without a global file anywhere is an error` |
| GID not yet registered for this repo → append, creating the file | no global file, and an Asana project to fetch | `add --global creates the global file and the repo entry when neither exists` |
| GID already registered for this repo → replace in place | a global file already holding this GID under this repo key, with a drifted name | `add --global replaces the entry when the GID is already registered for that repo` |
| a digits-only argument → match by GID, scoped to this repo | a global file holding two projects under the derived repo key | `remove --global deletes the entry whose GID matches, scoped to the derived repo` |
| nothing matches for this repo → error | a global file holding one project under the derived repo key | `remove --global reports an argument that matches no entry for that repo` |
| a name differs → rewrite, across every repo in the file | a global file with entries for two different repos, one name drifted | `sync --global refreshes the drifted names across every repo entry in the file` |
| no global file anywhere → error | no file at the resolved global location | `sync --global without a global file anywhere is an error` |
| resolve locally, never over the network | a global file holding one project under the derived repo key | `resolve-project --global resolves a name from the global entry with no Asana request` |
| never write a workspace GID (barred) | an empty global registry and a workspace variable set | `add --global writes no workspace GID even when the workspace variable is set` |

### the merged (effective) view

| Edge | Path (Given) | Scenario |
|---|---|---|
| union by gid | a repo config with one project and a global entry for this repo with a different project | `show --merged unions the repo config and the global entry for this repo` |
| repo config wins a `gid` collision | a repo config and a global entry that disagree on the name for the same GID | `show --merged keeps the repo-config name when the same GID differs between sources` |
| resolve a name that exists only globally | a repo config with one project and a global entry with a second, different project | `resolve-project --merged resolves a name present only in the global entry` |
| no entry matches in either source → error | a repo config and a global entry, neither naming the queried project | `resolve-project --merged reports a name that is not registered in either source` |
| `--repo` overrides auto-detection for the global side too | a repo config plus a global entry filed under a manual key | `--repo overrides the auto-detected key in the merged view` |
| local file absent, global present → still succeeds | no repo config file, and a global entry for the derived repo key | `show --merged succeeds from the global entry alone when no repo config file exists` |
| unresolvable repo key → global contributes nothing, not an error | a repo config reachable only by `--config`, outside any git working tree | `show --merged tolerates an unresolvable repo key and falls back to the repo config alone` |
| neither source produces anything → error | no repo config file and no matching global entry | `show --merged is an error when neither source produces anything` |
| the two flags don't compose | a CLI invocation naming both flags | `--global and --merged together is a usage error` |

### the global user registry

| Edge | Path (Given) | Scenario |
|---|---|---|
| render the flat users list, no repo key involved | a global registry file holding two users | `list-users --global prints every personally-registered user` |
| GID not yet registered → append, creating the file | no global file, and an Asana user to fetch | `add-user --global creates the global file and appends the user when neither exists` |
| GID already registered → merge aliases in place | a global file already holding this GID with one alias | `add-user --global merges new aliases into the existing entry` |
| resolve locally, never over the network | a global file holding one user | `resolve-user --global resolves an alias from the global entry with no Asana request` |
| no match → error | a global file holding one user | `resolve-user --global reports a query that matches no entry` |
| a GID/alias/email/name → remove that user | a global file holding two users | `remove-user --global removes the user a query resolves to` |
| one or more aliases → drop them, keep the user | a global user with three aliases | `remove-alias --global drops the named aliases and keeps the user` |
| a name differs → rewrite, regardless of --repo | a global file with one user and one project under a different repo | `sync --global refreshes a drifted user name regardless of the --repo project filter` |
| never write a workspace GID (barred) | an empty global registry and a workspace variable set | `add-user --global writes no workspace GID even when the workspace variable is set` |

### staged user resolution and --assignee

| Edge | Path (Given) | Scenario |
|---|---|---|
| repo config has the alias → global is never read | a repo config and a global registry that both register the same alias to different people | `resolveEffectiveAssignee prefers the repo config's own match over the global registry` |
| repo config misses → fall back to global | a repo config with no matching alias and a global registry that has one | `resolveEffectiveAssignee falls back to the global registry when the repo config has no match` |
| repo config's own ambiguity still applies | a repo config where the alias matches two users | `resolveEffectiveAssignee raises the repo config's own ambiguous-match error without consulting global` |
| neither resolves → a single clear error | no repo config and no global match | `resolveEffectiveAssignee names both config add-user and --global when nothing resolves` |
| a numeric gid or "me" never triggers a lookup | a bare numeric string and the literal "me" | `resolveEffectiveAssignee passes a gid or "me" through without reading either registry` |
| global users carry no repo key at all, unlike projects | a directory outside any git working tree, and a global registry with a matching alias | `resolveEffectiveAssignee resolves from the global registry when there is no git repository at all` |
| `--merged` unions instead of staging | a repo config and a global registry each registering a different user | `list-users --merged prints both registries' users, repo config winning a gid collision` |
| `--merged` resolves a global-only alias | a repo config with one user and a global registry with a second, different user | `resolve-user --merged resolves an alias present only in the global registry` |
| `--merged` surfaces the cross-scope collision that staged resolution hides | the same two-registry alias collision `resolveEffectiveAssignee` is given, read through `--merged` instead | `resolve-user --merged surfaces a cross-scope alias collision that staged resolution would not` |
| neither source produces anything → error | no repo config file and an empty or absent global registry | `list-users --merged is an error when neither source produces anything` |
