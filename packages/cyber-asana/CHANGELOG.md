# cyber-asana

## 0.13.0

### Minor Changes

- 30a03a0: `config add-user --search <query>` finds a user by name or email through Asana's typeahead search and registers them, so you no longer need the GID up front. It registers a single hit, or the one hit whose name or email matches exactly. Otherwise it lists the candidates and writes nothing.
- 199cd25: Add a repo-local user registry to `config`: `config add-user <user-gid> --alias <alias>` fetches and stores a user's name and email, `config resolve-user` turns an alias, email, or name into a GID with no API call, and `config list-users` / `config remove-user` manage the entries. `config sync` now refreshes registered users too.
- 6dcddfe: Every singular `get` command now accepts `--opt-fields`, and every `asana_<resource>_get` MCP tool accepts `opt_fields`. `user me` and `asana_user_me` accept them too. Use them to request fields that Asana leaves out of a single-resource read.
  
  When you leave the option out, each `get` returns the same fields as before. `membership get` does not take the option, because Asana's endpoint has no `opt_fields`.
- d6ef7d8: `--assignee` on `task create`, `task update`, and `task subtask create` — and a new `assignee` parameter on the matching MCP tools — now accepts an alias, email, or name registered with `config add-user`, in addition to a user GID or `me`. It resolves from the repo config with no API call and errors only when the value is unregistered or matches more than one user. `--assignee-gid` still takes a GID as-is.

### Patch Changes

- 4286acd: `user list` and `asana_user_list` no longer fail with `400 The result is too large` on large workspaces. They now page through `GET /users?workspace=` (sorted by user ID), and so accept `--limit`, `--all`, and `--max-pages` (MCP: `limit`, `fetch_all`, `max_pages`) like other list commands.

## 0.12.1

### Patch Changes

- 3db4e08: Bundle the CLI's dependencies into `dist/cli.js`, and let the skills invoke it directly.
  
  An installed agent plugin is a copy of a source checkout, not an npm install, so its directory has
  no reliable `node_modules`. That is why every skill had to shell out through a pinned `npx` — the
  fetch was the only thing supplying the dependency tree. The published `dist/cli.js` now inlines each
  runtime dependency and runs with no `node_modules` present at all.
  
  `skills/init-asana/scripts/cyber-asana.mjs` launches that shipped CLI, and the **Ensure cyber-asana
  CLI** section now prefers it, falling back to a global install and then to pinned `npx` exactly as
  before. The fallback is deliberate: resolving the launcher path is model behaviour, not a guarantee.
  
  The library entries (`.` and `./mcp`) are unchanged. Their dependencies stay external so a consumer
  that also uses zod or the MCP SDK shares one copy instead of getting a private inlined duplicate.

## 0.12.0

### Minor Changes

- 0a839d6: Close the cross-surface gaps in the goals and status domains: `goal create` / `goal update` gain `--start-on` and `--html-notes`, `goal update` gains `--clear-due-on` and `--clear-start-on`, and `status list` gains `--created-since`. The matching MCP parameters land on `asana_goal_create`, `asana_goal_update`, and `asana_status_list`.
  
  Asana has always taken `start_on` and `html_notes` on both goal write endpoints and `created_since` on the status listing, but none of the three had a CLI or MCP surface. A goal's date range could only be half-set, a goal description could only be plain text, and asking what was posted since the last check-in meant paging the whole status history and filtering locally.
  
  Both goal dates are nullable, so unsetting one needs its own input — `--clear-due-on` and `--clear-start-on` send an explicit null, the way `task update` already does. Naming a date together with its clear flag, or `--notes` together with `--html-notes`, is a usage error caught locally before any request is sent.
  
  The custom-fields domain was swept for the same class of gap and is clean: every parameter the Asana SDK accepts on its six implemented operations is already reachable from both surfaces.
- 7f3cfb3: `section create` and `asana_section_create` accept a placement
  
  Asana's create-section endpoint has always taken `insert_before` / `insert_after`, but
  cyber-asana only sent the name — a new column had to be created and then moved. Both
  surfaces now expose the same placement flags `section move` already had:
  
  ```sh
  cyber-asana section create "In Review" --project-gid <gid> --insert-after <section-gid>
  ```
  
  Naming both placements is a usage error, caught before any request is sent.
