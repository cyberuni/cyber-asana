@frozen
Feature: portfolios

  Reading and managing Asana portfolios — the collections of projects a workspace
  tracks together — over the CLI and MCP surfaces that share one api.ts.

  # ── portfolio list / asana_portfolio_list ──

  Scenario: list returns the portfolios of the workspace it was given
    Given a workspace with GID "4410" containing a portfolio named "Foundry Program"
    And that same workspace contains a portfolio named "Beacon Rollout"
    When the portfolio list entry point runs with the workspace GID "4410"
    Then the request reaching Asana asks for the portfolios of workspace "4410"
    And the output names both "Foundry Program" and "Beacon Rollout"

  Scenario: list falls back to the workspace environment variable
    Given the ASANA_WORKSPACE environment variable is set to "4410"
    When the portfolio list command runs with no workspace flag
    Then the request reaching Asana asks for the portfolios of workspace "4410"

  Scenario: list without a workspace GID anywhere is a usage error
    Given the ASANA_WORKSPACE environment variable is unset
    When the portfolio list command runs with no workspace flag
    Then the process exits with a non-zero status
    And stderr states that a Workspace GID is required
    And no request reaches Asana

  Scenario: asana_portfolio_list requires an explicit workspace GID
    Given the registered MCP tool named "asana_portfolio_list"
    When its declared input schema is read
    Then the schema marks "workspace_gid" as a required parameter

  Scenario: list offers no owner filter
    Given the portfolio list entry point on the CLI and on MCP
    When the inputs each one accepts are listed
    Then neither list of inputs contains an owner option

  Scenario: list renders each portfolio's name and GID in text mode
    Given a portfolio named "Foundry Program" with GID "6602" in workspace "4410"
    And a portfolio named "Beacon Rollout" with GID "6603" in workspace "4410"
    When the portfolio list command runs in text mode with the workspace GID "4410"
    Then stdout pairs "Foundry Program" with "6602" on one row
    And stdout pairs "Beacon Rollout" with "6603" on one row

  # ── portfolio items / asana_portfolio_item_list ──

  Scenario: items returns the projects inside the portfolio GID it was given
    Given a portfolio with GID "6602" holding a project named "Anvil Site"
    And that same portfolio holds a project named "Coldforge Pilot"
    When the portfolio items entry point runs with the portfolio GID "6602"
    Then the request reaching Asana asks for the items of portfolio "6602"
    And the output names both "Anvil Site" and "Coldforge Pilot"

  Scenario: items sends its pagination options without disturbing the portfolio GID
    Given an items request naming the portfolio GID "6602"
    And that same request carrying a page size of 25
    And that same request carrying the offset token "b2Zmc2V0OTE"
    When the portfolio items entry point runs
    Then the request reaching Asana asks for the items of portfolio "6602"
    And that request carries the page size 25
    And that request carries the offset token "b2Zmc2V0OTE"

  Scenario: items without a portfolio GID is a usage error
    Given a shell whose environment defines no Asana variables
    When the portfolio items command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  Scenario: items does not default its portfolio GID from the environment
    Given the ASANA_WORKSPACE environment variable is set to "4410"
    When the portfolio items command runs with no GID argument
    Then the process exits with a non-zero status
    And no request reaches the Asana portfolio items endpoint

  Scenario: items renders each item's name and GID in text mode
    Given a portfolio with GID "6602" holding a project named "Anvil Site" with GID "8815"
    And that same portfolio holds a project named "Coldforge Pilot" with GID "8816"
    When the portfolio items command runs in text mode with the portfolio GID "6602"
    Then stdout pairs "Anvil Site" with "8815" on one row
    And stdout pairs "Coldforge Pilot" with "8816" on one row

  # ── portfolio get / asana_portfolio_get ──

  Scenario: get returns the portfolio record for the GID it was given
    Given a portfolio named "Foundry Program" with GID "6602"
    When the portfolio get entry point runs with the portfolio GID "6602"
    Then the returned record has the GID "6602"
    And the returned record has the name "Foundry Program"

  Scenario: get renders the portfolio's name, GID and URL in text mode
    Given a portfolio named "Foundry Program" with GID "6602"
    And that portfolio's record carries the permalink URL "https://app.asana.invalid/0/portfolio/6602"
    When the portfolio get command runs in text mode with the portfolio GID "6602"
    Then stdout contains "Foundry Program"
    And stdout contains "6602"
    And stdout contains "https://app.asana.invalid/0/portfolio/6602"

  Scenario: get omits the URL line when the record carries no permalink
    Given a portfolio named "Beacon Rollout" with GID "6603"
    And that portfolio's record has the permalink URL field absent
    When the portfolio get command runs in text mode with the portfolio GID "6603"
    Then stdout contains "Beacon Rollout"
    And stdout contains "6603"
    And stdout contains no line labelled "URL"

  Scenario: get without a portfolio GID is a usage error
    Given a shell whose environment defines no Asana variables
    When the portfolio get command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  # ── portfolio create / asana_portfolio_create ──

  Scenario: create sends the new name and the workspace it was given
    Given a workspace with GID "4410"
    And the portfolio name "Harbour Programme" typed on the invocation
    When the portfolio create entry point runs with the workspace GID "4410"
    Then the request reaching Asana carries the name "Harbour Programme"
    And that request carries the workspace as the plain string "4410"
    And the returned record has the name "Harbour Programme"

  Scenario: create falls back to the workspace environment variable
    Given the ASANA_WORKSPACE environment variable is set to "4410"
    And the portfolio name "Harbour Programme" typed on the invocation
    When the portfolio create command runs with no workspace flag
    Then the request reaching Asana carries the workspace as the plain string "4410"

  Scenario: create without a workspace GID anywhere is a usage error
    Given the ASANA_WORKSPACE environment variable is unset
    And the portfolio name "Harbour Programme" typed on the invocation
    When the portfolio create command runs with no workspace flag
    Then the process exits with a non-zero status
    And stderr states that a Workspace GID is required
    And no request reaches Asana

  Scenario: create without a name is a usage error
    Given the ASANA_WORKSPACE environment variable is set to "4410"
    And no portfolio name typed on the invocation
    When the portfolio create command runs
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  Scenario: asana_portfolio_create requires both a workspace GID and a name
    Given the registered MCP tool named "asana_portfolio_create"
    When its declared input schema is read
    Then the schema marks "workspace_gid" as a required parameter
    And the schema marks "name" as a required parameter

  # ── portfolio update / asana_portfolio_update ──

  Scenario: update sends the new name for the portfolio GID it was given
    Given a portfolio named "Beacon Rollout" with GID "6603"
    And the replacement name "Beacon Rollout 2027" supplied on the invocation
    When the portfolio update entry point runs with the portfolio GID "6603"
    Then the request reaching Asana addresses portfolio "6603"
    And that request carries the name "Beacon Rollout 2027"

  Scenario: update with no new name sends an update carrying no field
    Given a portfolio named "Beacon Rollout" with GID "6603"
    And an update invocation whose only input is the portfolio GID "6603"
    When the portfolio update entry point runs
    Then the request reaching Asana addresses portfolio "6603"
    And that request carries no name

  Scenario: update without a portfolio GID is a usage error
    Given a shell whose environment defines no Asana variables
    When the portfolio update command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  Scenario: update changes only the portfolio's name
    Given the portfolio update entry point on the CLI and on MCP
    When the inputs each one accepts are listed
    Then the only changeable field in either list is the name

  # ── portfolio delete / asana_portfolio_delete ──

  Scenario: delete removes the portfolio and confirms with its GID
    Given a portfolio named "Beacon Rollout" with GID "6603"
    When the portfolio delete command runs with the portfolio GID "6603"
    Then the request reaching Asana deletes portfolio "6603"
    And stdout contains "Deleted portfolio 6603"
    And the process exits with status zero

  Scenario: delete without a portfolio GID is a usage error
    Given a shell whose environment defines no Asana variables
    When the portfolio delete command runs with no GID argument
    Then the process exits with a non-zero status
    And no request reaches the Asana portfolios endpoint

  Scenario: asana_portfolio_delete answers with a confirmation sentence rather than a record
    Given a portfolio named "Beacon Rollout" with GID "6603"
    When the MCP tool "asana_portfolio_delete" runs with the portfolio GID "6603"
    Then the returned text is "Deleted portfolio 6603"

  # ── surface boundary ──

  Scenario: the portfolio command group offers exactly six verbs
    Given the portfolio CLI command group
    When the help text for the group is rendered
    Then the subcommands it lists are exactly "list", "items", "get", "create", "update" and "delete"

  Scenario: the MCP surface registers exactly six portfolio tools
    Given an MCP server with the portfolio tools registered
    When the registered tool names beginning with "asana_portfolio_" are listed
    Then those names are exactly "asana_portfolio_list", "asana_portfolio_item_list", "asana_portfolio_get", "asana_portfolio_create", "asana_portfolio_update" and "asana_portfolio_delete"
