---
title: Portfolios
description: Manage Asana portfolios and list the projects inside them.
sidebar:
  order: 8
---

Portfolios group projects for roll-up reporting. `list` and `create` fall back to
`ASANA_WORKSPACE` when `--workspace-gid` is omitted.

```sh
cyber-asana portfolio list
cyber-asana portfolio list --owner-gid <user-gid>
cyber-asana portfolio get <gid>
cyber-asana portfolio items <gid>
cyber-asana portfolio create "2026 Roadmap"
cyber-asana portfolio update <gid> --name "2026 Roadmap (H1)"
cyber-asana portfolio delete <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--workspace-gid <gid>` / `--workspace <gid>`, `--owner-gid <gid>` / `--owner <gid>`, `--custom-type <gid>`, [pagination](/cyber-asana/cli/#pagination) |
| `items` | `<gid>` | [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | — |
| `create` | `<name>` | `--workspace-gid <gid>` / `--workspace <gid>` |
| `update` | `<gid>` | `--name <name>` |
| `delete` | `<gid>` | — |

`items` lists the projects a portfolio contains.

`--owner-gid` narrows `list` to the portfolios one user owns. Asana honors it for service-account
tokens only; a regular personal access token can list just its own portfolios either way.

`--custom-type` narrows `list` to portfolios of one custom type. An empty value selects portfolios
with no custom type.

Adding and removing portfolio items is not wrapped — see
[API coverage](/cyber-asana/reference/api-coverage/). Portfolio members are managed with
[`membership`](/cyber-asana/cli/memberships/).

## Related

- Filter a project search by portfolio: [`project search --portfolio`](/cyber-asana/cli/projects/#search)
- Post a portfolio status update: [`status create --parent <portfolio-gid>`](/cyber-asana/cli/status-updates/)
