Feature: workspaces

  Discovering which Asana workspaces a token can reach, and reading one by GID,
  over the CLI and MCP surfaces that share one api.ts.

  # ── workspace list / asana_workspace_list ──

  Scenario: list returns every reachable workspace without a workspace GID
    Given a token whose account reaches a workspace named "Riverbend Cartography"
    And that same token reaches a workspace named "Tidewater Survey"
    And the ASANA_WORKSPACE environment variable is unset
    When the workspace list entry point runs with no workspace GID argument
    Then the output names both "Riverbend Cartography" and "Tidewater Survey"

  Scenario: list offers no workspace-scoping option
    Given the workspace command group
    When the help text for the list subcommand is rendered
    Then the options it lists contain no workspace-scoping option

  Scenario: list forwards its pagination options to the shared list contract unchanged
    Given a list request carrying a page size of 25
    And that same request carrying the offset token "cGFnZTI"
    When the workspace list entry point runs
    Then the request reaching the Asana workspaces endpoint carries the page size 25
    And that request carries the offset token "cGFnZTI"

  Scenario: list renders each workspace's name and GID in text mode
    Given a reachable workspace named "Riverbend Cartography" with GID "4417"
    And a reachable workspace named "Tidewater Survey" with GID "4418"
    When the workspace list entry point runs in text mode
    Then stdout pairs "Riverbend Cartography" with "4417" on one row
    And stdout pairs "Tidewater Survey" with "4418" on one row

  # ── workspace get / asana_workspace_get ──

  Scenario: get returns the workspace record for the GID it was given
    Given a workspace named "Riverbend Cartography" with GID "4417"
    When the workspace get entry point runs with the GID "4417"
    Then the returned record has the GID "4417"
    And the returned record has the name "Riverbend Cartography"

  Scenario: get without a GID is a usage error
    Given the ASANA_WORKSPACE environment variable is unset
    When the workspace get entry point runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  Scenario: get does not fall back to the workspace environment variable
    Given the ASANA_WORKSPACE environment variable is set to "4417"
    When the workspace get entry point runs with no GID argument
    Then the process exits with a non-zero status
    And no request reaches the Asana workspaces endpoint

  Scenario: get renders the workspace's name and GID in text mode
    Given a workspace named "Tidewater Survey" with GID "4418"
    When the workspace get entry point runs in text mode with the GID "4418"
    Then stdout contains "Tidewater Survey"
    And stdout contains "4418"
