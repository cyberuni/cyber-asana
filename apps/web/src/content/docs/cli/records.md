---
title: Records
description: Read and write the rows of an Asana table, search them, and comment on them.
sidebar:
  order: 30
---

A record is one row of a [table](/cyber-asana/cli/tables/). Its values are custom fields keyed by
custom field GID.

```sh
cyber-asana record list <table-gid>
cyber-asana record search --workspace-gid <gid> --text Renewal --table <table-gid>
cyber-asana record get <gid> --opt-fields custom_fields.name,custom_fields.display_value
cyber-asana record create "Q3 renewal" --table <table-gid> --field <field-gid>=Acme --fingerprint q3-acme
cyber-asana record update <gid> --field <field-gid>=Globex
cyber-asana record delete <gid>
cyber-asana record stories list <gid> --comments-only
cyber-asana record stories create <gid> --text "Sent the quote"
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | `<table-gid>` | `--sort-by created_at`, `--modified-since <datetime>`, [pagination](/cyber-asana/cli/#pagination) |
| `search` | — | `--workspace-gid <gid>`, `--text`, `--table <gids>`, `--exclude-table <gids>`, `--team <gids>`, `--follower <users>`, `--created-after <datetime>`, `--created-before <datetime>`, `--sort-by created_at\|modified_at`, `--ascending`, `--limit`, `--opt-fields` |
| `get` | `<gid>` | `--opt-fields <fields>` |
| `create` | `<name>` | `--table-gid <gid>` / `--table <gid>`, `--field <gid=value>` (repeatable), `--fields-json <json>`, `--fingerprint <value>` |
| `update` | `<gid>` | `--name`, `--field`, `--fields-json`, `--default-access-level` (at least one) |
| `delete` | `<gid>` | Deleting a record that is already gone succeeds |
| `stories list` | `<record-gid>` | `--comments-only`, `--created-after <datetime>`, `--newest-first`, [pagination](/cyber-asana/cli/#pagination) |
| `stories create` | `<record-gid>` | `--text <text>` or `--html-text <html>` |

- **Writing fields:** only custom fields already on the record's table can be written; unlike
  tasks, a record does not accept a value for a field the table lacks.
- **Duplicates:** `--fingerprint` makes a create fail with `409` when the table already holds a
  record with that fingerprint.
- **Search:** it needs a paid plan (`402` otherwise), returns one unstable page with no offset,
  and lags writes by 10 to 60 seconds. Use `list` to read your own write.
- **Comments:** Asana creates only comment stories on a record.
