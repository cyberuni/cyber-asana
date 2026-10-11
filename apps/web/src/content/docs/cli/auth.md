---
title: Authentication
description: Personal access tokens, OAuth login, and inspecting which credential is in use.
sidebar:
  order: 12
---

cyber-asana accepts either a personal access token or an OAuth grant obtained through
`auth login`.

## Credential sources

Resolved in this order — the first one found wins:

1. `--token <token>` on the command
2. `ASANA_ACCESS_TOKEN` environment variable
3. The stored OAuth credential from `cyber-asana auth login`

A personal access token is the simplest start — create one at
[app.asana.com → My Apps](https://app.asana.com/0/my-apps):

```sh
export ASANA_ACCESS_TOKEN="<pat>"
export ASANA_WORKSPACE_GID="<workspace-gid>"   # optional, saves --workspace-gid everywhere
```

## Checking what is in use

```sh
cyber-asana auth status
```

Reports whether you are authenticated, which source won, the masked token, the account it
belongs to, expiry if any, and which other credentials were shadowed — all without calling
the Asana API. When nothing is configured it prints the two ways to fix that.

It also reports the app registration `auth login` would authorize with, which resolves from
a [separate chain](#app-registration-sources) — so a token that works says nothing about
whether the registration is the right one:

```
Status       authenticated
Source       ASANA_ACCESS_TOKEN
Token        …bbbb
App          …cdef (ASANA_API_CLIENT_ID)
App ignored  ASANA_CLIENT_ID
```

`App` names the masked client id and the source it came from; `App ignored` lists the
registrations that source shadowed. With `--json` (or `--toon`) the same appears as an `app`
object, `null` when no registration resolves:

```json
{
  "app": {
    "client_id_masked": "…cdef",
    "source": "ASANA_API_CLIENT_ID",
    "shadowed": ["ASANA_CLIENT_ID"]
  }
}
```

## OAuth login

```sh
cyber-asana auth login
cyber-asana auth login --no-store --raw
cyber-asana auth logout
```

`login` opens the browser, listens on a loopback callback, and stores the credential
locally. It runs against your own Asana app, which must be registered as an **API app** —
tokens from an **MCP app** work only with Asana's hosted MCP server.

```sh
export ASANA_API_CLIENT_ID="<client-id>"
export ASANA_API_CLIENT_SECRET="<client-secret>"
```

| Option | Command | Description |
| --- | --- | --- |
| `--client-id <id>` | `status`, `login`, `token`, `logout` | OAuth client ID — overrides `ASANA_API_CLIENT_ID`, `ASANA_CLIENT_ID`, and `settings.json` |
| `--client-secret <secret>` | `status`, `login`, `token`, `logout` | OAuth client secret (visible in shell history — prefer the env var) |
| `--no-store` | `login` | Print the token instead of saving it |
| `--include-refresh-token` | `login` | Also print the long-lived refresh token (implies `--no-store`) |
| `--raw` | `login` | Print only the token, for shell substitution |
| `--scope <list>` | `login` | Comma-separated scopes to request |
| `--manual` | `login` | Paste the code from the browser instead of listening for a redirect |
| `--redirect-uri <uri>` | `login` | Redirect URL registered for the app (default: the loopback URL) |
| `--port <port>` | `login` | Callback port |
| `--local` | `logout` | Delete local credentials without revoking the grant |

Use `--manual` when you are on a remote or headless machine where the browser cannot reach
the loopback listener.

### App registration sources

The client id and secret resolve independently, in this order:

1. `--client-id` / `--client-secret` on the command
2. `ASANA_API_CLIENT_ID` / `ASANA_API_CLIENT_SECRET` environment variables
3. `ASANA_CLIENT_ID` / `ASANA_CLIENT_SECRET` environment variables
4. `client_id` / `client_secret` in `~/.config/cyber-asana/settings.json`

`ASANA_API_CLIENT_ID` and `ASANA_API_CLIENT_SECRET` are names cyber-asana defines — they are
not official Asana variables. They exist because Asana's docs use `ASANA_CLIENT_ID` /
`ASANA_CLIENT_SECRET` for the hosted MCP server's **MCP app**, whose credentials do not work
here; the prefixed pair lets both registrations coexist. `ASANA_CLIENT_ID` /
`ASANA_CLIENT_SECRET` still work as a fallback.

Run [`auth status`](#checking-what-is-in-use) to see which of these won and which were
shadowed. If an MCP app's id reaches the token endpoint anyway, Asana answers with
`invalid_client`, and cyber-asana appends a hint naming this distinction to Asana's own
message.

## Printing the stored token

```sh
cyber-asana auth token
```

Prints the stored access token, refreshing it first when it is close to expiring. Useful
for handing a fresh token to another tool:

```sh
curl -H "Authorization: Bearer $(cyber-asana auth token)" \
  https://app.asana.com/api/1.0/users/me
```

:::caution
Nothing from Asana's official MCP server is interchangeable with these. Its OAuth tokens
cannot be used as `ASANA_ACCESS_TOKEN`, a PAT cannot substitute for official MCP OAuth, and
its **MCP app** client id and secret cannot drive `auth login`, which needs an **API app**.
:::
