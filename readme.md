# cyber-asana

Agent skills, MCP tools, and a CLI for Asana — built for AI-assisted workflows.

- **Skills** — guided workflows (task creation, standups, repo project lookup). [Jump to skills →](#agent-skills)
- **MCP** — `asana_*` tools for agents. [Jump to MCP →](#mcp-server)
- **CLI** — `cyber-asana` for terminals and scripts. [Jump to CLI →](#cli)

## Installation

```sh
npm install -g cyber-asana
```

## Authentication

Set your [Asana personal access token](https://app.asana.com/0/my-apps):

```sh
export ASANA_ACCESS_TOKEN=<your-pat>
export ASANA_WORKSPACE_GID=<workspace-gid>   # optional default workspace
```

`ASANA_TOKEN` and `ASANA_WORKSPACE` still work as deprecated fallbacks. Or pass `--token <pat>` and `--workspace <gid>` per command.

### Where to keep the token

Resist pasting that `export` straight into `~/.zshrc` or `~/.bashrc`. A PAT never expires, shell profiles are created `0644` so every account on the machine can read yours, and profiles are the files most likely to end up in a dotfiles repo, a screen share, or a pasted snippet — at which point a permanent credential to your whole workspace is public.

Keep the secret in its own restricted file and source it:

```sh
touch ~/.secrets && chmod 600 ~/.secrets
echo 'export ASANA_ACCESS_TOKEN=<your-pat>' >> ~/.secrets
```

```sh
# in ~/.zshrc or ~/.bashrc
[[ -f ~/.secrets ]] && source ~/.secrets
```

The profile now carries a path, not a credential, so it stays safe to commit and share. Non-secrets like `ASANA_WORKSPACE_GID` can stay in the profile — a workspace GID identifies, it does not authorize.

Better still, skip the long-lived secret entirely: [OAuth](#oauth) stores a self-refreshing token in a `0600` file under `~/.config/cyber-asana`, so nothing sensitive touches your shell config. A password manager's CLI works too — `export ASANA_ACCESS_TOKEN=$(op read op://vault/asana/token)` keeps the value out of the filesystem altogether.

If a PAT has already been sitting in a shared or committed file, treat it as compromised and issue a new one at [app.asana.com/0/my-apps](https://app.asana.com/0/my-apps) — deleting the line does not revoke the token, and rewriting git history does not un-publish it.

To see which credential is actually in effect — including any source being shadowed by a higher-precedence one:

```sh
cyber-asana auth status
```

It reads local state only, never calls the API, and exits `0` even when no credential is set — so it still answers when every other command is failing with `401`. The token is shown masked. Precedence is `--token` > `ASANA_ACCESS_TOKEN` > `ASANA_TOKEN`.

It also names any variable that is set but holds an unexpanded `${VAR}` reference, which happens when an agent host passes the reference text through instead of substituting a value:

```text
Status      not authenticated
Unexpanded  ASANA_ACCESS_TOKEN (set, but holds an unexpanded ${VAR} reference — the agent host did not substitute a value)
```

Such a value is never treated as a credential, so it cannot shadow a token further down the chain. Fix it by exporting the variable in the environment that launches the agent.

### OAuth

A PAT is the simpler choice for a single user. OAuth is worth the setup when several people use the same install, or when you want a credential that refreshes itself instead of living forever in your shell profile.

cyber-asana uses **your own** Asana app, so no third-party registration ever sees your data. Create one at [app.asana.com/0/my-apps](https://app.asana.com/0/my-apps) — it must be an **API app**, not an **MCP app**. The two are separate registrations: [per Asana](https://developers.asana.com/docs/integrating-with-asanas-mcp-server), tokens issued for MCP apps only work with Asana's hosted MCP server, and standard API requests need an API app. cyber-asana talks to the REST API, so an MCP app's client id will not work here. Then:

```sh
export ASANA_API_CLIENT_ID=<client-id>
export ASANA_API_CLIENT_SECRET=<client-secret>
cyber-asana auth login
```

`ASANA_API_CLIENT_ID` / `ASANA_API_CLIENT_SECRET` are names cyber-asana defines, not official Asana variables. They exist so the API app's credentials can sit alongside an MCP app's — see [Using alongside official Asana MCP](#using-alongside-official-asana-mcp). `ASANA_CLIENT_ID` / `ASANA_CLIENT_SECRET` still work as a fallback.

### Which redirect URL to register

Asana requires redirect URLs to be `https`, with `urn:ietf:wg:oauth:2.0:oob` as the documented option for native and command-line apps. Two ways to run the flow:

| Your app's redirect URL | Command |
| --- | --- |
| `urn:ietf:wg:oauth:2.0:oob` | `cyber-asana auth login --manual` — Asana shows a code, you paste it |
| `http://localhost:7654/callback` (if your app accepts it) | `cyber-asana auth login` — the redirect is caught automatically |

`--manual` needs no local port and works over SSH. If you registered a different URL or port, pass `--redirect-uri <url>`; the callback listener binds the port from that URL.

`auth status`, `auth login`, `auth token`, and `auth logout` all accept `--client-id` and `--client-secret` directly, which is handy for a one-off or a first try without editing anything — pass them to `auth status` to see which registration a given pair would win against before you commit to it:

```sh
cyber-asana auth login --client-id <client-id> --client-secret <client-secret>
```

A secret passed as an argument lands in your shell history and is visible in the process list to anyone else on the machine, so prefer the env vars or `settings.json` for anything ongoing.

`auth login` opens the browser, captures the redirect on a loopback server bound to `127.0.0.1`, and stores the tokens. It is a one-time human step — agents inherit the stored credentials the same way they inherit a PAT.

After that, every command uses the stored credentials automatically, refreshing the access token when it is within a minute of expiring. Precedence is `--token` > `ASANA_ACCESS_TOKEN` > `ASANA_TOKEN` > stored credentials, so an env var still wins — and `auth status` names which one is in effect and lists the rest as ignored.

Credentials live under `$XDG_CONFIG_HOME/cyber-asana` (or `~/.config/cyber-asana`), split by who owns them:

| File | Contents | Written by |
| --- | --- | --- |
| `settings.json` | `client_id`, `client_secret` | you, by hand |
| `credentials.json` | access token, refresh token, expiry | the CLI, on every refresh |

Both are `0600`. The environment overrides `settings.json` per field; full precedence is `--client-id` / `--client-secret` > `ASANA_API_CLIENT_ID` / `ASANA_API_CLIENT_SECRET` > `ASANA_CLIENT_ID` / `ASANA_CLIENT_SECRET` > `settings.json`. `auth status` reports which registration won and which ones it shadows, so the precedence is never silent.

To get a token without storing it — for a one-off shell, a CI step, or a container:

```sh
cyber-asana auth login --no-store            # prints the access token
export ASANA_ACCESS_TOKEN=$(cyber-asana auth login --no-store --raw)
```

`--no-store` prints only the access token, which expires in an hour. The long-lived refresh token requires `--include-refresh-token`. Both put a live credential on stdout, where shell history, CI logs, and agent transcripts will capture it.

To feed the *stored* token to another tool without re-authorizing, use `auth token` — it refreshes first if the token is within a minute of expiring, so what it prints is always usable:

```sh
curl -H "Authorization: Bearer $(cyber-asana auth token)" https://app.asana.com/api/1.0/users/me
```

`auth logout` revokes the grant with Asana and then deletes the local credentials. Revoking first matters: Asana revokes only refresh tokens, so once the file is gone there is nothing left to revoke with. If revocation fails the credentials are still deleted, and the output tells you the grant may still be live so you can remove it at [app.asana.com/0/my-apps](https://app.asana.com/0/my-apps). `--local` skips revocation, and logging out twice is not an error.

## Agent skills

`cyber-asana` ships workflow skills under [`packages/cyber-asana/skills/`](packages/cyber-asana/skills/) for Cursor, Claude Code, and other agents. **Start here** — skills encode when to use MCP tools vs CLI, how to resolve projects from repo config, and common workflows (standups, sprint reports, task creation).

### Install skills

The skills, the MCP server, and the CLI ship together as a plugin inside the `cyber-asana` npm package. Installing the plugin gets you all three at once:

```sh
/plugin marketplace add cyberuni/cyber-asana
/plugin install cyber-asana@cyberuni
```

Claude Code installs the plugin with `npm install cyber-asana` and updates it when you bump the package, so there is no clone to keep in sync. See [Plugin distribution](#plugin-distribution) for what the package contains.

To take the skills on their own:

```sh
npx skills add cyberuni/cyber-asana
```

Or link individual skills into your agent's skills directory (e.g. `~/.cursor/skills/`, `~/.claude/skills/`).

Set [authentication](#authentication) before running any workflow.

### Included skills

| Skill | Use when |
| --- | --- |
| [`init-asana`](packages/cyber-asana/skills/init-asana/SKILL.md) | First-time setup; `ASANA_ACCESS_TOKEN`, workspace GID, verify connection |
| [`pin-asana-projects`](packages/cyber-asana/skills/pin-asana-projects/SKILL.md) | Pin repo projects in `.agents/cyber-asana.json` via `project search` keywords |
| [`create-asana-task`](packages/cyber-asana/skills/create-asana-task/SKILL.md) | Create or file a task (URL parse, repo project lookup, MCP `asana_task_create`) |
| [`improve-description`](packages/cyber-asana/skills/improve-description/SKILL.md) | Clean up or rewrite a description — light copy-edit by default, opt-in emoji/template/tone, Asana's HTML subset |
| [`asana-standup`](packages/cyber-asana/skills/asana-standup/SKILL.md) | Standup update — recent completions and due-soon tasks |
| [`asana-sprint-report`](packages/cyber-asana/skills/asana-sprint-report/SKILL.md) | Sprint retro — completed vs incomplete in a project/section |
| [`sync-asana-project`](packages/cyber-asana/skills/sync-asana-project/SKILL.md) | Pull project tasks into local markdown for planning |
| [`create-tasks-from-code`](packages/cyber-asana/skills/create-tasks-from-code/SKILL.md) | Scan TODO/FIXME comments and create actionable Asana tasks |
| [`link-pr-to-task`](packages/cyber-asana/skills/link-pr-to-task/SKILL.md) | Post a GitHub PR URL as a comment on the related task |

Prefer **`create-asana-task`** over ad-hoc `asana_task_create` calls so agents resolve workspace, project, and URL fields consistently.

### Repo project registry

Agents and MCP tools can resolve human-readable project names without an API call. Commit a name → GID map at [`.agents/cyber-asana.json`](.agents/cyber-asana.json.example) (see example). Workspace GID stays in `ASANA_WORKSPACE_GID` — not in this file ([ADR](docs/adr/0001-no-workspace-gid-in-repo-config.md)).

```sh
cyber-asana config add <project-gid>              # seed or update an entry
cyber-asana config resolve-project "Backend" --json  # local lookup, no API
cyber-asana config sync                           # refresh cached names from Asana
cyber-asana config show
```

`asana_project_get` and `project get` opportunistically update cached names when results include `{ gid, name }`.

## Plugin distribution

The published npm package **is** the plugin root, so `npm install cyber-asana` yields a complete, installable plugin — no separate download and no repo clone.

```text
cyber-asana/                    # the package as installed
├── plugin.json                 # Agent Plugins 1.0.0 manifest
├── mcp.json                    # Agent Plugins 1.0.0 MCP config
├── skills/<name>/SKILL.md      # discovered from the fixed location
├── .claude-plugin/plugin.json  # Claude Code
├── .mcp.json                   # Claude Code MCP config
├── .cursor-plugin/plugin.json  # Cursor
├── .codex-plugin/plugin.json   # Codex
└── dist/                       # CLI and MCP server
```

`plugin.json` and `mcp.json` follow the [Agent Plugins specification](https://github.com/agentplugins/agent-plugins-spec) v1.0.0, whose manifest schema is closed: components are discovered from the fixed `skills/` and `mcp.json` locations rather than declared inline. Clients that predate the spec read their own manifest from the vendor directory beside it.

The spec expands only `${PLUGIN_ROOT}` and `${PLUGIN_DATA}`, so the portable `mcp.json` sets no `env` block — a `"${ASANA_ACCESS_TOKEN}"` value there would reach the server as that literal string and shadow the real token. Under a spec-conformant client, export the [authentication](#authentication) variables in the environment that launches the agent.

Claude Code's `.mcp.json` does expand `${VAR}`, so it passes the variables through explicitly, as do the Cursor and Codex manifests.

Either way the server defends itself: a value that is exactly an unexpanded reference, like `${ASANA_ACCESS_TOKEN}`, is treated as unset rather than as a credential. This matters because a host that cannot expand a reference forwards its text verbatim — Claude Code [does so when the variable is unset and has no default](https://code.claude.com/docs/en/mcp#environment-variable-expansion-in-mcp-json). Without that guard the placeholder would outrank the `ASANA_TOKEN` fallback and turn a missing token into a `401`.

Sources live under `packages/cyber-asana/`; the canonical universal manifest is `packages/cyber-asana/.plugin/plugin.json`, and `pnpm version` syncs every manifest's version from the package.

## MCP Server

`cyber-asana` ships a stdio MCP server. Set [authentication](#authentication) env vars (`ASANA_ACCESS_TOKEN`, optional `ASANA_WORKSPACE_GID`) before connecting.

Install `cyber-asana` in the project that hosts your agent (`npm install cyber-asana`). The host spawns a child process and talks MCP over stdio — not a shared daemon.

| Context | `command` | `args` |
| --- | --- | --- |
| Project dependency (`npm install cyber-asana`) | `node` | `["-e", "import('cyber-asana/mcp')"]` |
| Project dependency (bin on `PATH`) | `cyber-asana` | `["mcp"]` |
| Ephemeral (`npx`, no project install) | `npx` | `["-y", "cyber-asana", "mcp"]` |
| Developing this repo (`pnpm build`) | `node` | `["dist/cli.js", "mcp"]` or `["dist/mcp.js"]` — see [CONTRIBUTING.md](CONTRIBUTING.md) |

The package exports `./mcp` → `dist/mcp.js` and exposes the same server via `cyber-asana mcp`. Do not use `["--import", "cyber-asana/mcp"]` alone — without a main script, Node does not wire stdin to the MCP server and the host times out on `initialize`. `["--import", "cyber-asana/mcp", "-e", ""]` also works, but prefer the dynamic-import row above.

Tools return JSON by default. Set `CYBER_ASANA_MCP_FORMAT=toon` in the server's
`env` to emit token-efficient [TOON](#agent-friendly-output) instead — every
tool result (and structured errors) is re-encoded, with no change to tool names
or parameters.

### Using alongside official Asana MCP

You can run **both** the [official Asana MCP](https://developers.asana.com/docs/mcp-tools-reference) and cyber-asana in the same host. Tool names already differ (`create_tasks` vs `asana_task_create`), so the real conflict is the **config key** — use `"asana"` for the official server and `"cyber-asana"` for this package.

| Server | Config key | Auth | Env vars |
| --- | --- | --- | --- |
| Official Asana MCP | `asana` | OAuth 2.0 (hosted, **MCP app** you register) | `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET` (Asana's documented names) |
| cyber-asana | `cyber-asana` | Personal access token, or OAuth 2.0 + PKCE via [`auth login`](#oauth) (your own **API app**) | `ASANA_ACCESS_TOKEN`, optional `ASANA_WORKSPACE_GID`; for OAuth, `ASANA_API_CLIENT_ID` / `ASANA_API_CLIENT_SECRET` |

**Credentials are not interchangeable — neither the tokens nor the app registrations.**

Asana's hosted MCP server does not support dynamic client registration, so you pre-register an app of type **MCP app** and give the host its client id and secret ([integrating](https://developers.asana.com/docs/integrating-with-asanas-mcp-server), [connecting](https://developers.asana.com/docs/connecting-mcp-clients-to-asanas-v2-server)). Asana is explicit that this is a separate registration from the one the REST API uses:

> Tokens issued for MCP apps only work with the MCP server. If you need to make standard Asana API requests, create a separate API app and obtain tokens through the standard OAuth or PAT flow.

So:

- **Tokens** — MCP OAuth tokens from the official server cannot be used as `ASANA_ACCESS_TOKEN` for cyber-asana or the REST API, and a PAT cannot substitute for official MCP OAuth.
- **Client ids and secrets** — an MCP app's pair cannot drive `cyber-asana auth login`, which needs an API app's. Asana documents the MCP app's pair under `ASANA_CLIENT_ID` / `ASANA_CLIENT_SECRET`, so exporting one pair globally will not serve both servers. Give cyber-asana its API app through `ASANA_API_CLIENT_ID` / `ASANA_API_CLIENT_SECRET` (names cyber-asana defines) or `~/.config/cyber-asana/settings.json`, and keep the official server's pair scoped to the host config's `auth` block.

Dual-config example (Cursor-style; see [Asana's connecting doc](https://developers.asana.com/docs/connecting-mcp-clients-to-asanas-v2-server) for host-specific OAuth setup):

```json
{
  "mcpServers": {
    "asana": {
      "url": "https://mcp.asana.com/v2/mcp",
      "auth": {
        "CLIENT_ID": "${env:ASANA_CLIENT_ID}",
        "CLIENT_SECRET": "${env:ASANA_CLIENT_SECRET}"
      }
    },
    "cyber-asana": {
      "command": "node",
      "args": ["-e", "import('cyber-asana/mcp')"],
      "env": {
        "ASANA_ACCESS_TOKEN": "${ASANA_ACCESS_TOKEN}",
        "ASANA_WORKSPACE_GID": "${ASANA_WORKSPACE_GID}"
      }
    }
  }
}
```

Shell profile for dual setup — the official server's pair stays in the host config's `auth` block above rather than being exported, so it cannot be picked up by `cyber-asana auth login`:

```sh
export ASANA_ACCESS_TOKEN="..."   # cyber-asana PAT (create at app.asana.com → My Apps)
export ASANA_WORKSPACE_GID="..."  # cyber-asana default workspace (optional)
```

If you use OAuth for cyber-asana rather than a PAT, add its **API app** registration under the prefixed names, which outrank `ASANA_CLIENT_*`:

```sh
export ASANA_API_CLIENT_ID="..."      # cyber-asana API app
export ASANA_API_CLIENT_SECRET="..."  # cyber-asana API app
```

If your host reads the official server's credentials from the environment instead of the config file, `ASANA_CLIENT_ID` / `ASANA_CLIENT_SECRET` can hold the MCP app's pair — the prefixed names keep cyber-asana off them.

**Checking which registration cyber-asana picked up.** With both pairs exported, precedence decides silently — so confirm it before you hit the OAuth flow:

```sh
cyber-asana auth status
```

```
App          …cdef (ASANA_API_CLIENT_ID)
App ignored  ASANA_CLIENT_ID
```

`App` is the masked client id and the source it came from; `App ignored` names the registrations that source shadowed — here the MCP app's pair, correctly losing. If `App` reads `(ASANA_CLIENT_ID)` in a dual setup, cyber-asana is about to authorize with the MCP app. `--json` and `--toon` report the same as an `app` object (`client_id_masked`, `source`, `shadowed`), `null` when nothing resolves. The command is offline — it never calls Asana.

If the wrong registration does reach Asana, the token request fails with `invalid_client`; cyber-asana appends a hint about the API-app / MCP-app distinction to Asana's own message rather than replacing it.

**Migration:** If you already registered cyber-asana under the config key `"asana"`, rename it to `"cyber-asana"` before adding the official `"asana"` server. This is a host-config change only — not a package breaking change.

**Which server to use:**

| Prefer official `asana` | Prefer `cyber-asana` |
| --- | --- |
| Cross-type object search in one call: `search_objects`, `search_tasks_preview` | Single-type object search (`asana_search_objects`), `asana_url_parse`, repo config (`.agents/cyber-asana.json`) |
| Interactive previews: `create_task_preview`, `create_project_preview` | Subtasks, dependencies, followers, section placement |
| Asana AI agents: `get_agent`, `get_workspace_agents` | `asana_task_scan_todos`, `asana_project_export`, rich REST-backed writes |
| New MCP-only capabilities Asana ships first | Goals/tags/portfolios CRUD beyond V2 scope, portfolio items (`asana_portfolio_item_list`) |
| Simple reads when V2 coverage suffices | Status updates on projects/portfolios/goals (`asana_status_*`) |

Default: if both can do the job, prefer **official for discovery and previews** and **cyber-asana for write-heavy automation**. cyber-asana now also covers status updates and portfolio items via REST, so prefer it when you need those over the official read-only equivalents.

Shared JSON block (cyber-asana only, project install):

```json
{
  "mcpServers": {
    "cyber-asana": {
      "command": "node",
      "args": ["-e", "import('cyber-asana/mcp')"],
      "env": {
        "ASANA_ACCESS_TOKEN": "<your-pat>",
        "ASANA_WORKSPACE_GID": "<workspace-gid>"
      }
    }
  }
}
```

Ephemeral alternative (no `npm install`; uses the `cyber-asana mcp` subcommand):

```json
{
  "mcpServers": {
    "cyber-asana": {
      "command": "npx",
      "args": ["-y", "cyber-asana", "mcp"],
      "env": {
        "ASANA_ACCESS_TOKEN": "<your-pat>",
        "ASANA_WORKSPACE_GID": "<workspace-gid>"
      }
    }
  }
}
```

### Claude Desktop

| OS | Config file |
| --- | --- |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

Merge the shared JSON block above into the top-level `mcpServers` object. Restart Claude Desktop after saving.

### Claude Code

**User or local scope** (recommended for personal tokens):

```sh
claude mcp add -e ASANA_ACCESS_TOKEN=<your-pat> -e ASANA_WORKSPACE_GID=<workspace-gid> cyber-asana -- \
  node -e "import('cyber-asana/mcp')"
```

Official Asana MCP (OAuth; see [Asana connecting doc](https://developers.asana.com/docs/connecting-mcp-clients-to-asanas-v2-server) for exact flags):

```sh
claude mcp add --transport http asana https://mcp.asana.com/v2/mcp
```

**Project scope** — commit `.mcp.json` in the repo root. Claude Code expands `${VAR}` from your shell environment (export `ASANA_ACCESS_TOKEN` before launching):

```json
{
  "mcpServers": {
    "cyber-asana": {
      "command": "node",
      "args": ["-e", "import('cyber-asana/mcp')"],
      "env": {
        "ASANA_ACCESS_TOKEN": "${ASANA_ACCESS_TOKEN}",
        "ASANA_WORKSPACE_GID": "${ASANA_WORKSPACE_GID}"
      }
    }
  }
}
```

Verify with `claude mcp list`. Use `/mcp` in a session to reconnect without restarting.

### Cursor

User-wide: `~/.cursor/mcp.json`. Project-specific: `.cursor/mcp.json` in the repo root. Use the shared JSON block above. Reload MCP servers after changes; Agent mode is required for tool use.

### Codex

Add to `~/.codex/config.toml` (project-local Codex config is also supported under `.codex/config.toml`):

```toml
[mcp_servers.cyber-asana]
command = "node"
args = ["-e", "import('cyber-asana/mcp')"]

[mcp_servers.cyber-asana.env]
ASANA_ACCESS_TOKEN = "<your-pat>"
ASANA_WORKSPACE_GID = "<workspace-gid>"
```

### MCP Inspector

Debug tools and schemas without an agent host. UI defaults to [http://localhost:6274](http://localhost:6274).

Project dependency:

```sh
npx @modelcontextprotocol/inspector \
  -e ASANA_ACCESS_TOKEN=<your-pat> \
  -e ASANA_WORKSPACE_GID=<workspace-gid> \
  -- node -e "import('cyber-asana/mcp')"
```

Ephemeral (no project install):

```sh
npx @modelcontextprotocol/inspector \
  -e ASANA_ACCESS_TOKEN=<your-pat> \
  -e ASANA_WORKSPACE_GID=<workspace-gid> \
  -- npx -y cyber-asana mcp
```

Developing this repo (`pnpm build` first):

```sh
npx @modelcontextprotocol/inspector \
  -e ASANA_ACCESS_TOKEN="$ASANA_ACCESS_TOKEN" \
  -e ASANA_WORKSPACE_GID="$ASANA_WORKSPACE_GID" \
  -- node dist/cli.js mcp
```

Tools are named `asana_<resource>_<action>` (e.g. `asana_task_create`).

### MCP tools

| Resource | Tools |
| --- | --- |
| `workspace` | `asana_workspace_list`, `asana_workspace_get` |
| `project` | `asana_project_list`, `asana_project_get`, `asana_project_counts`, `asana_project_search`, `asana_project_create`, `asana_project_update`, `asana_project_delete`, `asana_project_export` |
| `task` | `asana_task_list`, `asana_task_my_tasks`, `asana_task_subtask_list`, `asana_task_subtask_create`, `asana_task_get`, `asana_task_get_many`, `asana_task_create`, `asana_task_update`, `asana_task_delete`, `asana_task_search`, `asana_task_follower_add`, `asana_task_follower_remove`, `asana_task_project_add`, `asana_task_project_remove`, `asana_task_dependency_list`, `asana_task_dependency_add`, `asana_task_dependency_remove`, `asana_task_dependent_list`, `asana_task_dependent_add`, `asana_task_dependent_remove`, `asana_task_scan_todos` |
| `task-template` | `asana_task_template_list`, `asana_task_template_get`, `asana_task_template_instantiate` |
| `section` | `asana_section_list`, `asana_section_get`, `asana_section_create`, `asana_section_update`, `asana_section_move`, `asana_section_task_add`, `asana_section_delete` |
| `user` | `asana_user_list`, `asana_user_get`, `asana_user_me` |
| `team` | `asana_team_list`, `asana_team_get` |
| `portfolio` | `asana_portfolio_list`, `asana_portfolio_item_list`, `asana_portfolio_get`, `asana_portfolio_create`, `asana_portfolio_update`, `asana_portfolio_delete` |
| `goal` | `asana_goal_list`, `asana_goal_get`, `asana_goal_create`, `asana_goal_update`, `asana_goal_delete` |
| `tag` | `asana_tag_list`, `asana_tag_get`, `asana_tag_create`, `asana_tag_update`, `asana_tag_delete`, `asana_tag_list_for_task`, `asana_tag_list_tasks`, `asana_tag_add_to_task`, `asana_tag_remove_from_task` |
| `ooo` | `asana_ooo_list`, `asana_ooo_get`, `asana_ooo_create`, `asana_ooo_update`, `asana_ooo_delete` |
| `attachment` | `asana_attachment_list`, `asana_attachment_get`, `asana_attachment_create`, `asana_attachment_delete` |
| `project-template` | `asana_project_template_list`, `asana_project_template_get`, `asana_project_template_instantiate` |
| `job` | `asana_job_get` |
| `status` | `asana_status_overview`, `asana_status_list`, `asana_status_get`, `asana_status_create`, `asana_status_delete` |
| `rule` | `asana_rule_trigger` (fires an Asana automation rule; the rule must use an "incoming web request" trigger) |
| `event` | `asana_event_list` (change feed; sync-token cursored, not paginated) |
| `story` | `asana_story_list`, `asana_story_get`, `asana_story_create`, `asana_story_update`, `asana_story_delete` |
| `comment` | `asana_comment_list`, `asana_comment_get`, `asana_comment_create`, `asana_comment_update`, `asana_comment_delete` (aliases for `story`) |
| `custom-field` | `asana_custom_field_list`, `asana_custom_field_get` (discover the field and enum-option GIDs that `asana_task_create` / `asana_task_update` expect), `asana_custom_field_list_for_project`, `asana_custom_field_list_for_portfolio`, `asana_custom_field_list_for_goal`, `asana_custom_field_list_for_team` |
| `membership` | `asana_membership_list`, `asana_membership_get`, `asana_membership_create`, `asana_membership_update`, `asana_membership_delete` |
| `search` | `asana_search_objects` (typeahead; one `resource_type` per call, single capped page, not exhaustive) |
| `url` | `asana_url_parse` (no API call; extracts GIDs from Asana app URLs) |

List tools accept `limit`, `offset`, `opt_fields`, `fetch_all`, and `max_pages` where Asana supports them.
Single-resource reads (`asana_<resource>_get` and `asana_user_me`) accept `opt_fields` too; leaving it out returns the same fields as before. `asana_membership_get` is the exception, because Asana's endpoint takes no `opt_fields`.
Paginated responses include `data`, `next_page`, and `limit`; fetch-all responses also include `page_count` and `truncated`.
`asana_user_list` omits `limit`; search tools are not paginated.

Notable parameters:

- `asana_rule_trigger` — `rule_trigger_gid` is generated by Asana on a rule's "incoming web request" trigger and can only be copied out of the Asana UI; `resource` is the task GID and `action_data` is a free-form object the rule's action reads. Beta, `task` only, and `402` means the workspace plan does not include it
- `asana_status_list` — `created_since` trims the history to updates posted after an ISO 8601 timestamp, which is the cheap way to ask what changed since the last check-in
- `asana_status_overview` — `parent_gid` is a project or portfolio GID; `limit` caps the portfolio item fan-out (default 25) and `truncated` reports the cap; `parent_type` skips detection and saves one call
- `asana_task_template_instantiate` — `name` names the created task; instantiation is a job, so the tool polls it for `timeout_seconds` (default 10) and returns the job with `new_task` once it succeeds. `wait: false` returns the pending job immediately
- `asana_event_list` — `resource_gid` is a task, project, or goal GID; omit `sync` on the first call and the response carries a fresh token with `sync_reset: true` and no events; pass that token back next time; poll again immediately while `has_more` is true (Asana caps one token at 100 events)
- `asana_task_list`, `asana_task_my_tasks`, `asana_task_subtask_list` — `incomplete: true` filters to incomplete tasks
- `asana_task_subtask_list` — `assignee_email`, `follower_emails`, `num_subtasks`, `custom_fields` expand returned fields
- `asana_task_create` — `project_gid`, `project_gids`, `follower_gids`, `html_notes`, `completed`, `due_on`, `due_at`, `start_on`, `start_at`, `parent_gid`, `resource_subtype`, `custom_fields`
- `asana_task_update` — `html_notes`, `due_on` / `clear_due_on`, `due_at` / `clear_due_at`, `start_on` / `clear_start_on`, `start_at` / `clear_start_at`, `assignee_gid` / `clear_assignee`, `parent_gid`, `clear_parent`, `resource_subtype`, `custom_fields`
- `asana_task_subtask_create` — takes the same write fields as `asana_task_create`; the parent and its workspace come from `task_gid`
- `asana_task_follower_add` / `asana_task_follower_remove` — manage followers on existing tasks
- `asana_goal_create` — `notes` or `html_notes` (mutually exclusive), `due_on`, `start_on` (Asana requires an accompanying due date)
- `asana_goal_update` — `name`, `notes` or `html_notes` (mutually exclusive), `due_on`, `clear_due_on`, `start_on`, `clear_start_on`; the clear flags send an explicit null, and naming a date together with its clear flag is rejected before any request is sent
- `asana_project_search` — `text`, `completed`, team/owner/member/portfolio filters, date filters, `sort_by`, `sort_ascending`, `opt_fields`
- `asana_project_counts` — `opt_fields` defaults to `num_tasks,num_incomplete_tasks,num_completed_tasks`
- `asana_project_template_instantiate` — `name`, `team_gid`, `public`, `requested_dates` (`[{gid, value}]` from the template's `requested_dates`), `wait` (default `true`), `timeout_seconds` (default 60). Returns `{ job, project_gid }`; a failed job or an expired wait is an error, never a success with a null `project_gid`
- `asana_attachment_create` — `connect_to_app` links the authenticated app to an external `url` attachment; Asana honours it only under an OAuth token, and a file upload rejects it locally
- `asana_tag_create` — `color`, `notes`, `follower_gids` (array or comma-separated); Asana takes followers only at creation, so `asana_tag_update` has no counterpart
- `asana_tag_update` — `name`, `color`, `clear_color` (Asana's tag colour is nullable), `notes`
- `asana_tag_delete` — idempotent, like every other delete: deleting a tag that is already gone answers `{ deleted: true, already_absent: true }` rather than a 404
- `asana_story_create` / `asana_comment_create` — `template: true` interpolates `{task.name}`, `{task.assignee}`, `{task.due_on}`, `{task.notes}`
- `asana_story_create` / `asana_story_update` (and the `comment` aliases) — `is_pinned` pins the comment to the top of its task; `sticker_name` attaches one of Asana's stickers
- `asana_story_update` / `asana_story_delete` (and the `comment` aliases) — `story_gid`; only comment stories you authored can be changed, and a refusal comes back as a `403` with a hint saying so
- `asana_portfolio_list` — `owner_gid` filters the listing to the portfolios one user owns. Asana honors it for service-account tokens only; a regular PAT can list just its own portfolios either way
- `asana_membership_list` — `parent_gid` (project, portfolio, goal, custom type, or custom field), `member_gid` (user or team), `resource_subtype`; pass `resource_subtype` when `parent_gid` is omitted
- `asana_search_objects` — `resource_type` (one of `actor`, `agent`, `custom_field`, `goal`, `portfolio`, `project`, `project_template`, `tag`, `task`, `team`, `user`), `query`, `count` (1–100, default 20), `opt_fields`. Turns a name into a GID; not paginated and not exhaustive
- `asana_custom_field_list_for_project` — the fields actually attached to one project, with their enum options. Narrower than `asana_custom_field_list`, and the right lookup before writing `custom_fields`: Asana rejects a payload naming a field the project does not have. Same shape for `_for_portfolio`, `_for_goal`, `_for_team`
- `asana_url_parse` — local URL parsing; use `workspace_gid` + `project_gid` for create; `list_view_gid` is not a section GID

Per-tool parameter schemas live in `src/<domain>/mcp.ts` (e.g. `src/tasks/mcp.ts`) and [`src/url-mcp.ts`](src/url-mcp.ts). MCP hosts also expose tool schemas at runtime when the server is connected.

For task creation workflows, use the [`create-asana-task`](packages/cyber-asana/skills/create-asana-task/SKILL.md) skill ([Agent skills](#agent-skills)).

## CLI

Terminal and scripting interface — same API surface as MCP, without an agent host. For agents, prefer [Agent skills](#agent-skills) and [MCP](#mcp-server) first.

```sh
cyber-asana <resource> <action> [options]
```

Output is human-readable by default. Add `--toon` for token-efficient
[TOON](#agent-friendly-output) (recommended for agents) or `--json` for raw API JSON.

List commands support pagination and field selection where Asana supports it:

```sh
cyber-asana task list --project <gid> --toon
cyber-asana task list --project <gid> --json
cyber-asana task list --project <gid> --limit 50 --offset <next_page.offset>
cyber-asana task list --project <gid> --all --max-pages 5
cyber-asana project list --opt-fields gid,name,permalink_url
```

`get` commands (and `user me`) take `--opt-fields` as well, to ask for fields Asana leaves out of a single-resource read.
Without it, a `get` returns the same fields as before. `membership get` is the exception, because Asana's endpoint takes no `opt_fields`.

```sh
cyber-asana section get <gid> --opt-fields name,project.name,created_at
```

List commands request 100 results per page by default.
When pagination is used, JSON output includes `data`, `next_page`, and `limit`.
Readable output prints the page table and a `Next offset` hint when another page is available (text mode only).
Use `--all` to fetch multiple pages intentionally; `--max-pages` caps the number of pages fetched.

### Agent-friendly output

The CLI follows a set of conventions that make its output cheap and unambiguous
for AI agents to consume:

- **Token-efficient output** — `--toon` emits [TOON](https://github.com/kunchenguid/axi#the-10-principles),
  a compact tabular format that drops repeated keys for ~40% fewer tokens than
  pretty JSON. Run with no arguments to see live data (the authenticated user)
  instead of help text.
- **Minimal default schemas** — every list command requests a small field set by
  default (task lists ask for only `gid,name,completed,due_on`); pass
  `--opt-fields` to widen.
- **Content truncation** — large text (task notes, project notes, status update
  and comment bodies) is truncated with a size hint; pass `--full` to get the
  complete value.
- **Definitive empty states** — empty results name what was empty, e.g.
  `0 tasks found`, never a blank line.
- **Aggregates & next steps** — list commands print a count summary and follow-up
  command suggestions in text mode (suppressed under `--toon`/`--json`).
- **Structured errors & exit codes** — under `--json`/`--toon`, errors are
  structured objects. Exit codes: `0` success, `1` generic, `2` usage (bad flag
  or subcommand), `3` auth/config, `4` forbidden, `5` not found, `6` rate limited,
  `7` above the workspace's plan level (Asana `402`).
- **Self-correcting usage errors** — an unknown flag reports the flags that
  command actually accepts, plus a `--help` pointer, and exits `2`.
- **Consistent help** — every resource group's `--help` ends with worked
  examples; the bare invocation reports `bin`, `description`, and `version`
  alongside the authenticated user.

All mutations are non-interactive (no prompts), so they are safe to script.
Mutation acknowledgements honor `--json`/`--toon` like every other command, and
deletes are idempotent — deleting something already gone succeeds, reporting
`already_absent: true`, instead of failing with a 404.

### Ambient context

Install a SessionStart hook so each agent session opens with live Asana context:

```sh
cyber-asana setup hook              # merges into .claude/settings.json
cyber-asana setup hook --dry-run    # report without writing
```

Installing twice is a no-op, and unrelated settings are preserved.

### Resources

| Resource | Actions |
|---|---|
| `workspace` | `list`, `get` |
| `project` | `list`, `get`, `counts`, `search`, `create`, `update`, `delete` |
| `task` | `list`, `my-tasks list`, `get`, `create`, `update`, `delete`, `subtask list`, `subtask create`, `search`, `project add/remove`, `follower add/remove`, `dependency list/add/remove`, `dependent list/add/remove` |
| `task-template` | `list`, `get`, `instantiate` |
| `section` | `list`, `get`, `create`, `update`, `move`, `delete`, `task add` |
| `user` | `list`, `get`, `me` |
| `team` | `list`, `get` |
| `portfolio` | `list`, `items`, `get`, `create`, `update`, `delete` |
| `goal` | `list`, `get`, `create`, `update`, `delete` |
| `tag` | `list`, `get`, `create`, `update`, `delete`, `tasks`, `task list/add/remove` |
| `ooo` | `list`, `get`, `create`, `update`, `delete` |
| `attachment` | `list`, `get`, `create`, `delete` |
| `project-template` | `list`, `get`, `instantiate` |
| `job` | `get` |
| `status` | `list`, `get`, `create`, `delete` |
| `event` | `list` |
| `story` | `list`, `get`, `create`, `update`, `delete` |
| `comment` | `list`, `get`, `create`, `update`, `delete` (alias for `story`) |
| `custom-field` | `list`, `get`, `project`, `portfolio`, `goal`, `team` |
| `membership` | `list`, `get`, `create`, `update`, `delete` |
| `setup` | `hook` |

### GID options

Commands that accept a resource GID support both a canonical `--foo-gid` flag and a shorter legacy alias `--foo`:

```sh
cyber-asana task list --project-gid <gid>
cyber-asana task list --project <gid>      # legacy alias
```

### Incomplete tasks

All task list commands accept `--incomplete` as a shorthand for `--completed-since now`:

```sh
# Only incomplete tasks in a project
cyber-asana task list --project <gid> --incomplete

# Only incomplete My Tasks
cyber-asana task my-tasks list --incomplete

# Only incomplete subtasks
cyber-asana task subtask list <task-gid> --incomplete
```

### Subtask opt_fields shortcuts

`task subtask list` provides named flags for commonly needed extra fields. These compose with `--opt-fields`:

```sh
# Get assignee emails for all incomplete subtasks
cyber-asana task subtask list <task-gid> --incomplete --assignee-email

# Get follower emails (for blast email)
cyber-asana task subtask list <task-gid> --follower-emails

# Combine shortcuts with custom opt-fields
cyber-asana task subtask list <task-gid> --assignee-email --opt-fields "due_on,notes"
```

| Flag | Adds to opt_fields |
|---|---|
| `--assignee-email` | `assignee,assignee.email` |
| `--follower-emails` | `followers,followers.email` |
| `--num-subtasks` | `num_subtasks` |
| `--custom-fields` | `custom_fields` |

### Task project membership

A task can belong to multiple projects simultaneously (multi-homing). Use `project add` and `project remove` to manage this, with optional section placement and insert positioning.

```sh
# Add task to a project (appended at end)
cyber-asana task project add <task-gid> <project-gid>

# Add into a specific section
cyber-asana task project add <task-gid> <project-gid> --section <section-gid>

# Position relative to another task
cyber-asana task project add <task-gid> <project-gid> --insert-after <other-task-gid>
cyber-asana task project add <task-gid> <project-gid> --insert-before <other-task-gid>

# Remove from a project (task is not deleted)
cyber-asana task project remove <task-gid> <project-gid>
```

`--insert-after` and `--insert-before` are mutually exclusive. Omitting both places the task at the end of the project or section.

`task create` also accepts a comma-separated project list with `--project-gid <gid[,gid...]>` or `--project <gid[,gid...]>` for initial multi-project placement.

### Task create and update fields

`task create` and `task update` support plain-text or HTML notes, custom field values, resource subtype, and parent relationships.

```sh
# Create a milestone task in multiple projects with HTML notes
cyber-asana task create "Launch" \
  --workspace-gid <workspace-gid> \
  --project-gid <proj-a,proj-b> \
  --resource-subtype milestone \
  --html-notes '<body><strong>Ship it</strong></body>'

# Update a task's parent and custom fields
cyber-asana task update <task-gid> \
  --parent-gid <parent-task-gid> \
  --custom-fields-json '{"<custom-field-gid>":"value"}'
```

`notes` and `html_notes` are mutually exclusive on both create and update.

| Flag | Command(s) | Notes |
|---|---|---|
| `--html-notes <html>` | `task create`, `task update` | Send task notes as HTML |
| `--completed` | `task create`, `task update` | Mark the task complete — on `create`, it is created already closed |
| `--due-on <date>` / `--clear-due-on` | `task create`, `task update` (clear: `task update`) | Due date (`YYYY-MM-DD`), or clear it |
| `--due-at <datetime>` / `--clear-due-at` | `task create`, `task update` (clear: `task update`) | Due date and time (ISO 8601 UTC), or clear it |
| `--start-on <date>` / `--clear-start-on` | `task create`, `task update` (clear: `task update`) | Start date (`YYYY-MM-DD`), or clear it |
| `--start-at <datetime>` / `--clear-start-at` | `task create`, `task update` (clear: `task update`) | Start date and time (ISO 8601 UTC), or clear it |
| `--clear-assignee` | `task update` | Unassign the task |
| `--parent-gid <gid>` / `--parent <gid>` | `task create`, `task update` | Set the task parent |
| `--clear-parent` | `task update` | Remove the task parent |
| `--resource-subtype <subtype>` | `task create`, `task update` | Example: `default_task`, `milestone` |
| `--custom-fields-json <json>` | `task create`, `task update` | JSON object keyed by custom field GID |
| `--custom-field <gid=value>` | `task create`, `task update` | Repeatable convenience override for simple values |
| `--follower <gid[,gid...]>` | `task create` | Add followers immediately after task creation |

Every flag in this table also works on `task subtask create`, except the ones that only
make sense on a top-level task (`--project-gid`, `--parent-gid`, `--workspace-gid`) and
the `--clear-*` flags, which belong to `task update`. A date and its date-time twin —
`--due-on` with `--due-at`, `--start-on` with `--start-at` — are mutually exclusive, and
Asana requires a due time in the same request when you set or clear `--start-at`.

When both custom-field forms are provided, repeated `--custom-field` entries override duplicate keys from `--custom-fields-json`.

Both forms are keyed by custom field GID. Use `cyber-asana custom-field list --workspace-gid <gid>` to find those GIDs, and `cyber-asana custom-field get <gid>` for an enum field's option GIDs.

When you already know the project, `cyber-asana custom-field project <project-gid>` is the narrower lookup — it lists only the fields attached to that project, with their enum options, which is what Asana will accept on a task there. `portfolio`, `goal`, and `team` do the same for those parents.

### Task followers

Use follower commands to add or remove followers on an existing task.

```sh
cyber-asana task follower add <task-gid> <user-gid> [<user-gid>...]
cyber-asana task follower remove <task-gid> <user-gid> [<user-gid>...]
```

### Task dependencies and dependents

Asana models dependencies as simple blocking relationships (Finish-to-Start only). A dependency is a task that must finish before this task can start; a dependent is a task that cannot start until this task finishes.

```sh
# List tasks this task depends on (includes completed/due_on by default)
cyber-asana task dependency list <task-gid>
cyber-asana task dependency list <task-gid> --opt-fields "gid,name,assignee"

# Add/remove dependencies
cyber-asana task dependency add <task-gid> <dep-gid> [<dep-gid>...]
cyber-asana task dependency remove <task-gid> <dep-gid> [<dep-gid>...]

# List tasks that are blocked by this task
cyber-asana task dependent list <task-gid>

# Add/remove dependents
cyber-asana task dependent add <task-gid> <dep-gid> [<dep-gid>...]
cyber-asana task dependent remove <task-gid> <dep-gid> [<dep-gid>...]
```

Asana enforces a combined limit of 30 dependencies and dependents per task.

### Task templates

Create a task — description, subtasks, assignees — from a template a project already keeps:

```sh
cyber-asana task-template list --project-gid <gid>
cyber-asana task-template get <gid>
cyber-asana task-template instantiate <gid> --name "Release 1.2"
```

Asana instantiates a task asynchronously and answers with a job. `instantiate` polls that
job for up to `--timeout` seconds (default 10) and prints the created task once it
succeeds; `--no-wait` returns the pending job immediately. Either way the job record is
what comes back, so a slow instantiation still yields a job GID. A `failed` job exits
non-zero.

Deleting a template is not supported — cyber-asana wraps using templates, not managing
them.

### Comments (stories)

`comment` is an alias for `story`. Both commands are identical:

```sh
cyber-asana comment list --task <gid>
cyber-asana comment create "Great work!" --task <gid>

# Equivalent:
cyber-asana story list --task <gid>
cyber-asana story create "Great work!" --task <gid>
```

Read, correct, or withdraw one comment by its story GID:

```sh
cyber-asana comment get <story-gid>
cyber-asana comment update <story-gid> "Corrected text"
cyber-asana comment update <story-gid> --html-text "<body><strong>Corrected</strong></body>"
cyber-asana comment update <story-gid> --pin
cyber-asana comment delete <story-gid>
```

`comment create --pin` posts a comment already pinned to the top of its task, and
`comment update --pin` / `--unpin` toggle Asana's `is_pinned` on an existing one without
replacing its text. Naming both is a usage error, caught before any request is sent. `--sticker
<name>` attaches one of Asana's twelve stickers; an unknown name is rejected locally.

Asana only permits editing and deleting comment stories you authored; system stories
(assignee changed, due date set) are immutable, and the refusal comes back as a `403` whose
hint says so. `comment delete` is idempotent — deleting a comment that is already gone
still succeeds.

Use `--template` to interpolate task data into the comment text before posting. Supported variables: `{task.name}`, `{task.assignee}`, `{task.due_on}`, `{task.notes}`.

```sh
cyber-asana comment create \
  "Hey {task.assignee}, your task '{task.name}' is due {task.due_on}. Please update!" \
  --task <gid> --template
```

### Task search filters

`task search` accepts an optional text query plus filters.

Filters that accept `<gid[,gid...]>` take one or more comma-separated GIDs.

```sh
# Text search
cyber-asana task search "login"

# Incomplete tasks in a project
cyber-asana task search --no-completed --project <gid>

# Overdue milestones assigned to a user
cyber-asana task search --assignee <user-gid> --subtype milestone --due-on-before 2026-01-01

# Blocked tasks, sorted by due date
cyber-asana task search --is-blocked --sort-by due_date --json

# Tasks modified this week, excluding a specific project
cyber-asana task search --modified-on-after 2026-05-17 --project-not <gid>
```

**Status filters:** `--completed/--no-completed`, `--subtask/--no-subtask`, `--has-attachment`, `--is-blocking`, `--is-blocked`

**Resource filters** (accept `<gid[,gid...]>`):
- `--assignee`, `--assignee-not`
- `--project`, `--project-not`, `--project-all`
- `--section`, `--section-not`, `--section-all`
- `--tag`, `--tag-not`, `--tag-all`
- `--team`, `--portfolio`
- `--follower`, `--follower-not`
- `--created-by`, `--created-by-not`
- `--assigned-by`, `--assigned-by-not`
- `--liked-by-not`, `--commented-on-by-not`

**Date filters** (YYYY-MM-DD for `*-on`, ISO 8601 for `*-at`):
- `--due-on`, `--due-on-before`, `--due-on-after`, `--due-at-before`, `--due-at-after`
- `--start-on`, `--start-on-before`, `--start-on-after`
- `--created-on`, `--created-on-before`, `--created-on-after`, `--created-at-before`, `--created-at-after`
- `--completed-on`, `--completed-on-before`, `--completed-on-after`, `--completed-at-before`, `--completed-at-after`
- `--modified-on`, `--modified-on-before`, `--modified-on-after`, `--modified-at-before`, `--modified-at-after`

**Other:** `--subtype <subtype>`, `--sort-by <field>`, `--sort-asc`, `--opt-fields <fields>`

### Project list filters

`project list` enumerates a workspace's projects. Asana hides archived projects from
the default listing, so pass `--archived` to see only archived projects, or
`--no-archived` to exclude them explicitly.

```sh
cyber-asana project list --workspace-gid <gid> --archived
cyber-asana project list --workspace-gid <gid> --no-archived
```

Omitting both flags leaves the filter unset and takes Asana's own default.

Archiving is a write, not a filter: `project update <gid> --archived` archives a
project and `--no-archived` restores it. `project create` accepts `--archived` too.

A project's owner is a write too: `--owner <user>` on `create` and `update` takes a
user GID, an email, or `me`, and `update --clear-owner` leaves the project unowned.

`--default-access-level <admin|editor|commenter|viewer>` sets the access members get
when they join the project, alongside the `--privacy-setting` that governs who can join.

### Project search filters

`project search` accepts an optional text query plus filters.

Filters that accept `<gid[,gid...]>` take one or more comma-separated identifiers.

```sh
# Search by name pattern
cyber-asana project search "launch" --workspace-gid <gid>

# Incomplete projects owned by me
cyber-asana project search --workspace-gid <gid> --no-completed --owner me

# Projects in a portfolio, sorted by due date
cyber-asana project search --workspace-gid <gid> --portfolio <gid> --sort-by due_date
```

**Status filters:** `--completed/--no-completed`

**Resource filters** (accept `<gid[,gid...]>`):
- `--team`
- `--owner`
- `--member`, `--member-not`
- `--portfolio`

**Date filters** (YYYY-MM-DD for `*-on`, ISO 8601 for `*-at`):
- `--completed-on`, `--completed-on-before`, `--completed-on-after`, `--completed-at-before`, `--completed-at-after`
- `--created-on`, `--created-on-before`, `--created-on-after`, `--created-at-before`, `--created-at-after`
- `--due-on`, `--due-on-before`, `--due-on-after`, `--due-at-before`, `--due-at-after`
- `--start-on`, `--start-on-before`, `--start-on-after`

**Other:** `--sort-by <field>`, `--sort-asc`, `--opt-fields <fields>`

Project search uses Asana’s premium search endpoint. Results may be eventually consistent, so newly changed projects may not appear immediately.

### Project task counts

Use `project counts` to read task-count fields from Asana’s project task-count endpoint.

```sh
# Default counts
cyber-asana project counts <project-gid>

# Request custom count fields
cyber-asana project counts <project-gid> --opt-fields num_tasks,num_completed_tasks
```

Asana returns no fields from this endpoint unless `opt_fields` is supplied. This wrapper defaults to `num_tasks,num_incomplete_tasks,num_completed_tasks`.

This endpoint has a stricter Asana rate/cost profile than ordinary project reads, so prefer the default field set unless you need additional count fields.

### Project templates

Templates are how a team encodes a project's structure once. `project-template list` and
`get` browse them; `instantiate` starts a real project from one.

```sh
cyber-asana project-template list --workspace-gid <gid>
cyber-asana project-template list --team-gid <gid>      # the team-scoped endpoint
cyber-asana project-template get <gid>                  # includes the template's date variables
cyber-asana project-template instantiate <gid> --name "Acme onboarding" --team-gid <gid>
```

`--team-gid` is required when the workspace is an organization.
`--privacy-setting <public_to_workspace|private_to_team|private>` sets the new project's
visibility; `--public` / `--private` are the older two-valued form of the same thing and
Asana has deprecated the `public` field behind them, so pass one form or the other, never
both. Omit all three to let Asana decide. Templates that ask for dates list them under
`requested_dates` in `project-template get`; pass each one as
`--requested-date <date-variable-gid>=<YYYY-MM-DD>` (repeatable). By default Asana
substitutes a default date for any variable you leave unfilled; `--strict-dates` makes an
unfilled variable an error instead, so a half-dated project never gets created silently. Templates that
carry roles take `--requested-role <template-role-gid>=<user>` the same way, where the user
is a GID, an email, or `me`.

Asana builds the project asynchronously and returns a job, so:

- **By default `instantiate` waits** for the job and prints the new project's GID. The wait is
  bounded by `--timeout <seconds>` (default 60), polling once a second. Expiry is an error
  naming the job, not a silent success.
- **A failed job is an error.** You never get an exit code 0 with a missing project GID.
- **`--no-wait`** skips polling and prints the job GID instead, for scripts that want to poll
  themselves with `cyber-asana job get <gid>`.

```sh
# Poll it yourself
job=$(cyber-asana project-template instantiate <gid> --name "Acme" --no-wait --json | jq -r .gid)
cyber-asana job get "$job"
```

A job's `status` is `not_started`, `in_progress`, `succeeded`, or `failed`; a succeeded
instantiation carries the project under `new_project`.

### Object search (typeahead)

Use `search objects` to turn a name into a GID — the entry point when you know what something is called but not its ID.

```sh
cyber-asana search objects project "website"
cyber-asana search objects user "ada" --count 5
cyber-asana search objects task --workspace-gid <gid> --toon
```

Asana accepts exactly one `resource-type` per call — `actor`, `agent`, `custom_field`, `goal`, `portfolio`, `project`, `project_template`, `tag`, `task`, `team`, or `user`. `actor` returns users and agents together.

This endpoint is autocomplete, not search: it returns a single page capped by `--count` (1–100, default 20), ordered by relevance/recency, and Asana states the results are not exhaustive. There is no pagination, so `--all`, `--offset` and `--limit` do not apply. For exhaustive, filterable results use [`task search`](#task-search-filters) or [`project search`](#project-search-filters).

### Examples

```sh
# List projects
cyber-asana project list

# Search projects
cyber-asana project search "launch" --workspace-gid <gid>

# Find a project by name when you only have the name
cyber-asana search objects project "website" --workspace-gid <gid>

# Create a task
cyber-asana task create "Fix the bug" --workspace-gid <gid> --project-gid <gid> --due-on 2026-06-01

# Search tasks
cyber-asana task search "login" --json
```

### Parse Asana URLs

Extract GIDs from pasted Asana app URLs without calling the API:

```sh
cyber-asana url parse 'https://app.asana.com/1/<workspace>/project/<project>/list/<view>' --json
```

Supported paths include `/project/...`, `/project/.../task/...`, `/project/.../list/...`, and legacy `/0/<workspace>/<task>`.

| Field | Use for task create? |
| --- | --- |
| `workspace_gid` | Yes |
| `project_gid` | Yes |
| `task_gid` | Comments, updates — not create |
| `list_view_gid` | **No** — browser list-view metadata, not a section GID |

For agent-driven task creation and repo project lookup, see [Agent skills](#agent-skills) (`create-asana-task`, repo config).

## License

MIT