- cca9677: Close cross-surface gaps in the stories, attachments, and tags domains — fields Asana accepts on
  endpoints this package already wraps, but that reached neither the CLI nor the MCP tool.
  
  - `story create` / `story update` (and the `comment` aliases) gain `--pin`, `--unpin`, and
    `--sticker <name>`; `asana_story_create` / `asana_story_update` gain `is_pinned` and
    `sticker_name`. Pinning or stickering is an edit in its own right, so `update` no longer needs a
    replacement body. `--pin` with `--unpin`, and a sticker outside Asana's twelve, are usage errors
    caught before any request is sent.
  - `tag create` gains `--follower <gid[,gid...]>` and `asana_tag_create` gains `follower_gids`.
    Asana takes `followers` only at creation, so `update` deliberately has no counterpart.
  - `tag update` gains `--clear-color` (`clear_color` over MCP) for Asana's nullable tag colour,
    mirroring `task update --clear-due-on`.
  - `asana_attachment_create` gains `connect_to_app`, and `attachment create` gains
    `--connect-to-app`. Asana honours it only on an external `--url` attachment, so pairing it with a
    file upload is a local usage error.
  - `asana_tag_delete` is now idempotent, like the CLI and every other delete in the package. Its
    response body changes from `{ ok: true, deleted: "<gid>" }` to the shared
    `{ deleted, resource, gid, already_absent }` record.
- 33d11a4: Close cross-surface gaps in the projects and project-templates domains.
  
  - `project list` gains `--archived` / `--no-archived`, and `asana_project_list` gains
    `archived`. The gateway had threaded Asana's `archived` filter all along; neither
    surface exposed it.
  - `project create` / `project update` gain `--archived` (and `--no-archived` on update),
    and `asana_project_create` / `asana_project_update` gain `archived`. Asana has accepted
    `archived` on both endpoints all along; no surface could archive a project.
  - `project create` / `project update` gain `--owner`, `project update` gains
    `--clear-owner`, and the matching MCP tools gain `owner` / `clear_owner`. Asana's
    nullable `owner` had no setter on any surface.
  - `project create` / `project update` gain `--default-access-level`, and the matching
    MCP tools gain `default_access_level`. Its sibling `privacy_setting` was already
    exposed on both surfaces.
  - `project-template instantiate` gains `--privacy-setting` and
    `asana_project_template_instantiate` gains `privacy_setting`. Both surfaces exposed only
    the `public` boolean, which Asana deprecated in favour of `privacy_setting`.
  - `project-template instantiate` gains `--strict-dates` and
    `asana_project_template_instantiate` gains `is_strict`. Asana's `is_strict` turns an
    unfilled date variable into an error rather than a silently defaulted date; neither
    surface could ask for it.
  - `project-template instantiate` gains a repeatable `--requested-role` and
    `asana_project_template_instantiate` gains `requested_roles`. `requested_dates` was
    already plumbed on both surfaces; its role counterpart was not.
- d21d4df: `auth status` accepts `--client-id` and `--client-secret`
  
  The flags already reached `auth login`, `auth token`, and `auth logout`, but the one command that explains which app registration wins could not see them. `cyber-asana auth status --client-id <id>` now reports the registration a given pair would resolve to, and which sources it shadows, before you authorize with it.
- e43fd55: `asana_portfolio_delete` is now idempotent, like every other delete in the package. It was the one
  delete calling Asana bare, so deleting a portfolio that was already gone handed the agent a 404 while
  the same retry on `cyber-asana portfolio delete` reported it as already deleted. The tool now returns
  the shared acknowledgement — `{ deleted, resource, gid, already_absent }` — instead of a fixed
  `Deleted portfolio <gid>` sentence.
- a13401c: `portfolio list` gains an owner filter on both surfaces. The `owner` parameter was already threaded
  through the portfolios gateway and `api.ts` and sent to Asana, but neither caller could set it:
  the CLI now takes `--owner-gid <gid>` (legacy alias `--owner`) and `asana_portfolio_list` now takes
  `owner_gid`. Asana honors the filter for service-account tokens; a regular personal access token
  lists only its own portfolios either way. When no owner is given, no `owner` key is sent.
- fd8f7ba: Close the cross-surface field gaps in the `tasks` domain, so the CLI and MCP expose what Asana's task endpoints have always accepted.
  
  - `task create` gains `--start-on` and `--completed`; `asana_task_create` gains `start_on` and `completed`. Both were settable on update but not create, even though Asana's create body takes them.
  - `task create` and `task update` gain `--due-at` and `--start-at`, and `task update` gains `--clear-due-at` and `--clear-start-at`. `task search` already filtered on the due *time*, so tasks with one were findable but not writable. A date paired with its date-time twin is a usage error caught locally, because Asana documents the two forms as not to be used together.
  - `task update` gains `--clear-assignee` (`clear_assignee` on `asana_task_update`) — `assignee` is nullable, but it was the one nullable field the command wrote with no clear counterpart, so unassigning a task was not expressible.
  - `task subtask create` and `asana_task_subtask_create` now take the same write fields as their `task create` siblings — rich notes, start dates, resource subtype, custom fields, and followers all previously fell off at the gateway. Callers of the programmatic `createSubtask` should note its options change from camelCase (`{ notes, assignee, dueOn }`) to the shared `CreateTaskFields` shape (`{ notes, assignee, due_on, ... }`).

