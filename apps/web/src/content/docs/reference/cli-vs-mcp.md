---
title: Why CLI + skills, not MCP by default
description: Why the cyber-asana plugin ships the CLI and skills and leaves its MCP server opt-in, with measured token costs and the cases where MCP is still the right choice.
---

The cyber-asana plugin installs the **CLI and the skills**. It does not start the MCP server.
The server still exists (`cyber-asana mcp`, 111 tools), and you can turn it on with one step of the
`init-asana` skill. This page explains that default, shows the measured numbers, and lists the cases
where MCP is the better choice.

## The cost of each surface

An agent pays for a tool surface in context tokens. Part of the cost is paid on every turn, before
the agent does anything. The rest is paid only when the agent uses the surface.

| Surface | Paid on every turn | Paid on use |
| --- | --- | --- |
| MCP, every tool schema loaded up front | **~21,200** (111 tool schemas) | the tool call and its result |
| MCP, schemas deferred (Claude Code tool search) | ~650 (111 tool names) | ~190 per tool schema on average, up to ~1,300 (`asana_task_search`) |
| Skills + CLI | **~330** (8 skill descriptions) | the skill body (~250–2,400 per skill, ~8,300 for all 8), `--help` only if needed (~400 for `task create`) |

Measured on cyber-asana 0.15.0 plus this change. Tokens are approximated as bytes ÷ 4.

The skills cost less on every turn because a description is one line. A tool schema carries every
parameter and its description. A skill also carries what a schema cannot: the procedure. The `asana`
skill's task-creation route tells the agent how to resolve the workspace and project, which naming
and description conventions the repository uses, and when to ask the user. With MCP alone, the agent
has to work that out from tool descriptions, or get it wrong.

## Where the gap is small

The difference depends on the client.

- **Claude Code** defers MCP tool schemas by default. It loads only the tool names and fetches a
  schema when the agent searches for the tool
  ([Claude Code — MCP tool search](https://code.claude.com/docs/en/mcp#scale-with-mcp-tool-search)).
  The every-turn cost is then ~650 tokens for MCP against ~330 for the skills, which is a small
  difference. Per task, a skill body (about 1,000 tokens for the `asana` router, plus its
  task-creation reference) can cost more than one deferred tool schema. Claude Code falls back to
  loading every schema up front with a custom `ANTHROPIC_BASE_URL` or `ENABLE_TOOL_SEARCH=false`.
- **Cursor** describes syncing MCP tool descriptions to files so the agent can discover them on
  demand ([Cursor — dynamic context discovery](https://cursor.com/blog/dynamic-context-discovery)).
  Its [MCP docs](https://cursor.com/docs/context/mcp) do not say whether this is the default.
- **Codex** and **Copilot CLI** do not document deferred loading of MCP tool schemas
  ([Codex — MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli),
  [Copilot CLI — MCP servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers)).
  Without deferral, the full ~21,200 tokens are in context on every turn.

Skills behave the same in every client that supports them: the description is always loaded and the
body is loaded only when the skill is used
([Claude Code — skills](https://code.claude.com/docs/en/skills)).

## When MCP is the better choice

- **The client has no shell.** Claude Desktop and claude.ai chat, and the Claude API's MCP connector,
  cannot run a CLI. MCP is the only way they can reach cyber-asana. This is why the server stays.
- **You want to approve each Asana operation.** MCP tools are separate permission entries. You can
  allow `asana_task_get` and still require approval for `asana_task_delete`. The CLI goes through
  the client's shell permissions, which match command text rather than Asana operations.
- **Your client defers MCP schemas** and you prefer typed tool calls to shell commands. In Claude
  Code, the token argument above is weak, so this is a matter of preference.

## Turn on the MCP server

Run the `init-asana` skill and answer **yes** when it asks about the MCP server. The default is no.
The skill detects your client (Claude Code, Cursor, Codex, or Copilot CLI), asks whether to add the
server for this project or for every project, and writes the entry in that client's own config. The
server runs as `npx -y cyber-asana@<version> mcp`.

To add it yourself, see [MCP server setup](/cyber-asana/mcp/). The per-client details the skill uses,
including how each client passes `ASANA_ACCESS_TOKEN` to the server, are in the skill's
[reference](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/init-asana/reference.md#enable-the-mcp-server).

## Asana's official MCP server

If you prefer MCP, you can also use Asana's own hosted
[MCP server](https://developers.asana.com/docs/mcp-server), instead of cyber-asana's or alongside it.
For how the two compare and how to run both, see
[cyber-asana vs official Asana MCP](/cyber-asana/reference/mcp-comparison/) and the readme section
[Using alongside official Asana MCP](https://github.com/cyberuni/cyber-asana#using-alongside-official-asana-mcp).

## How the numbers were measured

Run from `packages/cyber-asana` after `pnpm build`:

- **MCP tool schemas**: send `initialize`, `notifications/initialized` and `tools/list` as JSON-RPC to
  `node dist/cli.js mcp` over stdin. Measure the bytes of `JSON.stringify(result.tools)`: 84,981
  bytes for 111 tools. Names only: 2,585 bytes.
- **Skill descriptions**: the bytes between the `---` fences of each `skills/*/SKILL.md`: 1,306 bytes
  for 8 skills. **Skill bodies**: the rest of each file: 33,303 bytes.
- **CLI help**: the output of `node dist/cli.js task create --help`: 1,577 bytes.

Bytes ÷ 4 is a rough approximation of tokens for English text and JSON. The exact count depends on
the model's tokenizer, but the ratios between the surfaces hold.
