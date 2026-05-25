# ADR 0001: No workspace GID in repo config

## Status

Accepted

## Context

cyber-asana supports a commit-friendly repo config (`.agents/cyber-asana.json`) mapping project names to GIDs so agents can create tasks without searching the workspace every time.

We considered storing `workspace_gid` alongside the project list.

## Decision

Repo config stores **projects only** (`{ gid, name }[]`). Workspace binding stays in private environment configuration (`ASANA_WORKSPACE`) or per-request inputs (URL parse, explicit GID).

Task create still requires `workspace_gid` at API time — from env, URL, or user prompt — never from the committed config file.

## Rationale

- Committed config is world-readable in git. A workspace GID narrows blast radius if a token is exposed (targeted workspace enumeration and abuse).
- Project GIDs are task-scoped identifiers teams already share in URLs and task links.
- Workspace selection is an operator concern (which org/account), not a per-repo project map concern.

## Consequences

- Agents must have `ASANA_WORKSPACE` set (or infer workspace from a URL) in addition to reading `.agents/cyber-asana.json`.
- Config schema stays minimal: `schema_version` + `projects`.
