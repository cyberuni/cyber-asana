Feature: scrum scopes

  Configuring, selecting, and resolving the scopes a scrum team works in, over the CLI and MCP
  surfaces that share one api.ts.

  # ── configuration ──

  Scenario: adding a scope writes schema version 3
    Given a repo config with schema_version 2 and no scope
    When config scope add runs for "web" with kind "project" and project "1201"
    Then the file holds schema_version 3 and scrum.scopes with the scope "web"

  Scenario: a scrum block under schema version 2 is rejected
    Given a repo config with schema_version 2 and a scrum block
    When the config is loaded
    Then the load fails with a message that scrum needs schema_version 3

  Scenario: a scope may override only the three sprint keys
    Given a scope "web" that sets "hours_per_point"
    When the config is loaded
    Then the load fails naming scrum.scopes[0].hours_per_point

  Scenario: a scope added as default takes the marker from the previous default
    Given scopes "web" (default) and "platform"
    When config scope add runs for "platform" with --default
    Then "platform" is the only scope marked default

  Scenario: removing the last scope drops the scrum block
    Given one scope "web"
    When config scope remove runs for "web"
    Then the file holds no scrum block

  Scenario: removing a scope that is not configured succeeds as a no-op
    Given one scope "web"
    When config scope remove runs for "nope"
    Then it exits 0, reports already_absent, and writes nothing

  Scenario: a repo scope wins a name clash with a global scope
    Given the repo config scope "web" with project "1" and the global scope "web" with project "9"
    When config scope list runs
    Then "web" is listed once, with project "1", from the repo

  Scenario: the repo supplies the default scope
    Given the repo scope "a" marked default and the global scope "b" marked default
    When a scope is selected with no --scope
    Then the scope is "a"

  Scenario: editing a repo's global projects keeps its scopes
    Given a global repo entry holding a scope
    When config add --global registers a project for that repo
    Then the entry still holds the scope

  # ── field roles ──

  Scenario Outline: discover-fields matches the sprint and status roles
    Given a project with an enum field named "<name>"
    When config discover-fields runs
    Then the field is saved under the role "<role>"

    Examples:
      | name      | role   |
      | Sprint    | sprint |
      | Iteration | sprint |
      | Status    | status |
      | Stage     | status |

  Scenario: a text field named Status is not a status role
    Given a project with a text field named "Status"
    When config discover-fields runs
    Then no status role is saved

  # ── selecting ──

  Scenario: --scope selects by name, ignoring case
    Given scopes "web" and "platform"
    When scrum scope resolve runs with --scope "PLATFORM"
    Then the scope is "platform"

  Scenario: an unknown scope is scope-unknown with the configured names as options
    Given scopes "web" and "platform"
    When scrum scope resolve runs with --scope "nope"
    Then it fails with code "scope-unknown" and options "web, platform"
    And the exit code is 2

  Scenario: no way to pick a scope is scope-missing
    Given scopes "platform" and none marked default
    When scrum scope resolve runs with no --scope
    Then it fails with code "scope-missing" and the exit code is 2

  Scenario: the default project stands in when no scope is configured
    Given no scope and a registered default project "1201"
    When scrum scope resolve runs with no --scope
    Then the scope is implicit, of kind "project", with project "1201"

  Scenario: the default project does not stand in once a scope exists
    Given scope "platform" not marked default and a registered default project
    When scrum scope resolve runs with no --scope
    Then it fails with code "scope-missing"

  # ── resolving ──

  Scenario: a scope's overrides lie over the policy's sprint settings
    Given the policy sets sprint_length_days 14 and the scope sets sprint_length_days 7
    When scrum scope resolve runs
    Then the sprint settings show sprint_length_days 7 and the policy's sprint_model

  Scenario: a task homed in two projects of a scope is counted once
    Given a projects scope over "1" and "2" and a task "t2" in both
    When scrum scope resolve runs with --tasks
    Then "t2" appears once

  Scenario: a portfolio scope follows nested portfolios
    Given a portfolio "1" holding project "10" and portfolio "2", which holds portfolio "3" holding project "12"
    When scrum scope resolve runs for a portfolio scope over "1"
    Then the projects are "10" and "12"

  Scenario: a portfolio that contains itself ends the walk
    Given portfolio "1" holds portfolio "2", which holds portfolio "1"
    When scrum scope resolve runs for a portfolio scope over "1"
    Then each portfolio is read once
