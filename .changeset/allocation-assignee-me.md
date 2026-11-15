---
"cyber-asana": patch
---

Fix `allocation list --assignee me` and `allocation create --assignee me` (and the `asana_allocation_*` tools). Asana answers "Not a recognized ID: me" for an allocation assignee, so `me` is now swapped for your user GID before the request.
