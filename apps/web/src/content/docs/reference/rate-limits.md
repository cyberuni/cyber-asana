---
title: Rate limits
description: How cyber-asana stays inside Asana's request limits across the CLI, the MCP server, and the library.
---

Every request, from the CLI, the MCP server, and the library alike, goes through one limiter
per token. It keeps you under Asana's [rate limits](https://developers.asana.com/docs/rate-limits).

- A call that would go over **waits** instead of failing, and says so on stderr
  (`waiting 59s to stay within the Asana rate limit`).
- A `429` that still gets through is **retried** up to three times, after the wait in
  `Retry-After`.
- The CLI exits `6` if the limit still blocks the call.

## Configure your plan

Asana allows 150 requests a minute on a free plan, 1,500 on a paid one, and 60 a minute for
search. Tell cyber-asana which you have:

```sh
export ASANA_PLAN=paid                  # free (default) or paid
export ASANA_RATE_LIMIT_PER_MINUTE=300  # optional: set the budget yourself
```

The default budget is 80% of the limit, so another tool on the same token has room:

| Plan | Default budget per minute | Search |
| --- | --- | --- |
| `free` | 120 | 48 |
| `paid` | 1,200 | 48 |

An unset or unrecognised `ASANA_PLAN` counts as `free`. `ASANA_RATE_LIMIT_PER_MINUTE` must be a
positive whole number and replaces the plan's budget; search keeps its own.

Pair this with [pagination](/cyber-asana/cli/#pagination): `--all` follows pages up to
`--max-pages`, and every page counts against the budget.
