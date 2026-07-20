Feature: teams

  Finding the teams of an Asana workspace and reading one team by GID,
  over the CLI and MCP surfaces that share one api.ts.

  # ── team list / asana_team_list ──

  Scenario: list returns the teams of the workspace it was given
    Given a workspace with GID "5312" containing a team named "Lantern Guild"
    And that same workspace contains a team named "Saltmarsh Crew"
    When the team list entry point runs with the workspace GID "5312"
    Then the request reaching Asana asks for the teams of workspace "5312"
    And the output names both "Lantern Guild" and "Saltmarsh Crew"

  Scenario: list falls back to the workspace environment variable
    Given the ASANA_WORKSPACE environment variable is set to "5312"
    When the team list command runs with no workspace flag
    Then the request reaching Asana asks for the teams of workspace "5312"

  Scenario: list without a workspace GID anywhere is a usage error
    Given the ASANA_WORKSPACE environment variable is unset
    When the team list command runs with no workspace flag
    Then the process exits with a non-zero status
    And stderr states that a Workspace GID is required
    And no request reaches Asana

  Scenario: asana_team_list requires an explicit workspace GID
    Given the registered MCP tool named "asana_team_list"
    When its declared input schema is read
    Then the schema marks "workspace_gid" as a required parameter

  Scenario: list renders each team's name and GID in text mode
    Given a team named "Lantern Guild" with GID "77201" in workspace "5312"
    And a team named "Saltmarsh Crew" with GID "77202" in workspace "5312"
    When the team list command runs in text mode with the workspace GID "5312"
    Then stdout pairs "Lantern Guild" with "77201" on one row
    And stdout pairs "Saltmarsh Crew" with "77202" on one row

  # ── team get / asana_team_get ──

  Scenario: get returns the team record for the GID it was given
    Given a team named "Lantern Guild" with GID "77201"
    When the team get entry point runs with the team GID "77201"
    Then the returned record has the GID "77201"
    And the returned record has the name "Lantern Guild"

  Scenario: get without a GID is a usage error
    Given a shell whose environment defines no Asana variables
    When the team get command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  Scenario: get takes no workspace scope
    Given the ASANA_WORKSPACE environment variable is set to "5312"
    And a team named "Saltmarsh Crew" with GID "77202"
    When the team get command runs with the team GID "77202"
    Then the request reaching Asana addresses team "77202"
    And that request carries no workspace parameter

  Scenario: get renders the team's name and GID in text mode
    Given a team named "Saltmarsh Crew" with GID "77202"
    When the team get command runs in text mode with the team GID "77202"
    Then stdout contains "Saltmarsh Crew"
    And stdout contains "77202"
