@frozen
Feature: goals

  Reading, creating, editing and removing the objectives of an Asana workspace,
  over the CLI and MCP surfaces that share one api.ts.

  # ── goal list / asana_goal_list ──

  Scenario: list returns the goals of the workspace it was given
    Given a workspace with GID "6104" containing a goal named "Halve Kiln Downtime"
    And that same workspace contains a goal named "Double Reef Yield"
    When the goal list entry point runs with the workspace GID "6104"
    Then the request reaching Asana asks for the goals of workspace "6104"
    And the output names both "Halve Kiln Downtime" and "Double Reef Yield"

  Scenario: list falls back to the workspace environment variable
    Given the ASANA_WORKSPACE environment variable is set to "6104"
    When the goal list command runs with no workspace flag
    Then the request reaching Asana asks for the goals of workspace "6104"

  Scenario: list without a workspace GID anywhere is a usage error
    Given the ASANA_WORKSPACE environment variable is unset
    When the goal list command runs with no workspace flag
    Then the process exits with a non-zero status
    And stderr states that a Workspace GID is required
    And no request reaches Asana

  Scenario: asana_goal_list requires an explicit workspace GID
    Given the registered MCP tool named "asana_goal_list"
    When its declared input schema is read
    Then the schema marks "workspace_gid" as a required parameter

  Scenario: list renders each goal's name, GID and due date in text mode
    Given a goal named "Halve Kiln Downtime" with GID "88410" due on "2027-03-31" in workspace "6104"
    And a goal named "Double Reef Yield" with GID "88411" due on "2027-09-30" in workspace "6104"
    When the goal list command runs in text mode with the workspace GID "6104"
    Then stdout puts "Halve Kiln Downtime", "88410" and "2027-03-31" on one row
    And stdout puts "Double Reef Yield", "88411" and "2027-09-30" on one row

  Scenario: list leaves the due cell empty for a goal with no due date
    Given a goal named "Retire the Ash Ledger" with GID "88412" in workspace "6104"
    And that goal has no due date
    When the goal list command runs in text mode with the workspace GID "6104"
    Then the row for "88412" carries an empty due cell
    And stdout contains neither "null" nor "undefined"

  Scenario: list keeps the goal status out of the table
    Given a goal named "Halve Kiln Downtime" with GID "88410" in workspace "6104"
    And that goal has the status "green"
    When the goal list command runs in text mode with the workspace GID "6104"
    Then the table header names exactly the columns NAME, ID and DUE
    And stdout does not contain "green"

  # ── goal get / asana_goal_get ──

  Scenario: get returns the goal record for the GID it was given
    Given a goal named "Halve Kiln Downtime" with GID "88410"
    When the goal get entry point runs with the goal GID "88410"
    Then the returned record has the GID "88410"
    And the returned record has the name "Halve Kiln Downtime"

  Scenario: get without a GID is a usage error
    Given a shell whose environment defines no Asana variables
    When the goal get command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  Scenario: get takes no workspace scope
    Given the ASANA_WORKSPACE environment variable is set to "6104"
    And a goal named "Double Reef Yield" with GID "88411"
    When the goal get command runs with the goal GID "88411"
    Then the request reaching Asana addresses goal "88411"
    And that request carries no workspace parameter

  Scenario: get renders the goal's name, GID, URL, due date and status in text mode
    Given a goal named "Halve Kiln Downtime" with GID "88410"
    And that goal has the permalink URL "https://app.asana.com/0/goal/88410"
    And that goal is due on "2027-03-31"
    And that goal has the status "green"
    When the goal get command runs in text mode with the goal GID "88410"
    Then stdout contains "Halve Kiln Downtime"
    And stdout contains "88410"
    And stdout contains "https://app.asana.com/0/goal/88410"
    And stdout contains "2027-03-31"
    And stdout contains "green"

  Scenario: get prints no due or status line for a goal that carries neither
    Given a goal named "Retire the Ash Ledger" with GID "88412"
    And that goal has no due date
    And that goal has no status
    When the goal get command runs in text mode with the goal GID "88412"
    Then stdout contains "Retire the Ash Ledger"
    And stdout has no line beginning with "Due"
    And stdout has no line beginning with "Status"

  # ── goal create / asana_goal_create ──

  Scenario: create files the new goal in the workspace it was given
    Given a workspace with GID "6104"
    When the goal create entry point runs with the name "Halve Kiln Downtime" and the workspace GID "6104"
    Then the create request body carries the name "Halve Kiln Downtime"
    And the create request body carries the workspace "6104" as a plain string

  Scenario: create falls back to the workspace environment variable
    Given the ASANA_WORKSPACE environment variable is set to "6104"
    When the goal create command runs with the name "Double Reef Yield" and no workspace flag
    Then the create request body carries the workspace "6104"

  Scenario: create without a workspace GID anywhere is a usage error
    Given the ASANA_WORKSPACE environment variable is unset
    When the goal create command runs with the name "Double Reef Yield" and no workspace flag
    Then the process exits with a non-zero status
    And stderr states that a Workspace GID is required
    And no request reaches Asana

  Scenario: create without a name is a usage error
    Given the goal create command receives the workspace GID "6104"
    And that same invocation receives no positional name argument
    When the goal create command runs
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  Scenario: create carries the notes and due date it was given
    Given a workspace with GID "6104"
    When the goal create entry point runs with the name "Halve Kiln Downtime", the notes "Measured at the Kiln Row meters" and the due date "2027-03-31"
    Then the create request body carries the notes "Measured at the Kiln Row meters"
    And the create request body carries the due date "2027-03-31"

  Scenario: create sends no notes or due date when neither is given
    Given a workspace with GID "6104"
    When the goal create entry point runs with only the name "Retire the Ash Ledger" and the workspace GID "6104"
    Then the create request body carries no notes value
    And the create request body carries no due date value

  Scenario: create renders the new goal's fields in text mode
    Given Asana answers a goal create call with a goal named "Halve Kiln Downtime" with GID "88410"
    And that answered goal is due on "2027-03-31"
    When the goal create command runs in text mode with the name "Halve Kiln Downtime" and the workspace GID "6104"
    Then stdout contains "Halve Kiln Downtime"
    And stdout contains "88410"
    And stdout contains "2027-03-31"

  Scenario: asana_goal_create requires both a workspace GID and a name
    Given the registered MCP tool named "asana_goal_create"
    When its declared input schema is read
    Then the schema marks "workspace_gid" as a required parameter
    And the schema marks "name" as a required parameter
    And the schema marks "notes" and "due_on" as optional parameters

  # ── goal update / asana_goal_update ──

  Scenario: update changes only the field it was given
    Given a goal named "Halve Kiln Downtime" with GID "88410"
    When the goal update entry point runs with the goal GID "88410" and the new name "Halve Kiln Downtime by Q2"
    Then the update request addresses goal "88410"
    And the update request body carries the name "Halve Kiln Downtime by Q2"
    And the update request body carries no notes value
    And the update request body carries no due date value

  Scenario: update carries the name, notes and due date together
    Given a goal named "Double Reef Yield" with GID "88411"
    When the goal update entry point runs with the goal GID "88411", the new name "Triple Reef Yield", the notes "Rebaselined after the survey" and the due date "2028-01-31"
    Then the update request body carries the name "Triple Reef Yield"
    And the update request body carries the notes "Rebaselined after the survey"
    And the update request body carries the due date "2028-01-31"

  Scenario: update with no field flags still reaches Asana
    Given a goal named "Retire the Ash Ledger" with GID "88412"
    When the goal update command runs with the goal GID "88412" and no field flag
    Then the update request addresses goal "88412"
    And the update request body carries no field values
    And the process exits with status 0

  Scenario: update without a GID is a usage error
    Given a shell whose environment defines no Asana variables
    When the goal update command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  Scenario: update renders the edited goal's fields in text mode
    Given Asana answers a goal update call with a goal named "Triple Reef Yield" with GID "88411"
    And that answered goal has the status "yellow"
    When the goal update command runs in text mode with the goal GID "88411" and the new name "Triple Reef Yield"
    Then stdout contains "Triple Reef Yield"
    And stdout contains "88411"
    And stdout contains "yellow"

  # ── goal delete / asana_goal_delete ──

  Scenario: delete removes the goal named by the GID it was given
    Given a goal named "Retire the Ash Ledger" with GID "88412"
    When the goal delete entry point runs with the goal GID "88412"
    Then the request reaching Asana deletes goal "88412"

  Scenario: delete without a GID is a usage error
    Given a shell whose environment defines no Asana variables
    When the goal delete command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  Scenario: delete confirms with the goal GID instead of a record
    Given Asana answers a goal delete call with an empty body
    When the goal delete command runs with the goal GID "88412"
    Then stdout contains "Deleted goal 88412"
    And the process exits with status 0
