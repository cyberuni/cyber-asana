# Glossary

Terms this spec leans on. Asana's own vocabulary first, then the vocabulary this package added.

## Asana's vocabulary

- **GID** — Asana's global id for any object (task, project, workspace, …). An opaque string. Never
  parsed, never arithmetic. GIDs are globally unique across object kinds, which is why a single GID
  slot can accept a project, a portfolio, or a goal without the caller naming which — see
  [status](status/README.md).
- **Workspace** — the top-level Asana container (an org, or a personal space) that scopes almost
  every call. The bootstrap problem it creates is what [workspaces](workspaces/README.md) exists to
  solve.
- **Team** — a named group of people inside a workspace. Projects hang off teams.
- **Project** — a container that holds tasks. Belongs to a team.
- **Section** — a named bucket dividing a project's task list; the column on a board.
- **Task** — the unit of work.
- **Subtask** — a task whose parent is another task.
- **Story** — Asana's word for anything in a task's activity feed: a comment somebody wrote, or a
  record that a field changed. Most people say "comment", which is why both spellings are
  registered — see [stories](stories/README.md).
- **Attachment** — a file record hanging off a parent object. Never stands alone.
- **Tag** — a cross-cutting label applied to tasks.
- **Portfolio** — a collection of projects tracked together.
- **Goal** — a named objective a workspace works toward.
- **Status update** — a short progress post attached to exactly one parent, which may be a project,
  a portfolio, or a goal.
- **`me` sentinel** — the literal string `me`, which Asana accepts wherever a user GID is expected
  and resolves to the token's own user.
- **`html_text`** — Asana's rich-text form for a comment: a single `<body>…</body>` root with
  balanced tags. Not general HTML.
- **`opt_fields`** — the comma-separated list of extra fields a caller asks Asana to include. Asana
  returns a compact record when it is omitted, which is why an absent email is normal rather than an
  error.

## This package's vocabulary

- **PAT** — Personal Access Token, the credential used to authenticate. Resolved from the
  environment, where `ASANA_ACCESS_TOKEN` is checked **before** `ASANA_TOKEN` (see the note in
  [axi](axi/README.md) — the documentation and the code disagree about which is primary).
- **Gateway** — a domain's thin wrapper over the Asana SDK. It unwraps `res.data` so nothing above
  it deals in SDK response envelopes.
- **Scope vs subject** — the distinction that decides whether a GID may be defaulted from the
  environment. A **scope** GID says *where to look* (the workspace a list is taken against) and may
  fall back to `ASANA_WORKSPACE`. A **subject** GID names *the thing being acted on* (the task being
  commented on, the section being renamed) and never falls back — silently acting on a different
  object is worse than an error.
- **Envelope** — the paginated result shape `{ data, next_page, limit, … }`, as opposed to a bare
  array. Which one is returned depends on whether the caller expressed any interest in paging; the
  rule belongs to [axi](axi/README.md).
- **Partial update** — an edit that sends only the fields the caller named. Unsupplied fields are
  **omitted** from the request rather than sent blank, because an empty string is a value that reads
  as a deliberate blank.
- **Template** (comment) — comment text carrying `{task.…}` placeholders substituted from the task
  before posting. Opt-in, because without the flag the placeholder syntax is ordinary literal text.
- **Repo config** — the committed project registry a repo creates at `.agents/cyber-asana.json`
  (shape documented by the tracked `.agents/cyber-asana.json.example`). Stores projects only;
  the workspace GID deliberately stays out of it — see
  [decision 0001](design/decisions/0001-no-workspace-gid-in-repo-config.md).
- **AXI** — [Agent eXperience Interface](https://github.com/kunchenguid/axi), the 10 agent-CLI
  principles this package's output conforms to. See [axi](axi/README.md).
- **TOON** — Token-Oriented Object Notation, a compact structured-output format that collapses a
  uniform array of objects into one header row plus a length marker. Opt-in on both surfaces
  (`--toon`, `CYBER_ASANA_MCP_FORMAT=toon`).
