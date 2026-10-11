@frozen
Feature: attachments

  Reading the files attached to an Asana task, and reading one attachment by GID,
  over the CLI and MCP surfaces that share one api.ts.

  # ── attachment list / asana_attachment_list ──

  Scenario: list returns the attachments of the task GID it was given
    Given a task with GID "8801" carrying an attachment named "levee-survey.pdf"
    And that same task carries an attachment named "tidegate-diagram.png"
    When the attachment list entry point runs with the task GID "8801"
    Then the request reaching Asana names "8801" as the parent object
    And the output names both "levee-survey.pdf" and "tidegate-diagram.png"

  Scenario: list accepts the legacy task flag as the parent GID
    Given a task with GID "8801" carrying an attachment named "levee-survey.pdf"
    When the attachment list CLI verb runs with the legacy task flag set to "8801"
    Then the request reaching Asana names "8801" as the parent object
    And the process exits with status zero

  Scenario: list without a task GID is a usage error
    Given the attachment list entry point receives no task GID
    When the attachment list CLI verb runs
    Then the process exits with a non-zero status
    And stderr states that the task GID is required

  Scenario: list does not default its parent task GID from the environment
    Given the ASANA_WORKSPACE_GID environment variable is set to "7710"
    And the attachment list entry point receives no task GID
    When the attachment list CLI verb runs
    Then the process exits with a non-zero status
    And no request reaches the Asana attachments endpoint

  Scenario: list sends its pagination options without disturbing the parent task GID
    Given a list request naming the task GID "8801"
    And that same request carrying a page size of 25
    And that same request carrying the offset token "cGFnZTM"
    When the attachment list entry point runs
    Then the request reaching Asana names "8801" as the parent object
    And that request carries the page size 25
    And that request carries the offset token "cGFnZTM"

  Scenario: list renders each attachment's name and GID in text mode
    Given a task with GID "8801" carrying an attachment named "levee-survey.pdf" with GID "9107"
    And that same task carries an attachment named "tidegate-diagram.png" with GID "9108"
    When the attachment list entry point runs in text mode with the task GID "8801"
    Then stdout pairs "levee-survey.pdf" with "9107" on one row
    And stdout pairs "tidegate-diagram.png" with "9108" on one row

  # ── attachment get / asana_attachment_get ──

  Scenario: get returns the attachment record for the GID it was given
    Given an attachment named "levee-survey.pdf" with GID "9107"
    When the attachment get entry point runs with the GID "9107"
    Then the returned record has the GID "9107"
    And the returned record has the name "levee-survey.pdf"

  Scenario: get renders the attachment's name, GID and download URL in text mode
    Given an attachment named "levee-survey.pdf" with GID "9107"
    And that attachment's record carries the download URL "https://files.harbormaster.invalid/levee-survey.pdf"
    When the attachment get entry point runs in text mode with the GID "9107"
    Then stdout contains "levee-survey.pdf"
    And stdout contains "9107"
    And stdout contains "https://files.harbormaster.invalid/levee-survey.pdf"

  Scenario: get omits the URL line when the record carries no download URL
    Given an attachment named "tidegate-diagram.png" with GID "9108"
    And that attachment's record has the download URL field absent
    When the attachment get entry point runs in text mode with the GID "9108"
    Then stdout contains "tidegate-diagram.png"
    And stdout contains "9108"
    And stdout contains no line labelled "URL"

  Scenario: get without a GID is a usage error
    Given the attachment get CLI verb receives no positional argument
    When the attachment get CLI verb runs
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  Scenario: get offers no pagination options
    Given the attachment get entry point on either surface
    When its accepted inputs are listed
    Then those inputs contain no page size, offset, or fetch-all option

  # ── attachment create / asana_attachment_create ──

  Scenario: create carries the app connection on a url attachment
    Given a task with GID "8801"
    When the attachment create entry point runs with the parent GID "8801", the url "https://example.com/design" and the app-connection flag
    Then the request reaching the Asana attachments endpoint carries the url "https://example.com/design"
    And that request carries the connect_to_app field true

  Scenario: create refuses the app connection on a file upload
    Given a task with GID "8801"
    When the attachment create entry point runs with the parent GID "8801", the file path "./sprint.md" and the app-connection flag
    Then the process exits with a non-zero status
    And stderr states that the app-connection option applies to an external url attachment
    And no request reaches the Asana attachments endpoint

  Scenario: create sends no app-connection key when the flag is absent
    Given a task with GID "8801"
    When the attachment create entry point runs with the parent GID "8801" and the url "https://example.com/design"
    Then the request reaching the Asana attachments endpoint has no connect_to_app key
