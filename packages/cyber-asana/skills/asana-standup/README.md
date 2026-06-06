# asana-standup

Generate a standup update from Asana — recent completions, today's work, and blockers.

## When to use

Use this skill when the user asks for their standup, daily update, or "what did I do / what am I doing" summary from Asana.

Good triggers include:

- "Write my standup from Asana"
- "What did I complete recently?"
- "What's due today in Asana?"
- Daily update formatted for Slack or a standup doc

## What it does

The skill guides:

- Fetching recently completed tasks (default: last two days)
- Fetching incomplete tasks for today and near-term work
- Formatting **Done**, **Today**, and **Blockers** sections (LLM judgment on what to include)
- Adjusting date range or format on request

## Install

```bash
npx skills add cyberuni/cyber-asana --skill asana-standup
```

Requires `ASANA_TOKEN` and a target project (or project selection). See [`init-asana`](../init-asana/README.md) for setup.
