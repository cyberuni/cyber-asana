---
name: create-persona-skill
description: Use this skill when the user asks to create a persona or role skill. Scaffolds SKILL.md with session-start activation.
metadata:
  internal: true
---

# Create Persona Skill

Apply when the user wants a role-loading skill — orchestrator, designer, product manager, security auditor, or any expert stance that activates at session start.

## Workflow

### 1. Confirm placement

| Placement | Location |
|-----------|----------|
| User | `~/.agents/skills/<name>/` |
| Project private | `.agents/skills/<name>/` |
| Project public | `skills/<name>/` |

Ask if not stated.

### 2. Interview

Ask all in one pass. Skip any already answered.

1. **Role name** — what is the expert called? (becomes the skill `name`)
2. **Domain** — area of expertise and responsibility in one sentence
3. **Decisions** — what does this role decide? State as heuristics ("prefer X when Y", "escalate if Z")
4. **Delegation** — does it spawn subagents, direct the user, or both? What does it hand off vs keep?
5. **Output style** — voice, format, and detail level (e.g., brief directives, structured specs, annotated critique)
6. **Capabilities** — tools, systems, or connectors needed (if any)
7. **Boundaries** — what does this role defer, refuse, or escalate?
8. **Trigger** — how does the user invoke it? (e.g., "act as orchestrator", "start designer mode")

### 3. Create directory and write SKILL.md

```bash
mkdir -p <placement-path>/<name>
```

Write `<placement-path>/<name>/SKILL.md` from this template — fill every section from interview answers, leave no placeholder text:

```markdown
---
name: <name>
description: Use this skill when the user <trigger phrase>. Loads <role> context for the session.
metadata:
  persona: true
activation: session-start
---

# <Role Title>

You are a <role> — <one-sentence stance>.

## Domain

<Area of expertise and responsibility.>

## Decisions

<Heuristics: what this role decides and how. Prefer "when X, do Y" form.>

## Delegation

<What this role hands off and what it keeps. How handoffs are structured.>

## Output

<Voice, format, detail level.>

## Boundaries

<What this role defers, refuses, or escalates. When to exit the persona.>
```

### 4. Audit

```bash
npx cyber-skills@<version> audit validate --path <placement-path>/<name>
```

Then invoke the **audit-skill** agent skill. Fix all CRITICAL findings before proceeding.

### 5. Link to agents

Use `npx skills add <path>` if available. Otherwise symlink:

```bash
ln -sf ~/.agents/skills/<name> ~/.claude/skills/<name>
```

Adjust target path per agent (`~/.cursor/skills/`, `~/.opencode/skills/`, etc.).

## Anti-patterns

- `activation: per-situation` on a persona skill — always use `session-start`
- Missing `metadata.persona: true` — audit rule E2 flags role-loading phrases without it
- Multi-step workflow inside a persona skill — delegate to a separate process or tool-based skill
- Decision heuristics written as prose paragraphs — use "when X, do Y" form

## References

```bash
npx cyber-skills@<version> governance show skill-design
```
