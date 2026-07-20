Feature: projects

  Finding, reading, creating, editing, removing, counting, and exporting Asana
  projects, over the CLI and MCP entry points that share one api.ts.

  # ── project list / project search ──

  Scenario: list returns the projects of the workspace it was given
    Given a workspace named "Nettlefold" with GID "6120"
    And that workspace contains a project named "Tidewater Atlas"
    And that workspace contains a project named "Kiln Ledger"
    When the project list entry point runs with the workspace GID "6120"
    Then the request reaching Asana asks for the projects of workspace "6120"
    And the output names both "Tidewater Atlas" and "Kiln Ledger"

  Scenario: list without a workspace GID anywhere is a usage error
    Given the ASANA_WORKSPACE environment variable is unset
    When the project list command runs with no workspace flag
    Then the process exits with a non-zero status
    And stderr states that a Workspace GID is required
    And no request reaches Asana

  Scenario: search maps each named filter onto its Asana search parameter
    Given a workspace with GID "6120"
    And the team GID "7301"
    And the member identifier "potter@nettlefold.test" to be excluded
    And the date "2026-09-30" as a due-date upper bound
    When the project search entry point runs for workspace "6120" with the text "atlas" and those three filters
    Then the request reaching Asana carries "atlas" as its search text
    And the request reaching Asana carries "7301" under the parameter named "teams.any"
    And the request reaching Asana carries "potter@nettlefold.test" under the parameter named "members.not"
    And the request reaching Asana carries "2026-09-30" under the parameter named "due_on.before"

  Scenario: search offers no pagination options
    Given the project command group
    When the help text for the search subcommand is rendered
    Then the options it lists contain no limit, offset, or fetch-all option

  Scenario: search without a workspace GID anywhere is a usage error
    Given the ASANA_WORKSPACE environment variable is unset
    When the project search command runs with no workspace flag
    Then the process exits with a non-zero status
    And stderr states that a Workspace GID is required
    And no request reaches Asana

  Scenario: list and search render each project's name and GID in text mode
    Given a project named "Tidewater Atlas" with GID "44017" in workspace "6120"
    And a project named "Kiln Ledger" with GID "44018" in workspace "6120"
    When the project list command and the project search command each run in text mode for workspace "6120"
    Then stdout from each run pairs "Tidewater Atlas" with "44017" on one row
    And stdout from each run pairs "Kiln Ledger" with "44018" on one row

  # ── project create / project update / project delete ──

  Scenario: create sends the project name and workspace without the fields that were not supplied
    Given a workspace with GID "6120"
    When the project create entry point runs with the name "Tidewater Atlas" and the workspace GID "6120"
    Then the request body reaching Asana carries the name "Tidewater Atlas"
    And the request body reaching Asana carries the workspace "6120"
    And the request body reaching Asana has no notes field
    And the request body reaching Asana has no color field

  Scenario: create takes its workspace from the environment when no workspace flag is given
    Given the ASANA_WORKSPACE environment variable is set to "6120"
    When the project create command runs with the name "Kiln Ledger" and no workspace flag
    Then the request body reaching Asana carries the workspace "6120"

  Scenario: create refuses plain notes and HTML notes together
    Given a workspace with GID "6120"
    And the plain notes "Glaze schedule for the autumn kiln"
    And the HTML notes "<body>Glaze schedule for the autumn kiln</body>"
    When the project create entry point runs with the name "Tidewater Atlas" and both note forms
    Then the run fails with a message stating that the two note options are mutually exclusive
    And no create request reaches Asana

  Scenario: create carries HTML notes when they are the only note form given
    Given a workspace with GID "6120"
    And the HTML notes "<body>Glaze schedule for the autumn kiln</body>"
    When the project create entry point runs with the name "Tidewater Atlas" and those HTML notes
    Then the request body reaching Asana carries "<body>Glaze schedule for the autumn kiln</body>" as its HTML notes
    And the request body reaching Asana has no plain notes field

  Scenario: create refuses a start date with no due date
    Given a workspace with GID "6120"
    And the start date "2026-09-01"
    When the project create entry point runs with the name "Tidewater Atlas" and that start date
    Then the run fails with a message stating that the start-date option requires the due-date option
    And no create request reaches Asana

  Scenario: create carries a start date when a due date accompanies it
    Given a workspace with GID "6120"
    And the start date "2026-09-01"
    And the due date "2026-09-30"
    When the project create entry point runs with the name "Tidewater Atlas" and both dates
    Then the request body reaching Asana carries "2026-09-01" as its start date
    And the request body reaching Asana carries "2026-09-30" as its due date

  Scenario: create refuses a start date equal to the due date
    Given a workspace with GID "6120"
    And the date "2026-09-30" supplied as both the start date and the due date
    When the project create entry point runs with the name "Tidewater Atlas" and those dates
    Then the run fails with a message stating that the start date and the due date cannot be the same date
    And no create request reaches Asana

  Scenario: create without a project name is a usage error
    Given a shell whose environment defines no Asana variables
    When the project create command runs with no name argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument

  Scenario: create without a workspace GID anywhere is a usage error
    Given the ASANA_WORKSPACE environment variable is unset
    When the project create command runs with the name "Tidewater Atlas" and no workspace flag
    Then the process exits with a non-zero status
    And stderr states that a Workspace GID is required
    And no request reaches Asana

  Scenario: update sends only the fields that were supplied
    Given a project with GID "44017" whose notes read "Glaze schedule for the autumn kiln"
    When the project update entry point runs for the GID "44017" with the color "light-teal"
    Then the request body reaching Asana carries the color "light-teal"
    And the request body reaching Asana has no notes field
    And the request body reaching Asana has no due date field

  Scenario: update clears the due date with an explicit null
    Given a project with GID "44017" whose due date is "2026-09-30"
    When the project update entry point runs for the GID "44017" with the clear-due-date flag and no due date
    Then the request body reaching Asana carries a due date field whose value is null

  Scenario: update refuses a due date and the clear-due-date flag together
    Given a project with GID "44017"
    And the due date "2026-10-15"
    When the project update entry point runs for the GID "44017" with that due date and the clear-due-date flag
    Then the run fails with a message stating that the due-date option and the clear-due-date option are mutually exclusive
    And no update request reaches Asana

  Scenario: update refuses to clear the start date with no due date
    Given a project with GID "44017" whose start date is "2026-09-01"
    When the project update entry point runs for the GID "44017" with the clear-start-date flag and no due date
    Then the run fails with a message stating that the clear-start-date option requires the due-date option
    And no update request reaches Asana

  Scenario: update clears the start date when a due date accompanies it
    Given a project with GID "44017" whose start date is "2026-09-01"
    And the due date "2026-10-15"
    When the project update entry point runs for the GID "44017" with that due date and the clear-start-date flag
    Then the request body reaching Asana carries a start date field whose value is null
    And the request body reaching Asana carries "2026-10-15" as its due date

  Scenario: update without a project GID is a usage error
    Given a shell whose environment defines no Asana variables
    When the project update command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument
    And no update request reaches Asana

  Scenario: delete confirms by naming the project it removed
    Given a project named "Kiln Ledger" with GID "44018"
    When the project delete entry point runs in text mode with the GID "44018"
    Then a delete request reaches Asana for the project "44018"
    And stdout contains "44018"

  Scenario: delete without a project GID is a usage error
    Given a shell whose environment defines no Asana variables
    When the project delete command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument
    And no delete request reaches Asana

  # ── project counts ──

  Scenario: counts asks for the three default count fields and labels them
    Given a project with GID "44017" holding 12 tasks of which 7 are complete
    When the project counts command runs in text mode with the GID "44017" and no field list
    Then the request reaching Asana asks for the fields "num_tasks,num_incomplete_tasks,num_completed_tasks"
    And stdout pairs the label "Total Tasks" with "12"
    And stdout pairs the label "Completed Tasks" with "7"

  Scenario: counts asks for exactly the fields it was given and echoes their keys
    Given a project with GID "44017" holding 3 milestones
    And the Asana task-counts endpoint returning the field "num_milestones" with the value 3
    When the project counts command runs in text mode with the GID "44017" and the field list "num_milestones"
    Then the request reaching Asana asks for the fields "num_milestones"
    And stdout pairs "num_milestones" with "3"
    And stdout contains no line labelled "Total Tasks"

  Scenario: counts without a project GID is a usage error
    Given a shell whose environment defines no Asana variables
    When the project counts command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument
    And no request reaches Asana

  # ── project get ──

  Scenario: get returns the project record for the GID it was given
    Given a project named "Tidewater Atlas" with GID "44017"
    When the project get entry point runs with the GID "44017"
    Then the returned record has the GID "44017"
    And the returned record has the name "Tidewater Atlas"

  Scenario: get without a project GID is a usage error
    Given a shell whose environment defines no Asana variables
    When the project get command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument
    And no request reaches Asana

  Scenario: get refreshes the registry name of a project it already lists
    Given a repo registry file listing the GID "44017" under the name "Tidewater Chart"
    And a project with GID "44017" whose name in Asana is "Tidewater Atlas"
    When the project get command runs with the GID "44017"
    Then the repo registry file lists the GID "44017" under the name "Tidewater Atlas"

  Scenario: get adds no registry entry for a project the registry does not list
    Given a repo registry file listing only the GID "44018" under the name "Kiln Ledger"
    And a project with GID "44017" whose name in Asana is "Tidewater Atlas"
    When the project get command runs with the GID "44017"
    Then the repo registry file still lists exactly one project
    And the repo registry file contains no entry for the GID "44017"

  Scenario: get returns the project even when the registry cannot be written
    Given a repo registry file listing the GID "44017" under the name "Tidewater Chart"
    And that registry file is read-only for the running process
    And a project with GID "44017" whose name in Asana is "Tidewater Atlas"
    When the project get command runs in text mode with the GID "44017"
    Then stdout contains "Tidewater Atlas"
    And the process exits with status zero

  # ── project export ──

  Scenario: export renders the project as a Markdown checklist
    Given a project named "Tidewater Atlas" with GID "44017"
    And that project holds a section named "Glaze Run"
    And that section holds a task named "Mix the slip" that is complete
    And that section holds a task named "Fire the kiln" that is incomplete and due "2026-09-12"
    When the project export command runs in text mode with the GID "44017"
    Then stdout contains a line reading "# Tidewater Atlas"
    And stdout contains a line reading "## Glaze Run"
    And stdout contains a line reading "- [x] Mix the slip"
    And stdout contains a line starting "- [ ] Fire the kiln" and containing "due 2026-09-12"

  Scenario: export without a project GID is a usage error
    Given a shell whose environment defines no Asana variables
    When the project export command runs with no GID argument
    Then the process exits with a non-zero status
    And stderr names the missing required argument
    And no request reaches Asana

  Scenario: export marks a section holding no tasks
    Given a project named "Kiln Ledger" with GID "44018"
    And that project holds a section named "Cold Store" holding no tasks
    When the project export command runs in text mode with the GID "44018"
    Then stdout contains a line reading "## Cold Store"
    And stdout contains the line "_(no tasks)_"

  Scenario: export writes the Markdown to the file it was given
    Given a project named "Tidewater Atlas" with GID "44017"
    And the output file path "atlas-snapshot.md"
    When the project export command runs in text mode with the GID "44017" and that output file path
    Then the file "atlas-snapshot.md" contains a line reading "# Tidewater Atlas"
    And stdout names "atlas-snapshot.md"

  Scenario: asana_project_export returns the structured export when JSON is asked for
    Given a project named "Tidewater Atlas" with GID "44017"
    And that project holds a section named "Glaze Run" holding one task named "Fire the kiln"
    When the asana_project_export tool is called with the project GID "44017" and the format "json"
    Then the returned text parses as JSON whose project name is "Tidewater Atlas"
    And that parsed value has one section named "Glaze Run"
