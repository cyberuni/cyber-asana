@frozen
Feature: users

  Listing the people in an Asana workspace, reading one person by GID, and resolving
  the authenticated user, over the CLI and MCP surfaces that share one api.ts.

  # ── user list / asana_user_list ──

  Scenario: list scopes to the workspace GID given on the command line
    Given a workspace with GID "9902"
    And that workspace contains a user named "Marisol Quint"
    And the ASANA_WORKSPACE environment variable is unset
    When the user list entry point runs with the workspace GID flag set to "9902"
    Then the request reaching the Asana users endpoint is scoped to workspace "9902"
    And the output names "Marisol Quint"

  Scenario: list falls back to the workspace environment variable
    Given a workspace with GID "9902"
    And the ASANA_WORKSPACE environment variable is set to "9902"
    When the user list entry point runs with no workspace flag
    Then the request reaching the Asana users endpoint is scoped to workspace "9902"

  Scenario: list accepts the legacy workspace flag
    Given a workspace with GID "9902"
    And the ASANA_WORKSPACE environment variable is unset
    When the user list entry point runs with the legacy workspace flag set to "9902"
    Then the request reaching the Asana users endpoint is scoped to workspace "9902"

  Scenario: list without any workspace GID is a usage error
    Given the ASANA_WORKSPACE environment variable is unset
    When the user list entry point runs with no workspace flag
    Then the process exits with a non-zero status
    And stderr states that a Workspace GID is required
    And no request reaches the Asana users endpoint

  Scenario: the MCP list tool scopes to its workspace GID parameter
    Given a workspace with GID "9902"
    And that workspace contains a user named "Marisol Quint"
    When the MCP user list tool is called with the workspace GID parameter "9902"
    Then the request reaching the Asana users endpoint is scoped to workspace "9902"
    And the tool result names "Marisol Quint"

  Scenario: the MCP list tool does not fall back to the workspace environment variable
    Given the ASANA_WORKSPACE environment variable is set to "9902"
    When the MCP user list tool is called with no workspace GID parameter
    Then the call is rejected as missing a required parameter
    And no request reaches the Asana users endpoint

  Scenario: list offers no page-size option
    Given the user command group
    When the help text for the list subcommand is rendered
    Then the options it lists contain no page-size option

  Scenario: list sends an offset but no page size to the Asana users endpoint
    Given a workspace with GID "9902"
    And a list request carrying the offset token "b3Zlcm5leQ"
    When the user list entry point runs
    Then the request reaching the Asana users endpoint carries the offset token "b3Zlcm5leQ"
    And that request carries no page-size parameter

  Scenario: list renders name, GID and email for each user in text mode
    Given a workspace with GID "9902"
    And that workspace contains a user named "Marisol Quint" with GID "77310"
    And that user's record carries the email address "marisol@havenloom.example"
    When the user list entry point runs in text mode scoped to workspace "9902"
    Then stdout pairs "Marisol Quint" with "77310" on one row
    And that row contains "marisol@havenloom.example"

  Scenario: list leaves the email column blank for a compact user record
    Given a workspace with GID "9902"
    And that workspace contains a user whose record carries only the GID "77311" and the name "Devrim Ashkani"
    When the user list entry point runs in text mode scoped to workspace "9902"
    Then stdout pairs "Devrim Ashkani" with "77311" on one row
    And that row's email column is empty

  # ── user get / asana_user_get ──

  Scenario: get returns the user record for the GID it was given
    Given a user named "Devrim Ashkani" with GID "77311"
    When the user get entry point runs with the GID "77311"
    Then the returned record has the GID "77311"
    And the returned record has the name "Devrim Ashkani"

  Scenario: get without a GID is a usage error
    Given the user command group
    When the user get entry point runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  Scenario: get renders the user's name, GID and email in text mode
    Given a user named "Marisol Quint" with GID "77310"
    And that user's record carries the email address "marisol@havenloom.example"
    When the user get entry point runs in text mode with the GID "77310"
    Then stdout contains "Marisol Quint"
    And stdout contains "77310"
    And stdout contains a line labelled Email carrying "marisol@havenloom.example"

  Scenario: get omits the email row for a compact user record
    Given a user whose record carries only the GID "77311" and the name "Devrim Ashkani"
    When the user get entry point runs in text mode with the GID "77311"
    Then stdout contains "Devrim Ashkani"
    And stdout contains no line labelled Email

  # ── user me / asana_user_me ──

  Scenario: me resolves the authenticated user through the me sentinel
    Given a token belonging to a user named "Solenne Marbeck" with GID "77312"
    When the user me entry point runs
    Then the request reaching the Asana users endpoint names the user GID "me"
    And the returned record has the GID "77312"

  Scenario: me takes no GID argument
    Given the user command group
    When the help text for the me subcommand is rendered
    Then the usage line it prints names no arguments

  Scenario: the MCP me tool needs no parameters
    Given a token belonging to a user named "Solenne Marbeck" with GID "77312"
    When the MCP user me tool is called with an empty parameter object
    Then the call is accepted
    And the tool result contains the GID "77312"

  Scenario: me renders the authenticated user's name, GID and email in text mode
    Given a token belonging to a user named "Solenne Marbeck" with GID "77312"
    And that user's record carries the email address "solenne@havenloom.example"
    When the user me entry point runs in text mode
    Then stdout contains "Solenne Marbeck"
    And stdout contains "77312"
    And stdout contains a line labelled Email carrying "solenne@havenloom.example"
