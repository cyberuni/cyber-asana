---
"cyber-asana": patch
---

`task update` accepts `--no-completed` to reopen a completed task, sending `completed: false`. Omitting both `--completed` and `--no-completed` still leaves completion untouched.
