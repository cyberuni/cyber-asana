@frozen
Feature: tags

  Finding, reading, creating, changing and deleting Asana tags, and linking a tag
  to a task in both directions, over the CLI and MCP surfaces that share one api.ts.

  # ── tag list / asana_tag_list, tag get / asana_tag_get ──

  Scenario: list returns the tags of the workspace it was given
    Given a workspace with GID "88431" containing a tag named "Kelp Watch"
    And that same workspace contains a tag named "Rope Ladder"
    When the tag list entry point runs with the workspace GID "88431"
    Then the request reaching Asana asks for the tags of workspace "88431"
    And the output names both "Kelp Watch" and "Rope Ladder"

  Scenario: list falls back to the workspace environment variable
    Given the ASANA_WORKSPACE environment variable is set to "88431"
    When the tag list command runs with no workspace flag
    Then the request reaching Asana asks for the tags of workspace "88431"

  Scenario: list without a workspace GID anywhere is a usage error
    Given a shell whose only Asana environment variable is the access token
    When the tag list command runs with no workspace flag
    Then the process exits with a non-zero status
    And stderr states that a Workspace GID is required
    And no request reaches Asana

  Scenario: list leaves the colour cell empty for a tag that has no colour
    Given a tag named "Kelp Watch" with GID "990211" and the colour "dark-teal" in workspace "88431"
    And a tag named "Rope Ladder" with GID "990212" in workspace "88431" whose record carries no colour
    When the tag list command runs in text mode with the workspace GID "88431"
    Then stdout puts "dark-teal" on the row naming "Kelp Watch"
    And the row naming "Rope Ladder" carries an empty colour cell

  Scenario: get requests the tag by GID and sends no workspace scope
    Given the ASANA_WORKSPACE environment variable is set to "88431"
    And a tag named "Tide Chart" with GID "990213"
    When the tag get command runs with the tag GID "990213"
    Then the request reaching Asana addresses tag "990213"
    And that request carries no workspace parameter

  Scenario: get renders the tag's name, GID and colour in text mode
    Given a tag named "Kelp Watch" with GID "990211" whose record carries the colour "dark-teal"
    When the tag get command runs in text mode with the tag GID "990211"
    Then stdout contains "Kelp Watch"
    And stdout contains "990211"
    And stdout contains "dark-teal"

  Scenario: get omits the colour line when the tag record carries no colour
    Given a tag named "Rope Ladder" with GID "990212" whose record carries no colour
    When the tag get command runs in text mode with the tag GID "990212"
    Then stdout contains "Rope Ladder"
    And stdout contains "990212"
    And stdout has no line labelled Color

  Scenario: get without a tag GID is a usage error
    Given a shell whose only Asana environment variable is the access token
    When the tag get command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument
    And no request reaches Asana

  # ── tag create / tag update / tag delete and their MCP tools ──

  Scenario: create sends the name, colour and notes it was given
    Given a workspace with GID "88431"
    When the tag create entry point runs with the name "Tide Chart" in workspace "88431", the colour "dark-teal" and the notes "checked at slack water"
    Then the request reaching Asana creates a tag in workspace "88431"
    And the request body carries the name "Tide Chart"
    And the request body carries the colour "dark-teal"
    And the request body carries the notes "checked at slack water"

  Scenario: create sends only the name when no colour or notes flag is typed
    Given a workspace with GID "88431"
    When the tag create command runs with the name "Tide Chart" and the workspace GID "88431" and no other flag
    Then the request body carries the name "Tide Chart"
    And the request body has no colour key
    And the request body has no notes key

  Scenario: create falls back to the workspace environment variable
    Given the ASANA_WORKSPACE environment variable is set to "88431"
    When the tag create command runs with the name "Tide Chart" and no workspace flag
    Then the request reaching Asana creates a tag in workspace "88431"

  Scenario: create without a workspace GID anywhere is a usage error
    Given a shell whose only Asana environment variable is the access token
    When the tag create command runs with the name "Tide Chart" and no workspace flag
    Then the process exits with a non-zero status
    And stderr states that a Workspace GID is required
    And no request reaches Asana

  Scenario: create without a tag name is a usage error
    Given a shell whose only Asana environment variable is the access token
    When the tag create command runs with no name argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  Scenario: update sends only the field whose flag was given
    Given a tag named "Rope Ladder" with GID "990212" whose record carries the notes "spare line locker"
    When the tag update command runs with the tag GID "990212" and the colour flag set to "dark-teal"
    Then the request reaching Asana addresses tag "990212"
    And the request body carries the colour "dark-teal"
    And the request body has no notes key
    And the request body has no name key

  Scenario: update with no field flags still calls Asana with an empty change set
    Given a tag named "Rope Ladder" with GID "990212"
    When the tag update command runs with the tag GID "990212" and no field flag
    Then the request reaching Asana addresses tag "990212"
    And the request body carries no field keys
    And the process exits with a zero status

  Scenario: update without a tag GID is a usage error
    Given a shell whose only Asana environment variable is the access token
    When the tag update command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument
    And no request reaches Asana

  Scenario: delete prints the same confirmation line whatever output format is asked for
    Given a tag named "Tide Chart" with GID "990213"
    When the tag delete command runs with the tag GID "990213" and the JSON output flag
    Then the request reaching Asana deletes tag "990213"
    And stdout reads "Deleted tag 990213"

  Scenario: delete without a tag GID is a usage error
    Given a shell whose only Asana environment variable is the access token
    When the tag delete command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument
    And no request reaches Asana

  Scenario: asana_tag_delete answers with a body naming the deleted tag GID
    Given a tag named "Tide Chart" with GID "990213"
    When the MCP tool "asana_tag_delete" is called with the tag GID "990213"
    Then the request reaching Asana deletes tag "990213"
    And the returned body names "990213" as the deleted tag

  # ── tag task list, tag tasks, tag task add, tag task remove and their MCP tools ──

  Scenario: task list returns the tags on the task GID it was given
    Given a task with GID "44501" carrying a tag named "Kelp Watch"
    And that same task carries a tag named "Rope Ladder"
    When the tag task list entry point runs with the task GID "44501"
    Then the request reaching Asana asks for the tags of task "44501"
    And the output names both "Kelp Watch" and "Rope Ladder"

  Scenario: tasks returns the tasks carrying the tag GID it was given
    Given a tag with GID "990211" carried by a finished task named "Splice the mooring line"
    And that same tag is carried by an unfinished task named "Sand the tiller"
    When the tag tasks command runs in text mode with the tag GID "990211"
    Then the request reaching Asana asks for the tasks of tag "990211"
    And stdout marks the row naming "Splice the mooring line" done as "yes"
    And stdout marks the row naming "Sand the tiller" done as "no"

  Scenario: task add links the tag to the task and confirms both GIDs
    Given a task with GID "44502" that carries no tag
    And a tag named "Kelp Watch" with GID "990211"
    When the tag task add command runs with the task GID "44502" and the tag GID "990211"
    Then the request reaching Asana addresses task "44502"
    And the request body carries the tag "990211"
    And stdout contains "44502"
    And stdout contains "990211"
    And stdout reports the status "added"

  Scenario: task remove unlinks the tag from the task and confirms both GIDs
    Given a task with GID "44502" already carrying the tag with GID "990211"
    When the tag task remove command runs with the task GID "44502" and the tag GID "990211"
    Then the request reaching Asana addresses task "44502"
    And the request body carries the tag "990211"
    And stdout contains "44502"
    And stdout contains "990211"
    And stdout reports the status "removed"

  Scenario: task add with only one GID is a usage error
    Given a task with GID "44502" that carries no tag
    When the tag task add command runs with the task GID "44502" and nothing after it
    Then the process exits with a non-zero status
    And stderr names the missing required argument
    And no request reaches Asana

  Scenario: task remove with only one GID is a usage error
    Given a task with GID "44502" already carrying the tag with GID "990211"
    When the tag task remove command runs with the task GID "44502" and nothing after it
    Then the process exits with a non-zero status
    And stderr names the missing required argument
    And no request reaches Asana

  Scenario: task list without a task GID is a usage error
    Given a shell whose only Asana environment variable is the access token
    When the tag task list command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument
    And no request reaches Asana

  Scenario: tasks without a tag GID is a usage error
    Given a shell whose only Asana environment variable is the access token
    When the tag tasks command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument
    And no request reaches Asana

  # ── surface shape ──

  Scenario: every tag operation the CLI offers has an MCP tool
    Given the registered MCP tool set for tags
    When its tool names are read
    Then the set contains "asana_tag_list", "asana_tag_get", "asana_tag_create", "asana_tag_update" and "asana_tag_delete"
    And the set contains "asana_tag_list_for_task", "asana_tag_list_tasks", "asana_tag_add_to_task" and "asana_tag_remove_from_task"

  Scenario: the tag task grouping is a CLI container with no tool of its own
    Given the tag command group with its task sub-group
    When the registered MCP tool names for tags are read
    Then the task sub-group carries no action of its own on the CLI
    And no registered tool is named "asana_tag_task"
