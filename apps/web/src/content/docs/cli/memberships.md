---
title: Memberships
description: See who has access to a project, portfolio, or goal — and change it.
sidebar:
  order: 18
---

A membership links a **member** (a user or a team) to a **parent** (a project, portfolio,
goal, custom type, or custom field) at an **access level**. This is how you answer "who is
on this project?", check an assignment is sane before making it, or add someone during
onboarding.

```sh
cyber-asana membership list --parent-gid <project-gid>
cyber-asana membership list --parent-gid <project-gid> --member-gid <user-gid>
cyber-asana membership list --member-gid <team-gid> --resource-subtype project_membership
cyber-asana membership get <gid>
cyber-asana membership create --parent-gid <project-gid> --member-gid <user-gid> --access-level editor
cyber-asana membership update <gid> --access-level viewer
cyber-asana membership delete <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--parent-gid <gid>` / `--parent <gid>`, `--member-gid <gid>` / `--member <gid>`, `--resource-subtype <subtype>`, [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | — |
| `create` | — | `--parent-gid <gid>`, `--member-gid <gid>`, `--access-level <level>` |
| `update` | `<gid>` | `--access-level <level>` (required) |
| `delete` | `<gid>` | — |

`list` needs `--parent-gid`, or `--member-gid` together with `--resource-subtype` — Asana
rejects any other combination, so the CLI reports it as a usage error before calling the
API. `--member-gid` on its own narrows a parent's memberships to one person or team.

`list` returns `gid`, `member.name`, and `access_level` by default. The person or team sits
under `member`, not `user`, so `--opt-fields` paths must start with `member.`: ask for
`member.name`, not `user.name`. Asana silently ignores a field the resource does not have,
so `--opt-fields user.name,user.email` returns rows with nothing but a `gid`.

Access levels depend on the parent: projects and goals accept `admin`, `editor`,
`commenter`, and `viewer`; portfolios accept `admin`, `editor`, and `viewer`. The value is
passed through to Asana, which rejects a level the parent does not support.

`update` only changes the access level — that is the whole of what Asana's membership
update does. Broader permission management lives in
[Roles](https://developers.asana.com/reference/roles), which is not wrapped.

`delete` is idempotent: deleting a membership that is already gone succeeds and reports
`already_absent`.

## Related

- Find the user or team GID to pass as `--member-gid`: [People & places](/cyber-asana/cli/people/)
- Team membership (who is in a team) is a separate Asana resource and is not wrapped — see
  [API coverage](/cyber-asana/reference/api-coverage/)
