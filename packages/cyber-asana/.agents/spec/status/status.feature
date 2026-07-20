Feature: status

  Reading, posting, and removing Asana status updates on a project, a portfolio,
  or a goal through one parent-agnostic surface, over the CLI and MCP entry
  points that share one api.ts.

  # ── status list / asana_status_list ──

  Scenario: list returns the status updates of whichever parent GID it is given
    Given a project named "Lantern Bay Rollout" with GID "8801" carrying a status update titled "Week 3 checkpoint"
    And a portfolio named "Copperfield Holdings" with GID "8802" carrying a status update titled "Quarter close"
    And a goal named "Halve Onboarding Time" with GID "8803" carrying a status update titled "Halfway there"
    When the status list entry point runs once for each of the GIDs "8801", "8802" and "8803"
    Then the run for "8801" returns a status update titled "Week 3 checkpoint"
    And the run for "8802" returns a status update titled "Quarter close"
    And the run for "8803" returns a status update titled "Halfway there"

  Scenario: list accepts the parent GID under the legacy parent flag
    Given a project with GID "8801" carrying a status update with GID "9101"
    When the status list entry point runs with the legacy --parent flag set to "8801"
    Then the returned list contains a status update with the GID "9101"

  Scenario: list renders each status update's GID, type, and title in text mode
    Given a parent with GID "8801" carrying a status update with GID "9101", type "on_track", and title "Week 3 checkpoint"
    And that same parent carrying a status update with GID "9102", type "at_risk", and title "Vendor slipped"
    When the status list entry point runs in text mode for the GID "8801"
    Then stdout pairs "9101" with "on_track" and "Week 3 checkpoint" on one row
    And stdout pairs "9102" with "at_risk" and "Vendor slipped" on one row

  Scenario: list offers no parent-type option
    Given the status command group
    When the help text for the list subcommand is rendered
    Then the options it lists contain no option whose flag names a project, a portfolio, or a goal

  Scenario: list without a parent GID is a usage error
    Given the status command group
    When the status list entry point runs with no parent GID supplied
    Then the process exits with a non-zero status
    And stderr states that a Parent GID is required

  Scenario: list does not fall back to an environment variable for the parent GID
    Given the ASANA_WORKSPACE environment variable is set to "8801"
    When the status list entry point runs with no parent GID supplied
    Then the process exits with a non-zero status
    And no request reaches the Asana status-updates endpoint

  # ── status get / asana_status_get ──

  Scenario: get returns the status update record for the GID it was given
    Given a status update with GID "9101", type "on_track", and title "Week 3 checkpoint"
    When the status get entry point runs with the GID "9101"
    Then the returned record has the GID "9101"
    And the returned record has the title "Week 3 checkpoint"

  Scenario: get renders the update's GID, type, title, timestamp, and body in text mode
    Given a status update with GID "9102", type "at_risk", and title "Vendor slipped"
    And that update created at "2026-04-09T11:00:00.000Z"
    And that update carrying the body text "Copper delivery pushed a week"
    When the status get entry point runs in text mode with the GID "9102"
    Then stdout contains "9102" and "at_risk" and "Vendor slipped"
    And stdout contains "2026-04-09T11:00:00.000Z"
    And stdout contains "Copper delivery pushed a week"

  Scenario: get takes the status update GID alone, with no parent GID
    Given the status command group
    When the help text for the get subcommand is rendered
    Then the options it lists contain no parent option

  Scenario: get without a status update GID is a usage error
    Given the status command group
    When the status get entry point runs with no GID argument
    Then the process exits with a non-zero status
    And no request reaches the Asana status-updates endpoint

  # ── status create / asana_status_create ──

  Scenario: create posts a status update to whichever parent GID it is given
    Given a project with GID "8801"
    And a portfolio with GID "8802"
    And a goal with GID "8803"
    When the status create entry point runs once for each of those GIDs with the status type "on_track"
    Then the request body for each run names that run's GID as the parent
    And the request body for each run carries the status type "on_track"

  Scenario: create renders the new update's GID, type, and title in text mode
    Given a project with GID "8801"
    And the Asana status-updates endpoint returning a created update with GID "9103", type "complete", and title "Rollout done"
    When the status create entry point runs in text mode for the GID "8801" with the status type "complete"
    Then stdout contains "9103"
    And stdout contains "complete"
    And stdout contains "Rollout done"

  Scenario: create carries both the plain-text body and the rich-text body when both are supplied
    Given a project with GID "8801"
    And a plain-text body of "Copper delivery pushed a week"
    And a rich-text body of "<body>Copper delivery pushed a week</body>"
    When the status create entry point runs for the GID "8801" with the status type "at_risk"
    Then the request body carries the plain text "Copper delivery pushed a week"
    And the request body carries the rich text "<body>Copper delivery pushed a week</body>"

  Scenario: create leaves out the optional body fields that were not supplied
    Given a project with GID "8801"
    When the status create entry point runs for the GID "8801" with the status type "on_track" and no title, text, or rich text
    Then the request body has no title field
    And the request body has no plain-text field and no rich-text field

  Scenario: create without a status type is a usage error
    Given a project with GID "8801"
    When the status create entry point runs for the GID "8801" with no status type supplied
    Then the process exits with a non-zero status
    And no request reaches the Asana status-updates endpoint

  Scenario: create without a parent GID is a usage error
    Given the status command group
    When the status create entry point runs with the status type "on_track" and no parent GID supplied
    Then the process exits with a non-zero status
    And stderr states that a Parent GID is required

  Scenario: create offers no parent-type option
    Given the status command group
    When the help text for the create subcommand is rendered
    Then the options it lists contain no option whose flag names a project, a portfolio, or a goal

  # ── status delete / asana_status_delete ──

  Scenario: delete removes the status update named by the GID
    Given a status update with GID "9101"
    When the status delete entry point runs with the GID "9101"
    Then a delete request reaches the Asana status-updates endpoint for the GID "9101"

  Scenario: delete confirms by naming the GID it removed
    Given a status update with GID "9101"
    When the status delete entry point runs in text mode with the GID "9101"
    Then stdout contains "9101"

  Scenario: delete takes the status update GID alone, with no parent GID
    Given the status command group
    When the help text for the delete subcommand is rendered
    Then the options it lists contain no parent option

  Scenario: delete without a status update GID is a usage error
    Given the status command group
    When the status delete entry point runs with no GID argument
    Then the process exits with a non-zero status
    And no request reaches the Asana status-updates endpoint
