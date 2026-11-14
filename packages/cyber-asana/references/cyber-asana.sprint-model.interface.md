---
description: What a sprint model must say — how one way of representing sprints in Asana finds the current sprint, lists tasks, and starts, fills, and closes a sprint.
tags: [asana, scrum, sprints, interface]
interface:
  cardinality: many
  version: 1
  sections:
    - heading: Requirements
      required: true
      holds: What setup must create in Asana before the model works, such as the backlog section or the Sprint field and its options.
    - heading: Current sprint
      required: true
      holds: How to find today's sprint, and what to do when none exists.
    - heading: Sprint tasks
      required: true
      holds: How to list the tasks in one sprint.
    - heading: Backlog
      required: true
      holds: How to list the incomplete tasks that belong to no sprint.
    - heading: Add to sprint
      required: true
      holds: How to put a task in a sprint.
    - heading: Start a sprint
      required: true
      holds: How to create what represents a sprint, such as its section or its field option.
    - heading: Close a sprint
      required: true
      holds: How to close a sprint and carry its incomplete tasks over, as the policy's `carry_over` says.
    - heading: Closed sprints
      required: true
      holds: How to list finished sprints, for velocity.
---

## Requirements

An implementation names the Asana objects its model needs and says how to create each one.

## Current sprint

An implementation gives the CLI command that finds the current sprint, and the primitive commands that do the same.

The sprint's index, name, and dates are never read from Asana: they are computed from the policy's `sprint_anchor_date`, `sprint_length_days`, and `sprint_name_format` (see the `cyber-asana.scrum` reference). The model finds only the Asana object that stands for that sprint.

## Sprint tasks

An implementation gives the CLI command and the primitive commands that list one sprint's tasks.

## Backlog

An implementation gives the CLI command and the primitive commands that list the backlog.

## Add to sprint

An implementation gives the CLI command and the primitive commands that put a task in a sprint.

## Start a sprint

An implementation gives the CLI command and the primitive commands that create a sprint's Asana object. Starting a sprint that already exists changes nothing.

## Close a sprint

An implementation gives the CLI command and the primitive commands that close a sprint. Incomplete tasks follow the policy's `carry_over`: `move` puts them in the next sprint, `leave` keeps them where they are.

## Closed sprints

An implementation gives the CLI command and the primitive commands that list finished sprints.

## Custom models

The `sprint` and `backlog` CLI commands and their MCP tools compute only the models the CLI builds in. For any other model, such as a repo's own `cyber-asana.sprint-model.tags`, they stop with the status `model-unsupported`, which names the model. An agent then follows that model's reference with the primitive commands it lists.
