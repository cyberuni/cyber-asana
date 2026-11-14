---
title: Custom fields
description: Discover the custom field and enum-option GIDs that task writes are keyed by.
sidebar:
  order: 16
---

Asana keys custom field writes by GID — `task create` and `task update` take
`--custom-field <gid>=<value>` and `--custom-fields-json '{"<gid>":"<value>"}'`. This group
is how you find those GIDs without leaving the CLI.

Creating a field, managing its enum options, and attaching it to a project are covered
below. Editing a field's other properties and deleting a field are not wrapped — see
[API coverage](/cyber-asana/reference/api-coverage/).

## Commands

```sh
cyber-asana custom-field list
cyber-asana custom-field get <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--workspace-gid <gid>` / `--workspace <gid>`, [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | — |
| `create` | `<name>` | `--workspace-gid <gid>`, `--type <text\|enum\|multi_enum\|number\|date\|people>` (default `text`), `--description`, `--option <name>` (repeatable, enum types), `--precision` |
| `enum-option add` | `<field-gid> <name>` | `--color`, `--insert-before <option-gid>`, `--insert-after <option-gid>` |
| `enum-option move` | `<field-gid> <option-gid>` | exactly one of `--before <option-gid>`, `--after <option-gid>` |
| `enum-option update` | `<option-gid>` | `--name`, `--color`, `--disabled`, `--enabled` |
| `attach` | `<project-gid> <field-gid>` | `--important` |
| `detach` | `<project-gid> <field-gid>` | — |

`list` requests `gid,name,resource_subtype` by default. The subtype is the part that matters
when you go to write: it tells you whether the value you send is text, a number, or an enum
option GID.

```
NAME      TYPE    ID
--------  ------  ----------
Priority  enum    1201234567
Estimate  number  1201234568
```

## Enum options

Enum options are nested inside the field, so `get` covers option discovery:

```sh
cyber-asana custom-field get 1201234567
```

```
Name  Priority
ID    1201234567
Type  enum

OPTION  ID          ENABLED
------  ----------  -------
High    1209876543  yes
Medium  1209876544  yes
Low     1209876545  yes
```

## Setting a value

Feed the GIDs straight into a task write:

```sh
# enum — the value is the option GID
cyber-asana task update <task-gid> --custom-field 1201234567=1209876543

# number or text — the value is literal
cyber-asana task update <task-gid> --custom-field 1201234568=5
```

See [Tasks](/cyber-asana/cli/tasks/) for the full set of write options.

## Creating and attaching a field

```sh
cyber-asana custom-field create Sprint --workspace-gid <gid> --type enum --option "Sprint 1"
cyber-asana custom-field attach <project-gid> <field-gid>
cyber-asana custom-field enum-option add <field-gid> "Sprint 2" --insert-after <option-gid>
```

`attach` and `detach` are idempotent: attaching a field the project already has, or detaching
one it does not have, exits `0` with status `already_attached` or `already_detached` and
writes nothing. The `custom_fields` payload of a task write works only for fields attached to
one of the task's projects.

The matching MCP tools are `asana_custom_field_create`, `asana_custom_field_enum_option_create`,
`asana_custom_field_enum_option_insert`, `asana_custom_field_enum_option_update`,
`asana_custom_field_attach`, and `asana_custom_field_detach`.