## 0.11.0

### Minor Changes

- 30d1430: Add `--start-on` and `--clear-start-on` to `task update`, and the matching `start_on` / `clear_start_on` parameters to the `asana_task_update` MCP tool.
  
  Asana's task `start_on` field had no CLI or MCP surface on update, so setting a task's date range meant falling back to the raw API. `cyber-asana task update <gid> --start-on 2026-09-01 --due-on 2026-10-31` now sets both, and `--clear-start-on` sends an explicit null the way `--clear-due-on` does. Naming both `--start-on` and `--clear-start-on` is a usage error caught before any request is sent.

### Patch Changes

- ec491c5: Ship a `SETUP.md` at the plugin root so an agent can finish plugin setup — the Asana personal access token and workspace GID its bundled MCP server reads from the environment — without re-deriving the MCP wiring the install already did.
- b6622d2: Catch `npx -y cyber-asana` as an unpinned invocation. The catalog contract's pinning rule skipped over `--yes` but not its `-y` abbreviation, so the shorter spelling passed unchecked in every skill and reference file.
- a5565a6: Hold the plugin root's `SETUP.md` to the skill catalog contract: it must exist, sit on the publish allowlist, pin the `npx cyber-asana` commands it prescribes, and resolve every skill it hands off to — so a renamed or dropped skill breaks the build instead of leaving a dead handoff in the file a fresh install reads first.

## 0.10.0

### Minor Changes

- 38054a4: Add the `improve-description` skill for cleaning up and rewriting task and
  project descriptions.
  
  The default pass is a copy-edit, not a rewrite: collapse runs of blank lines, fix
  typos and broken markup, turn dash lists into real lists — while preserving the
  author's message, wording, and section structure. Emoji, templates, tone changes,
  and research-backed citations are opt-in modifiers the user asks for, never
  applied by default.
  
  The skill also documents Asana's rich-text HTML subset, verified against the live
  API, because the rejection is a bare `XML is invalid` that names neither the tag
  nor the position. Notable corrections to what the tags are commonly assumed to
  be: `<h1>`–`<h3>` and `<pre>` are supported; `<h4>`–`<h6>`, `<p>`, `<br>`, and
  `<div>` are not. Paragraphs are separated by literal newlines. A bare `<body>`
  wrapper is mandatory and may carry no attributes. A raw `<` or `>` is rejected
  even inside `<code>` and `<pre>`, and `<code>` nested inside `<pre>` fails with
  an opaque "unexpected error occurred".

### Patch Changes

- 8dd0938: Fix `task get-many --opt-fields` failing with HTTP 400 `Parameters are not
  accepted in a batch action path`.
  
  Each batch action built its `relative_path` as `/tasks/<gid>?opt_fields=<fields>`,
  and Asana's Batch API rejects a query string there. The requested fields now ride
  in the action's own `options.fields` array — where the Batch API schema puts
  output options — and the path stays bare. Without `--opt-fields` no query string
  was ever appended, which is why only the flag path failed.

## 0.9.0

### Minor Changes

