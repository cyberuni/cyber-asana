---
'cyber-asana': patch
---

Fix `events get` dropping the sync token and `has_more` after the first call. Asana returns them on the response body, not on the page object the SDK hands back, so every follow-up poll reported no token and an exhausted feed.
