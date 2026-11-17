---
title: Notifications
description: Read and clear your Asana inbox.
sidebar:
  order: 27
---

:::caution[Beta]
Asana's notification endpoints are in beta and may change. Commands here may need updating when they do.
:::

List the notifications in your inbox, then mark the handled ones read, or flag some unread again.

```sh
cyber-asana notification list --workspace-gid <gid> --unread
cyber-asana notification mark-read <notification-gid> [<notification-gid>...] --workspace-gid <gid>
cyber-asana notification mark-unread <notification-gid> --workspace-gid <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--workspace-gid <gid>` (required, or `ASANA_WORKSPACE_GID`), `--user-gid <gid>` (default `me`), `--unread`, [pagination](/cyber-asana/cli/#pagination) |
| `mark-read` | `<notification-gids...>` (1 to 50) | `--workspace-gid <gid>`, `--user-gid <gid>` |
| `mark-unread` | `<notification-gids...>` (1 to 50) | `--workspace-gid <gid>`, `--user-gid <gid>` |

A user can only read and change their own notifications. `list` returns the newest first, 50 per
page by default.

Asana has no unread filter. `--unread` drops the read notifications from each page after it is
fetched, so a page can hold fewer than `--limit`; follow the next-page hint to see more.

A mark call does not fail when some GIDs cannot be updated (missing, not yours, or deleted).
It succeeds and lists them as `failed_gids`; the command prints them.