- 1178597: Distribute the agent plugin inside the npm package.

  The published package root is now the plugin root: the tarball carries
  `plugin.json`, `mcp.json`, `skills/`, and the Claude Code, Cursor, and Codex
  manifests alongside `dist/`. Claude Code can install it from a marketplace with
  an `npm` source — `/plugin marketplace add cyberuni/cyber-asana` then
  `/plugin install cyber-asana@cyberuni` — instead of cloning the repo.

  The portable `plugin.json` and `mcp.json` follow [Agent Plugins
  1.0.0](https://github.com/agentplugins/agent-plugins-spec), whose manifest
  schema is closed; skills and MCP servers are discovered from fixed locations
  rather than declared inline.

  **Note for spec-conformant clients:** `mcp.json` no longer sets an `env` block.
  The spec expands only `${PLUGIN_ROOT}` and `${PLUGIN_DATA}`, so the previous
  `"ASANA_ACCESS_TOKEN": "${ASANA_ACCESS_TOKEN}"` entry would arrive as that
  literal string and shadow the real token. Export `ASANA_ACCESS_TOKEN` (and
  optionally `ASANA_WORKSPACE_GID`) in the environment that launches the agent.

  Claude Code reads `.mcp.json`, which still expands `${VAR}`, so a configured
  token keeps working unchanged.

  Independently, an environment value that is exactly an unexpanded reference —
  `${ASANA_ACCESS_TOKEN}` — is now treated as unset rather than as a credential.
  Hosts that cannot expand a reference forward its text verbatim, and Claude Code
  does the same when the variable is unset and has no default. That literal
  previously outranked the `ASANA_TOKEN` fallback and turned a missing token into
  a `401`; a missing credential is now reported as missing.

  `auth status` names any variable in that state under `Unexpanded`, in both text
  and JSON output, so a variable that looks configured everywhere the user checks
  does not read as an unexplained "not authenticated".

## 0.8.0

### Minor Changes

- a485520: Add custom field discovery so the GIDs that task writes are keyed by are reachable.

  `custom-field list --workspace-gid <gid>` / `asana_custom_field_list` lists a workspace's
  custom fields, and `custom-field get <gid>` / `asana_custom_field_get` returns one field
  including its `enum_options` and their GIDs. Those are the values `task create` and
  `task update` expect in `--custom-field` and `--custom-fields-json`.

  Reads only — defining or editing custom fields is not wrapped.

- 95d86c3: Add the custom field settings reads — which custom fields are attached to a given project, portfolio, goal, or team. New CLI subcommands `cyber-asana custom-field <project|portfolio|goal|team> <gid>` and four MCP tools: `asana_custom_field_list_for_project`, `asana_custom_field_list_for_portfolio`, `asana_custom_field_list_for_goal`, `asana_custom_field_list_for_team`.

  `custom-field list` covers every field in the workspace; this is the narrower answer, and usually the one you want before writing `custom_fields` on a task. Asana rejects a payload naming a field the project does not have, so a project-scoped list — each field with its type and enum options — answers "what can I set here, and with which values". The default `opt_fields` requests exactly the field GID, name, resource subtype, and enum option GIDs and names.

  Reads only. Attaching or detaching a custom field lives on the Projects API and is administration; it stays out.

- 21944fd: Add the Asana change feed: `cyber-asana event list <resource-gid>` and the `asana_event_list` MCP tool report what changed on a task, project, or goal since a sync token, instead of re-querying and diffing state.

  The sync token is returned in the response and passed back with `--sync` / `sync` on the next call — nothing is cached locally. The first call (or one with an expired token) returns no events, a fresh token, and `sync_reset: true`; that is Asana's documented "start here" handshake, not an error. When `has_more` is `true`, poll again immediately — Asana caps one token at 100 events.

- 91609eb: Add project and team membership management over Asana's unified Memberships endpoint: CLI `cyber-asana membership list|get|create|update|delete` and MCP tools `asana_membership_list`, `asana_membership_get`, `asana_membership_create`, `asana_membership_update`, `asana_membership_delete`. Agents can now answer "who is on this project?", check an assignee actually has access, and add or remove a member as part of an onboarding flow — `user list` only ever gave the whole workspace.

  `list` filters by parent (project, portfolio, goal, custom type, or custom field) and/or member (user or team); Asana needs `--resource-subtype` / `resource_subtype` when the parent is omitted, and the CLI reports any other combination as a usage error instead of a 400. `update` changes `--access-level` only — broader permission management is Asana's Roles API and stays out of scope. `delete` is idempotent.

- 83cfa6d: Add out-of-office entries, so automation can see who is away before it assigns work.

  - CLI: `ooo list|get|create|update|delete`, with `--start-date` / `--end-date` filters on the list.
  - MCP: `asana_ooo_list`, `asana_ooo_get`, `asana_ooo_create`, `asana_ooo_update`, `asana_ooo_delete`.
  - `--user-gid` / `user_gid` defaults to the authenticated user, so an unscoped call reads your own calendar.
  - `user list`, `user get`, and `user me` now suggest the matching `ooo list` call.

- fd4a143: Start a project from a project template: new CLI resource `cyber-asana project-template list|get|instantiate` and MCP tools `asana_project_template_list`, `asana_project_template_get`, `asana_project_template_instantiate`. `list` scopes to a workspace or, with `--team-gid`/`team_gid`, to a team's templates; `get` shows the template's `requested_dates`, the date variables instantiation fills in via `--requested-date <gid>=<YYYY-MM-DD>` / `requested_dates`.

  Asana builds the project asynchronously, so instantiation returns a job. `instantiate` waits for that job by default and reports the new project's GID under a bounded timeout (`--timeout` / `timeout_seconds`, default 60 seconds, polling once a second); `--no-wait` / `wait: false` returns the job GID for callers that poll themselves. A failed job and an expired wait are both errors — never a success with a missing project GID.

  Also wraps the Jobs API: `cyber-asana job get <gid>` and `asana_job_get`, so the job behind any async operation — project or task instantiation today, duplication later — can be read directly.

- e63ed53: Add `rule trigger` and the `asana_rule_trigger` MCP tool, firing an Asana automation rule that uses an "incoming web request" trigger. Takes `--resource` (the task GID) and `--action-data-json` (free-form variables the rule's action reads). Asana's `402` now surfaces as a plan limitation with exit code `7` instead of a generic failure.
- c7afec2: Add a deterministic status roll-up: `cyber-asana status overview <parent-gid>` and the `asana_status_overview` MCP tool. Given a project GID it returns that project's latest status update and its task counts; given a portfolio GID it also returns one entry per item. It takes a GID and never searches — discovery by keyword stays with the official Asana MCP's `get_status_overview`.

  A portfolio roll-up costs `3 + 2N` API calls for N items. `--limit` / `limit` caps N (default 25) and a capped roll-up reports `truncated` rather than silently dropping items. `--parent-type` / `parent_type` skips parent detection and saves one call.

- b8a6aac: Add task templates: `cyber-asana task-template list|get|instantiate` and the `asana_task_template_list`, `asana_task_template_get`, `asana_task_template_instantiate` MCP tools. A recurring checklist — a release checklist, an incident postmortem — is created in one call instead of rebuilt subtask by subtask. `list` is project-scoped, as Asana requires.

  Asana instantiates a task asynchronously and answers with a job, so `instantiate` polls that job for up to `--timeout` seconds (`timeout_seconds`, default 10) and returns it carrying `new_task` once it succeeds. `--no-wait` / `wait: false` returns the pending job immediately; a timeout returns the last job seen rather than erroring, so you always get a job GID back. On the CLI a `failed` job exits non-zero.

  Deleting a template is deliberately not wrapped — cyber-asana wraps using templates, not managing them.

- 19be9cc: Add cross-object search backed by Asana's typeahead endpoint, so a name can be turned into a GID without the official Asana MCP server: new MCP tool `asana_search_objects` and CLI command `cyber-asana search objects <resource-type> [query]`. One resource type per call (`actor`, `agent`, `custom_field`, `goal`, `portfolio`, `project`, `project_template`, `tag`, `task`, `team`, `user`), a single page capped by `--count`/`count` (1–100, default 20), and no pagination — results are ordered by relevance/recency and are explicitly not exhaustive.
- 05c636a: Read the OAuth app registration from `ASANA_API_CLIENT_ID` and `ASANA_API_CLIENT_SECRET`, which now take precedence over `ASANA_CLIENT_ID` and `ASANA_CLIENT_SECRET`.

  Asana's official hosted MCP server documents `ASANA_CLIENT_ID`/`ASANA_CLIENT_SECRET` for its own "MCP app" registration, whose tokens do not work against the REST API. `cyber-asana auth login` needs an "API app" instead, so the two can now be exported side by side. `ASANA_CLIENT_ID`/`ASANA_CLIENT_SECRET` still work as a fallback, and `--client-id`/`--client-secret` still win over both.

- f9f9928: Attach and remove files. `attachment create` uploads a local file — streamed, not
  buffered — or links an external URL with `--url`, and `attachment delete` removes an
  attachment idempotently. The MCP server gains `asana_attachment_create` and
  `asana_attachment_delete`; its `file` path is resolved on the machine running the server.

  `attachment list` and `asana_attachment_list` now accept `--parent-gid` / `parent_gid` for
  a project or project brief as well as a task. `--task-gid` and `task_gid` keep working.

- 789ef29: Report the OAuth app registration in `cyber-asana auth status`: an `App` line with the masked client id and its source, plus `App ignored` for registrations it shadows (an `app` object with `client_id_masked`, `source`, and `shadowed` under `--json` / `--toon`, `null` when none resolves). The command stays offline.

  When Asana rejects the token request with `invalid_client`, append a hint about the API-app / MCP-app distinction and `ASANA_API_CLIENT_ID` to Asana's own message.

- 4efc478: Read, edit, and delete comments. `story get|update|delete` and `comment get|update|delete`
  join the CLI, with matching `asana_story_*` and `asana_comment_*` MCP tools, so a comment
  posted by mistake can be corrected or withdrawn. Asana only permits changing comment
  stories you authored — a refusal now carries a `hint` explaining that instead of a bare
  `403` — and `delete` is idempotent.
- ab49764: Add section reordering and section-scoped task placement. `cyber-asana section move <gid> --project <gid> --insert-before|--insert-after <section-gid>` moves a section relative to another in the same project, and `cyber-asana section task add <section-gid> <task-gid>` places a task directly into a section. Both are also exposed over MCP as `asana_section_move` and `asana_section_task_add`.

### Patch Changes

- f340a16: Force `hono` to a patched version. It ships to consumers transitively through
  `@modelcontextprotocol/sdk`, which has no release depending on a fixed version yet.

## 0.7.0

### Minor Changes

- 65124ac: Make stored OAuth credentials ambient, and show the authorize URL during login.

  Every command now resolves stored credentials before dispatch and refreshes the
  access token when it is within a minute of expiring, so `auth login` is
  something you do once rather than something each later command has to know
  about. Without this, `auth login` wrote a credentials file that nothing ever
  read. Precedence is `--token` > `ASANA_ACCESS_TOKEN` > `ASANA_TOKEN` > stored
  credentials; a stored token occupies its own slot so `auth status` still names
  the true source instead of reporting it as `--token`.

  `auth status` now reports stored credentials, including the granting account
  and the expiry, and lists `credentials.json` among the ignored sources when an
  env var shadows it.

  Credential resolution never fails a command: unreadable or unrefreshable
  credentials produce a warning on stderr rather than an exception, since
  `auth login` and `auth logout` are exactly what you reach for when the
  credential is the problem.

  `auth login` prints the authorize URL to stderr before opening the browser. On
  WSL and headless machines the opener is often a no-op, and without the URL the
  command simply appeared to hang.

- f62a57b: Accept `--client-id` and `--client-secret` on `auth login`, `auth token`, and
  `auth logout`, so trying OAuth needs no edits to a shell profile or
  `settings.json`. Precedence is flags > `ASANA_CLIENT_ID` / `ASANA_CLIENT_SECRET`

  > `settings.json`, resolved per field, and `auth status` continues to name the
  > source that won.

  A secret passed as an argument is captured by shell history and visible in the
  process list, so the flag help and the readme both point at the environment
  variables for ongoing use.

- 49c9941: Add `cyber-asana auth login` — OAuth authorization through the browser.

  cyber-asana authenticates against **your own** Asana app rather than a shipped
  registration, so no third party's OAuth app sits between you and your data. Set
  `ASANA_CLIENT_ID` / `ASANA_CLIENT_SECRET` (or write them to `settings.json`) and
  run `auth login`. The consent redirect is caught by a one-shot server bound to
  `127.0.0.1` — the authorization code arrives in a query string, so nothing off
  the machine can reach the socket that receives it. PKCE and `state` are used
  throughout.

  Credentials are stored under `$XDG_CONFIG_HOME/cyber-asana`, split by owner:
  `settings.json` is yours and hand-edited, `credentials.json` is the CLI's and
  rewritten on every refresh. Both are `0600`.

  `--no-store` runs the flow and prints the access token instead of saving it,
  for one-off shells and CI. It emits only the hour-long access token; the
  long-lived refresh token needs `--include-refresh-token`. `--raw` prints the
  bare token for `$(...)` substitution.

  A personal access token remains the documented happy path for a single user.

- 2b62e10: Add `auth login --manual` for the out-of-band flow, `--redirect-uri` for an
  explicitly registered redirect URL, and a clear message when the callback port
  is taken.

  Asana requires redirect URLs to be `https` and documents
  `urn:ietf:wg:oauth:2.0:oob` for native and command-line apps, so a loopback
  `http://localhost` URL is not always registrable — the flow then fails with
  "The redirect_uri parameter does not match a valid url for the application".
  `--manual` runs the documented path instead: Asana displays the code, you paste
  it, and no local port is opened. It also works over SSH.

  `--redirect-uri` covers apps registered against some other URL, and the
  callback listener binds the port named by that URL.

  A callback port already held by an earlier login previously crashed with an
  unhandled EADDRINUSE stack trace; it now explains what is holding the port and
  what to do about it.

- 31652d4: Add `cyber-asana auth status` — a credential diagnostic that works when the
  credential does not.

  `user me` answers "who am I to Asana?" and needs a working token to answer at
  all. `auth status` answers "what will this process authenticate with?", so it
  reads local state only, never calls the API, and exits `0` even when nothing is
  configured (`authenticated: false`). When an agent hits a `401`, this is the
  command that still responds.

  It names the winning source (`--token` > `ASANA_ACCESS_TOKEN` > `ASANA_TOKEN`)
  and lists the sources being shadowed — a stale env var silently overriding a
  newer one was previously indistinguishable from a bad token. Tokens are shown
  masked, in text, `--json`, and `--toon`.

- 7ea5eaf: Add `cyber-asana auth token` and `cyber-asana auth logout`.

  `auth token` prints the stored access token for piping into other tools, and
  refreshes it first when it is within a minute of expiring — so what it prints
  is always usable, and the refreshed token is persisted rather than discarded.
  Text output is the bare token and nothing else, so `$(...)` substitution works.

  `auth logout` revokes the grant with Asana and then deletes the local
  credentials. The order is load-bearing: Asana revokes only refresh tokens, so
  once the file is gone there is nothing left to revoke with. If revocation
  fails the credentials are still deleted and the output says the grant may
  still be live, with the link to remove it. `--local` skips revocation, and
  logging out twice reports "not logged in" rather than failing.

## 0.6.0

### Minor Changes

- 4d692be: Make the CLI and MCP server follow the 10 agent-friendly CLI principles:

  - **Token-efficient output** — new `--toon` flag emits compact TOON (~40% fewer
    tokens than JSON); opt-in `CYBER_ASANA_MCP_FORMAT=toon` does the same for every
    MCP tool result.
  - **Minimal default schemas** — task lists request only `gid,name,completed,due_on`
    by default (also fixes previously-blank Done/Due columns).
  - **Content truncation** — large task notes are truncated with a size hint; `--full`
    restores the complete value.
  - **Definitive empty states** — empty results print `0 results` instead of `(none)`.
  - **Pre-computed aggregates & next steps** — task lists print a count summary and
    follow-up command suggestions (text mode only).
  - **Structured errors & exit codes** — errors are structured under `--json`/`--toon`
    and map to distinct exit codes (auth, forbidden, not found, rate limited, config).
  - **Content first** — running with no arguments shows live data (the authenticated
    user) instead of help text.
  - **Consistent help** — concise examples in top-level and per-resource `--help`.

- c25ad46: Roll the agent-friendly output conventions out from the `tasks` domain to the
  whole CLI, and fix two contract violations.

  Fixes:

  - **Mutation acknowledgements honor `--json`/`--toon`.** Deletes and relationship
    mutations across tasks, projects, goals, tags, sections, status, and portfolios
    printed prose regardless of the requested format. All 15 sites now emit a
    structured payload.
  - **The `Next offset:` hint is gated to text mode**, like the summary and
    next-step helpers.

  Rollout:

  - **Minimal default schemas** — every list command now requests a small default
    field set when the caller gives no `--opt-fields`.
  - **Count summaries and next-step hints** on every list command, not just tasks.
  - **Truncation** applies to project notes, status update bodies, and comment
    bodies, so the documented `--full` flag is meaningful beyond task notes.
  - **Empty states name the entity** — `0 tasks found` rather than a bare
    `0 results`.
  - **Self-correcting usage errors** — an unknown flag or subcommand now reports
    the flags that command accepts plus a `--help` pointer, and exits `2`.
  - **Idempotent deletes** — deleting something already gone succeeds and reports
    `already_absent: true` instead of failing with a 404.
  - **Usage examples in every resource group's `--help`**, and `bin`,
    `description`, and `version` lines on the bare-invocation home view.
  - **New `cyber-asana setup hook`** installs a SessionStart hook so an agent
    session opens with live Asana context. Installing twice is a no-op.

### Patch Changes

- 8ca4d9f: Update dependencies. Notably `asana` to 3.1.12 and `@modelcontextprotocol/sdk`
  to 1.30.0.
- 3f3607c: Fix `story create --html-text` reporting a locally-rejected payload as
  `Asana rejected html_text: ...`. The local shape check now runs outside the
  try/catch that wraps the Asana call, so a payload that never left the machine
  keeps its local error message instead of being attributed to Asana.
- 14d1e58: Fix `story list` ignoring `--full` on the `Text` column. The 60-character cut
  now goes through the shared `truncate()` helper, so truncated text carries a
  size hint and `--full` prints the whole comment — matching every other
  free-text field in the package.
- 949a8c4: Fix `task subtask list` include flags (`--assignee-email`, `--follower-emails`,
  `--num-subtasks`, `--custom-fields`) suppressing the default `gid,name,completed,due_on`
  field set, which left the Name/Done/Due columns blank. The flags now add to the field
  set — the caller's `--opt-fields` when given, the default when not.
- 877f348: Fix `task create` sending followers twice. The followers already ride the
  `POST /tasks` create body, so the extra `addFollowers` request was redundant —
  it is gone. Creating a task with followers now makes exactly one round trip and
  returns the create response instead of the follower-addition response.

## 0.5.0

### Minor Changes

- a27ba3d: feat: add status updates and portfolio items via REST

  Adds an `asana_status_*` toolset (list, get, create, delete) for status updates
  on projects, portfolios, and goals, plus `asana_portfolio_item_list` for listing
  the items in a portfolio. Both are also available as `status` and `portfolio
items` CLI commands. These close the official MCP gaps for
  `get_status_overview`, `create_project_status_update`, and
  `get_items_for_portfolio`.

- e3870df: feat(tasks): return html_notes by default and guide agents to use it

## 0.4.1

### Patch Changes

- aff1e0d: Fix polynomial ReDoS vulnerability in HTML tag validation regex.

## 0.4.0

### Minor Changes

- 042e2ca: Add `config list` subcommand as an alias for `config show`.

## 0.3.2

### Patch Changes

- e1cc84d: Fix the preferred cyber-asana token variable name to `ASANA_ACCESS_TOKEN`, while keeping `ASANA_TOKEN` as a deprecated fallback.

## 0.3.1

### Patch Changes

- 35769bc: Prefer `ASANA_ASSESS_TOKEN` and `ASANA_WORKSPACE_GID` for cyber-asana configuration, while keeping `ASANA_TOKEN` and `ASANA_WORKSPACE` as deprecated fallbacks.

## 0.3.0

### Minor Changes

- f9e1dcc: Add `url parse` CLI command and `asana_url_parse` MCP tool to extract workspace and project GIDs from Asana URLs without API calls.
- 5607d24: Add repo project registry (`.agents/cyber-asana.json`) with `config` CLI commands for add, resolve, sync, and show. Generalize create-asana-task skill for task creation with or without URLs.

## 0.2.0

### Minor Changes

- 952965b: Add batch task lookup by GID via Asana's `/batch` API, including MCP support and manual system tests.
- 6b3e45f: Add `task my-tasks` CLI command and `asana_task_my_tasks` MCP tool to list the authenticated user's My Tasks. Supports `--completed-since`, pagination, and `--opt-fields`.
- 2f073b2: Add pagination and `opt_fields` options to list commands and MCP list tools.
- 3a79c4e: Add `project search` and `asana_project_search` support for searching projects by name pattern and Asana project search filters.
- 51d5d86: Add `project counts` CLI and `asana_project_counts` MCP support for project task counts.
- 2f614ac: Add subtask list and create operations: `task subtask-list <task-gid>` CLI command, `task subtask-create <task-gid> <name>` CLI command, `asana_task_subtask_list` MCP tool, and `asana_task_subtask_create` MCP tool.
- e2b5805: Add injectable `stories` and `tags` gateways plus shared-client composition helpers for cleaner testing and runtime wiring.
- 827b42a: Add default list page sizes and fetch-all pagination options with page caps.
- dceb4f2: Add richer project create and update fields, including rich notes, privacy, default view, and explicit date clearing for projects and tasks.
- 0645b1c: Expand `task search` filters to cover the full Asana search API: `.not` and `.all` variants for assignee, project, section, and tag; portfolio, follower, created-by, assigned-by, liked-by, and commented-on-by filters; and date-range filters for due, start, created, completed, and modified dates. All new filters are exposed in both the CLI and the MCP tool.
- 0061a5d: Add task create and update support for HTML notes, parent relationships, resource subtype, custom fields, follower management, and multi-project creation.
- 8469089: Add `create*Api` factory functions and `*Gateway` types for all remaining domains (workspaces, sections, users, teams, attachments, portfolios, goals, tasks, projects).

  Each domain now exposes a `create*Api(gateway)` factory that accepts an injected gateway, enabling use without the Asana SDK or real API calls. The Asana-backed `createAsana*Gateway(client)` factory is also exported for runtime composition.

- d72e6bc: Add `createRuntimeContext`, `registerCliCommands`, and `registerMcpTools` for composing a shared Asana client across all domain APIs. Fix CLI and MCP to report the package version from `package.json`.
- 4850ead: Add tag update/delete, task-tag relationship commands, and formatted story comment support with `html_text` validation.

## 0.1.0

### Minor Changes

- b6a34b0: Initial release of `cyber-asana` — an Asana CLI and MCP server for AI agents.

  **CLI** (`cyber-asana <resource> <action>`):

  - Covers all major Asana resources: workspaces, projects, tasks, sections, users, teams, portfolios, goals, tags, attachments, and stories
  - Human-readable output by default (key-value for single items, table for lists); pass `--json` for raw API JSON
  - `ASANA_TOKEN` env var for authentication; `--token` flag overrides per invocation
  - `ASANA_WORKSPACE` env var for default workspace GID; `--workspace` flag overrides per invocation
  - Clear setup instructions printed when `ASANA_TOKEN` is missing

  **MCP server** (`node dist/mcp.js`, stdio transport):

  - Exposes all CLI operations as MCP tools named `asana_<resource>_<action>`
  - Drop-in for any MCP-compatible AI agent host
