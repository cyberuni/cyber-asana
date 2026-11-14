---
description: What a scrum report must say — who it is for, the CLI command and fields that feed it, its layout, what the agent adds, and what to offer next.
tags: [asana, scrum, reports, interface]
interface:
  cardinality: many
  version: 1
  sections:
    - heading: Audience
      required: true
      holds: Who reads the report and what they decide with it.
    - heading: Data
      required: true
      holds: The `cyber-asana report <key> --json` command and the fields it returns.
    - heading: Layout
      required: true
      holds: The output template the agent fills in from the data.
    - heading: Judgment
      required: true
      holds: What the agent adds, and what it must not invent.
    - heading: Follow-up
      required: true
      holds: What to offer once the report is shown.
---

## Audience

An implementation says who reads the report and what that person decides with it.

## Data

An implementation gives the `cyber-asana report <key> --json` command and lists the fields it returns. The CLI computes every count and point total; the agent never adds them up itself.

## Layout

An implementation gives the output template. A team changes a layout by patching this section in `.agents/references/cyber-asana.report.<key>.md`.

## Judgment

An implementation says what the agent adds, such as what to highlight, and what it must not invent.

## Follow-up

An implementation says what to offer after the report.

## Custom reports

A repo adds a report of its own, such as `cyber-asana.report.release-readiness`, by implementing this interface under `.agents/references/`. The `report` CLI commands compute only the reports the CLI builds in; an agent follows a custom report's `## Data` section with primitive commands.

Thresholds a report reads belong in that report's frontmatter, not in this interface.
