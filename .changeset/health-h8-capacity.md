---
"cyber-asana": minor
---

Fill in health check H8 in `cyber-asana report health`: it now reads Asana Allocations and reports one error per person whose sprint load in effort hours exceeds their capacity for the sprint's dates, with `cyber-asana report workload` as its fix. When capacity is unknown (a 402 plan limit, or no allocation overlapping the sprint) H8 stays `skipped` with that reason and is never shown as passed. Allocations are read only when H8 is enabled.
