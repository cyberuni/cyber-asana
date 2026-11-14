---
title: Portfolios
description: Manage Asana portfolios and list the projects inside them.
sidebar:
  order: 8
---

Portfolios group projects for roll-up reporting. `list` and `create` fall back to
`ASANA_WORKSPACE_GID` when `--workspace-gid` is omitted.

```sh
cyber-asana portfolio list
cyber-asana portfolio list --owner-gid <user-gid>
cyber-asana portfolio get <gid>
cyber-asana portfolio items <gid>
cyber-asana portfolio create "2026 Roadmap"
cyber-asana portfolio update <gid> --name "2026 Roadmap (H1)"
cyber-asana portfolio delete <gid>
cyber-asana portfolio item add <portfolio-gid> <project-gid>
cyber-asana portfolio item remove <portfolio-gid> <project-gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--workspace-gid <gid>` / `--workspace <gid>`, `--owner-gid <gid>` / `--owner <gid>`, `--custom-type <gid>`, [pagination](/cyber-asana/cli/#pagination) |
| `items` | `<gid>` | [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | — |
| `create` | `<name>` | `--workspace-gid <gid>` / `--workspace <gid>` |
| `update` | `<gid>` | `--name <name>` |
| `delete` | `<gid>` | — |
| `item add` | `<portfolio-gid> <item-gid>` | `--insert-before <gid>`, `--insert-after <gid>` |
| `item remove` | `<portfolio-gid> <item-gid>` | — |

`items` lists the projects a portfolio contains.

`--owner-gid` narrows `list` to the portfolios one user owns. Asana honors it for service-account
tokens only; a regular personal access token can list just its own portfolios either way.

`--custom-type` narrows `list` to portfolios of one custom type. An empty value selects portfolios
with no custom type.

`item add` puts a project or a nested portfolio in a portfolio; `item remove` takes it out. Both are
idempotent: adding an item already there reports `already_added`, removing one that is not there
reports `already_removed`, and both exit `0`. Portfolio members are managed with
[`membership`](/cyber-asana/cli/memberships/).

## Related

- Filter a project search by portfolio: [`project search --portfolio`](/cyber-asana/cli/projects/#search)
- Post a portfolio status update: [`status create --parent <portfolio-gid>`](/cyber-asana/cli/status-updates/)
