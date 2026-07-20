---
spec-type: reference
concept: [cyber-asana, axi, output-contract]
---

# axi — the Agent Experience Interface output contract

A **reference artifact**: the shared output, error, and pagination contract every `cyber-asana` CLI
command and MCP tool follows, so an AI agent spends the fewest tokens per interaction. It adopts
[AXI](https://github.com/kunchenguid/axi) (Agent Experience Interface) — a design framework that
treats the agent's token budget as a first-class constraint.

`cyber-asana` is driven almost entirely by agents, and the Asana API is unusually verbose: a single
task record carries dozens of fields most callers never read. Stating these conventions **once**, here,
is what keeps twelve resource domains from each inventing their own answer. Every behavioral node
([tasks](../tasks/README.md), [projects](../projects/README.md), and the rest) **adopts** this contract
and does not re-specify it — a domain node's own suite freezes only what that domain decides.

> The sibling `cyber-mux` bin adopts the same framework and its node is the closest analog. Where the
> two disagree, **AXI is the tiebreaker** — neither bin is the contract, both adopt it. Two deliberate
> divergences are recorded below rather than hidden: this bin's CLI default is **text**, not TOON
> (#1), and principle #2 is adopted by **one** domain rather than all of them.

## Subject

- **Artifact** — the AXI contract, realized as shared modules in `packages/cyber-asana/src/`:
  `output.ts`, `toon.ts`, `truncate.ts`, `pagination.ts`, `cli-options.ts`, `cli-error.ts`,
  `mcp-error.ts`, `mcp-output.ts`, `mcp-options.ts`, `default-command.ts`, `version.ts`. There is no
  separate shipped file; every command's interface layer honors these.
- **Scope of adoption** — principles **#1–#6, #8, #9**, with the state of each recorded below.
  Principles **#7** and **#10** are not evidenced in source; see the open marker at the end.

### The contract surface

1. **Token-efficient output (#1)** — [TOON](https://toonformat.dev/) is available on both surfaces
   but is **opt-in on each**: `--toon` on the CLI, `CYBER_ASANA_MCP_FORMAT=toon` for MCP. The CLI's
   default is **human-readable text**, with `--json` as the structured escape; MCP's default stays
   **JSON**, deliberately, so the established tool contract is not broken by an encoding change.
   The MCP side is applied **centrally at the registration layer** (`withMcpOutputFormat`), never per
   tool — which is why a new tool inherits it by writing plain `JSON.stringify` and nothing else.
   TOON's saving comes from collapsing a uniform array of objects into one header row plus a length
   marker, dropping repeated keys and quotes.

2. **Minimal default schema (#2)** — a list result should carry 3–4 fields rather than every field,
   with the rest reached explicitly through `--opt-fields`. **Adoption is partial and that is a real
   finding, not a simplification:** only [tasks](../tasks/README.md) sets a default (`TASK_LIST_FIELDS`,
   applied as `pagination.optFields ??= TASK_LIST_FIELDS`). Every other domain sends no `opt_fields`
   at all and takes whatever the Asana endpoint returns by default. `AGENTS.md` states the rule as
   though it were universal; source says otherwise.

3. **Truncation with a size hint, and `--full` (#3)** — a large free-text field (a task's notes, a
   comment body) is wrapped in `truncate(value, { full: isFull() })`. Past `DEFAULT_TEXT_LIMIT`
   (500 characters) the value is cut and the hint names the real size and the escape:
   `… [truncated, N chars total; use --full for the rest]`. `--full` suppresses truncation
   everywhere. Truncation is a **text-rendering** concern — it is applied by the command's readable
   branch, so it never silently corrupts a `--json` payload a machine is parsing.

4. **Pre-computed aggregates (#4)** — `printSummary(line)` emits a counts/status line so the agent
   needs no follow-up round trip. **Text mode only**: it checks the selected format and returns
   silently under `--json`/`--toon`, because a structured consumer computes its own aggregate and a
   stray prose line in a JSON stream is a parse hazard.

5. **Definitive empty state (#5)** — `printEmpty()` prints `0 results`, or `0 <entity> found` when
   the entity is named. Never `(none)`, never a blank line — an agent cannot distinguish a blank
   line from a crash. `printTable` calls it automatically when handed an empty list, so a command
   gets the correct empty state by using the table helper rather than by remembering to.

6. **Structured errors and meaningful exit codes (#6)** — one normalizer,
   `buildMcpToolErrorBody(error)`, classifies every failure into `kind: 'asana_api' | 'config' |
   'internal'` and is shared by **both** surfaces, so a given failure reads the same whether it
   arrives over the CLI or MCP. `exitCodeFor` maps it to a code an agent can branch on without
   parsing text:

   | Code | Condition |
   |---|---|
   | 0 | success |
   | 1 | generic failure (the default for anything unclassified) |
   | 3 | configuration error, or HTTP 401 unauthenticated |
   | 4 | HTTP 403 forbidden |
   | 5 | HTTP 404 not found |
   | 6 | HTTP 429 rate limited |

   Two properties are load-bearing. A **config** failure and a **401** deliberately share code 3:
   from the caller's side both mean "your credentials are not working", and splitting them would
   ask the agent to distinguish a case it would handle identically. And an Asana API error carries
   its `errors[]` array through intact — Asana's own per-error `help` and `phrase` text is the most
   actionable thing in the payload, so it is normalized rather than flattened into a string.

   The top-level CLI catch is the only place that exits: a command **throws** a structured error and
   never calls `process.exit` itself, which is what lets the same operation be reused by MCP where
   there is no process to exit.

7. **Content-first default (#8)** — running `cyber-asana` bare shows **live data**, not help text:
   the authenticated user's name, GID and email, followed by next steps. An agent's first
   invocation is usually a reachability probe, and help text answers a question it did not ask.

8. **Contextual next steps (#9)** — `printNextSteps([...])` renders a short list of the invocations
   that usually follow. **Text mode only**, for the same reason as #4.

### Cross-cutting: the pagination contract

Every list endpoint takes the same `PaginationOptions` (`limit`, `offset`, `optFields`, `fetchAll`,
`maxPages`) and returns through `collectListResponse`. Two decisions here belong to this node, not
to any domain:

- **The response shape is conditional.** With no pagination input at all, a list returns a **bare
  array**. The moment the caller expresses interest in paging — any of `limit`, `offset`, or
  `fetchAll` — it returns the **envelope** (`{ data, next_page, limit, … }`). The rule lives in
  `shouldReturnPageMetadata`. It keeps the common case terse while making the cursor available the
  instant it is asked for.
- **`fetchAll` is bounded, and says when it stopped.** It follows `next_page` up to `maxPages`
  (default 10, page size default 100) and reports `page_count` plus `truncated: true` when pages
  remain. A bounded walk that admits it was cut is the honest shape; an unbounded one can exhaust an
  agent's context on a single call.

The CLI spells these `--limit` (validated to an integer 1–100), `--offset`, `--opt-fields`, `--all`,
`--max-pages`; `--all` with `--offset` is rejected as a usage error, since a cursor and a
from-the-start walk are contradictory instructions. MCP spells them via `paginationParams`, with
`paginationParamsWithoutLimit` for the one endpoint that takes no limit
(see [users](../users/README.md)).

### Known gaps, recorded rather than hidden

- **Errors go to stderr, where AXI asks for stdout.** The top-level catch calls `console.error`.
  This is the same gap the sibling bins carry; it is recorded here as a follow-up, not ridden in.
- **There is no distinct usage-error exit code.** A malformed invocation falls through to the
  generic `1` rather than the `2` AXI's #6 case suggests, because Commander's own argument errors
  exit before the mapping is reached.
- **The token environment variable is documented one way and resolved another.** `env.ts` resolves
  `ASANA_ACCESS_TOKEN` *before* `ASANA_TOKEN`, and the MCP config-error hint calls `ASANA_TOKEN`
  deprecated — while `AGENTS.md` and the readme document `ASANA_TOKEN` as the primary name. Both
  work; the documentation and the code disagree about which is preferred. See
  [config](../config/README.md).

## References

- [AXI — the 10 principles](https://github.com/kunchenguid/axi#the-10-principles) — the framework
  this node adopts; cited in `AGENTS.md` and the readme, and referenced by `// principle N` comments
  in the source modules above, which is what ties each convention to its numbered principle.
- [TOON format](https://toonformat.dev/) — backs the claim in #1 that the tabular encoding saves
  tokens by dropping repeated keys.

<!-- open: AXI principles #7 and #10 are neither implemented under a `// principle N` comment nor
     named in AGENTS.md, so whether they are deliberately out of scope for this bin (as #7 is for
     cyber-mux) or simply not yet adopted is unresolved from source and history alone. -->
