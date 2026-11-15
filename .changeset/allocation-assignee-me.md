---
"cyber-asana": patch
---

Fix `allocation list --assignee me`, `allocation create --assignee me`, and the `asana_allocation_*` tools taking `assignee: "me"`. Asana's allocations endpoints reject the `me` alias with a 404, so the api layer now resolves it to the caller's GID once per call; a real GID passes through untouched.
