Feature: sections

  Listing, reading, creating, renaming and deleting the named buckets that divide
  an Asana project's task list, over the CLI and MCP surfaces that share one api.ts.

  # ── section list / asana_section_list ──

  Scenario: list returns the sections of the project GID it was given
    Given a project with GID "4402" containing a section named "Dry Dock"
    And that same project contains a section named "Sea Trials"
    When the section list entry point runs with the project GID "4402"
    Then the request reaching Asana asks for the sections of project "4402"
    And the output names both "Dry Dock" and "Sea Trials"

  Scenario: list accepts the legacy project flag as the project scope
    Given a project with GID "4402" containing a section named "Dry Dock"
    When the section list CLI verb runs with the legacy project flag set to "4402"
    Then the request reaching Asana asks for the sections of project "4402"
    And the process exits with status zero

  Scenario: list without a project GID is a usage error
    Given the section list CLI verb receives no project GID
    When the section list CLI verb runs
    Then the process exits with a non-zero status
    And stderr states that a Project GID is required

  Scenario: list does not default its project GID from the environment
    Given the ASANA_WORKSPACE environment variable is set to "3300"
    And the section list CLI verb receives no project GID
    When the section list CLI verb runs
    Then the process exits with a non-zero status
    And no request reaches the Asana sections endpoint

  Scenario: list sends its pagination options without disturbing the project GID
    Given a list request naming the project GID "4402"
    And that same request carrying a page size of 25
    And that same request carrying the offset token "cGFnZTQ"
    When the section list entry point runs
    Then the request reaching Asana asks for the sections of project "4402"
    And that request carries the page size 25
    And that request carries the offset token "cGFnZTQ"

  Scenario: list renders each section's name and GID in text mode
    Given a project with GID "4402" containing a section named "Dry Dock" with GID "6610"
    And that same project contains a section named "Sea Trials" with GID "6611"
    When the section list CLI verb runs in text mode with the project GID "4402"
    Then stdout pairs "Dry Dock" with "6610" on one row
    And stdout pairs "Sea Trials" with "6611" on one row

  # ── section get / asana_section_get ──

  Scenario: get returns the section record for the GID it was given
    Given a section named "Dry Dock" with GID "6610"
    When the section get entry point runs with the section GID "6610"
    Then the returned record has the GID "6610"
    And the returned record has the name "Dry Dock"

  Scenario: get renders the section's name and GID in text mode
    Given a section named "Sea Trials" with GID "6611"
    When the section get CLI verb runs in text mode with the section GID "6611"
    Then stdout contains "Sea Trials"
    And stdout contains "6611"

  Scenario: get without a GID is a usage error
    Given the section get CLI verb receives no positional argument
    When the section get CLI verb runs
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  Scenario: get takes no project scope
    Given a section named "Dry Dock" with GID "6610" inside the project with GID "4402"
    When the section get entry point runs with the section GID "6610"
    Then the request reaching Asana addresses section "6610"
    And that request carries no project parameter

  # ── section create / asana_section_create ──

  Scenario: create adds a section with the given name to the project GID it was given
    Given a project with GID "4402" containing a section named "Dry Dock"
    When the section create entry point runs with the project GID "4402" and the name "Sea Trials"
    Then the request reaching Asana creates a section in project "4402"
    And that request carries the section name "Sea Trials"
    And the returned record has the name "Sea Trials"

  Scenario: create renders the new section's name and GID in text mode
    Given a project with GID "4402" that accepts a new section
    And Asana assigns the GID "6612" to the section it creates
    When the section create CLI verb runs in text mode with the project GID "4402" and the name "Rigging"
    Then stdout contains "Rigging"
    And stdout contains "6612"

  Scenario: create without a project GID is a usage error
    Given the section create CLI verb receives the name "Rigging"
    And that same invocation receives no project GID
    When the section create CLI verb runs
    Then the process exits with a non-zero status
    And stderr states that a Project GID is required

  Scenario: create without a name is a usage error
    Given the section create CLI verb receives the project GID "4402"
    And that same invocation receives no positional name argument
    When the section create CLI verb runs
    Then the process exits with a non-zero status
    And no request reaches the Asana sections endpoint

  # ── section update / asana_section_update ──

  Scenario: update renames the section named by the GID it was given
    Given a section named "Dry Dock" with GID "6610"
    When the section update entry point runs with the section GID "6610" and the name "Hull Survey"
    Then the request reaching Asana addresses section "6610"
    And that request carries the section name "Hull Survey"
    And the returned record has the name "Hull Survey"

  Scenario: update renders the renamed section's name and GID in text mode
    Given a section named "Dry Dock" with GID "6610"
    When the section update CLI verb runs in text mode with the section GID "6610" and the name "Hull Survey"
    Then stdout contains "Hull Survey"
    And stdout contains "6610"

  Scenario: update without a new name is a usage error
    Given the section update CLI verb receives the section GID "6610"
    And that same invocation receives no name flag
    When the section update CLI verb runs
    Then the process exits with a non-zero status
    And no request reaches the Asana sections endpoint

  Scenario: update without a GID is a usage error
    Given the section update CLI verb receives the name flag set to "Hull Survey"
    And that same invocation receives no positional argument
    When the section update CLI verb runs
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  # ── section delete / asana_section_delete ──

  Scenario: delete removes the section named by the GID it was given
    Given a section named "Sea Trials" with GID "6611"
    When the section delete entry point runs with the section GID "6611"
    Then the request reaching Asana deletes section "6611"
    And the output is a single confirmation line containing "6611"

  Scenario: delete emits the same confirmation line in every output format
    Given a section named "Sea Trials" with GID "6611"
    And the section delete CLI verb run once in text mode and once with the JSON format flag
    When the two runs are compared
    Then both runs print the same confirmation line containing "6611"
    And neither run prints a JSON document

  Scenario: delete without a GID is a usage error
    Given the section delete CLI verb invoked with an empty argument list
    When the section delete CLI verb runs
    Then the process exits with a non-zero status
    And no request reaches the Asana sections endpoint

  # ── surface boundary ──

  Scenario: the section command group offers exactly five verbs
    Given the section CLI command group
    When the help text for the group is rendered
    Then the subcommands it lists are exactly "list", "get", "create", "update" and "delete"

  Scenario: the MCP surface registers exactly the five section tools
    Given an MCP server with the section tools registered
    When the registered tool names beginning with "asana_section_" are listed
    Then those names are exactly "asana_section_list", "asana_section_get", "asana_section_create", "asana_section_update" and "asana_section_delete"
