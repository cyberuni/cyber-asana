---
'cyber-asana': minor
---

Remove the deprecated `ASANA_TOKEN` and `ASANA_WORKSPACE` environment variables. Only `ASANA_ACCESS_TOKEN` and `ASANA_WORKSPACE_GID` are read; rename the old variables if you still set them. `auth status` no longer lists `ASANA_TOKEN` as a credential source.

The workspace fallback on `--workspace-gid` now goes through the same guard as the token, so an unexpanded `${ASANA_WORKSPACE_GID}` placeholder counts as unset instead of being sent as the GID.
