---
'cyber-asana': minor
---

Add `listTimePeriods` to the goals library surface and a `time_period` field on goal creation, which Asana requires. `pnpm test:system:setup` now also finds or creates a `cyber-asana system test` goal and prints `ASANA_SYSTEM_TEST_GOAL_GID`.
