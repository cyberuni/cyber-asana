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

  # ── sprints ──

  Scenario: the sprint is computed from the anchor, length, and name format
    Given sprint_anchor_date 2026-01-05, sprint_length_days 14, and "Sprint {n}"
    When sprint current runs on 2026-01-20
    Then the sprint is "Sprint 2", 2026-01-19 to 2026-02-01, with 10 working days

  Scenario: today is read in the user's timezone
    Given user me reports the timezone "Asia/Tokyo" and it is 2026-01-18T20:00Z
    When sprint current runs
    Then today is 2026-01-19 and timezone_source is "asana"

  Scenario: no timezone from Asana falls back to the machine's, and says so
    Given user me reports no timezone
    When sprint current runs
    Then timezone_source is "machine"

  Scenario: before the anchor there is no sprint
    Given sprint_anchor_date 2026-01-05 and today 2026-01-01
    When sprint current runs
    Then it fails with code "sprint-none"

  Scenario: a sprint with no section fails with the command that starts it
    Given no project of the scope has a section for the current sprint
    When sprint current runs
    Then it fails with code "sprint-none" and a hint naming sprint start

  Scenario: no anchor date is policy-incomplete
    Given the policy sets no sprint_anchor_date
    When sprint current runs
    Then it fails with code "policy-incomplete"

  Scenario: a model the CLI does not build in stops naming it
    Given the scope's sprint_model is "tags"
    When any sprint command runs
    Then it fails with code "model-unsupported" naming "tags"

  Scenario: a portfolio scope is not supported by the sections model
    Given a portfolio scope and sprint_model "sections"
    When sprint current runs
    Then it fails with code "model-unsupported"

  Scenario: sprint start is idempotent
    Given a project with no section for sprint 3
    When sprint start runs twice for sprint 3
    Then the first creates the section and the second reports already_started and creates nothing

  Scenario: sprint add moves a task into the sprint section
    Given task "t1" in the Backlog section and a "Sprint 2" section in the same project
    When sprint add runs for "t1"
    Then "t1" is in "Sprint 2" and the result names "Backlog" as where it came from

  Scenario: adding a task already in the sprint is a no-op
    Given task "t4" in "Sprint 2"
    When sprint add runs for "t4"
    Then nothing is moved and "t4" is in already_in_sprint

  Scenario: a task outside the scope's projects is reported, not moved
    Given a task in none of the scope's projects
    When sprint add runs for it
    Then it is listed in outside_scope

  Scenario: sprint close with carry_over move carries incomplete tasks into the next sprint
    Given "Sprint 2" with incomplete tasks "t4" and "t6" and no "Sprint 3" section
    When sprint close runs with carry_over move
    Then "Sprint 3" is created and holds "t4" and "t6", and completed tasks stay in "Sprint 2"

  Scenario: sprint close with carry_over leave moves nothing
    Given "Sprint 2" with incomplete tasks
    When sprint close runs with carry_over leave
    Then no task moves, no section is created, and the incomplete tasks are listed in left

  Scenario: closing again changes nothing
    Given sprint close already ran with carry_over move
    When sprint close runs again
    Then nothing moves and nothing is created

  Scenario: the backlog is every incomplete task in no sprint section
    Given sections "Backlog", "Sprint 2", and "Icebox" with incomplete tasks in each
    When backlog list runs
    Then it lists the Backlog and Icebox tasks, each with its section, and none from "Sprint 2"

  Scenario: a task a sprint section of another project holds is not in the backlog
    Given task "tx" in Backlog of one project and in "Sprint 2" of another
    When backlog list runs
    Then "tx" is not listed

  Scenario: a missing backlog section is named, not fatal
    Given a project with no "Backlog" section
    When backlog list runs
    Then backlog_section_missing names the project

  Scenario: sprint list marks each sprint past, current, or future
    Given sections for sprints 1 and 2 and today in sprint 2
    When sprint list runs
    Then sprint 1 is "past" and sprint 2 is "current"

  Scenario: --sprint rejects text that names no sprint
    Given the format "Sprint {n}"
    When sprint tasks runs with --sprint "Iteration 9"
    Then it fails with code "sprint-unknown"

  # ── reports: standup ──

  Scenario: Done holds only tasks completed inside the window
    Given a member completed "a" yesterday and "old" ten days ago, and "open" is incomplete
    When report standup runs
    Then Done lists "a" only

  Scenario: the window opens at midnight of the previous working day in the user's timezone
    Given today is a Monday and working_days are Monday to Friday
    When the window is computed
    Then it opens at midnight of the previous Friday in the user's timezone

  Scenario: Today is limited to the current sprint
    Given incomplete assigned tasks "a" in "Sprint 2" and "back" in the Backlog
    When report standup runs
    Then Today lists "a" only

  Scenario: with a status field Today is in progress, due today, or overdue
    Given state_carrier field and tasks in progress, due today, overdue, and due later
    When report standup runs
    Then Today lists the first three, each with its reason

  Scenario: without a state carrier Today falls back and says so
    Given state_carrier none
    When report standup runs
    Then Today lists every incomplete assigned task and notes name the state_carrier

  Scenario: Blocked names the blocker of each task
    Given a task with an incomplete dependency "d", a task tagged as blocked, and a task in a blocked state
    When report standup runs
    Then each appears under Blocked with its signal, and the dependency names "d"

  Scenario: Blocked lists only the current sprint
    Given a blocked task in the Backlog
    When report standup runs
    Then it is not under Blocked

  Scenario: story points and task points are totalled apart
    Given Done tasks with story points 5 and Today tasks with task points 2 and 3
    When report standup runs
    Then Done points are story 5, task 0 and Today points are story 0, task 5

  Scenario: no current sprint carries on and says why
    Given the current sprint has no section
    When report standup runs
    Then sprint is null, sprint_note names the sprint, and Today lists every incomplete assigned task

  Scenario: a named sprint that has not started fails
    Given no "Sprint 5" section
    When report standup runs with --sprint 5
    Then it fails with code "sprint-none"

  Scenario: another member by email
    Given a user with that email
    When report standup runs with --member
    Then the report is for that user's tasks and member.source is "member"

  Scenario: the team form is refused for now
    When report standup runs with --team
    Then it fails with code "team-unsupported" and exits 2

  # ── reports: health ──

  Scenario: each enabled check yields a result and each finding a level, the task, and a fix
    Given a sprint task with no assignee and another overdue
    When report health runs
    Then H3 and H4 are "failed", and each finding names its task and a fix command

  Scenario: only the checks in the reference run
    Given the health reference lists checks H3 and H4
    When report health runs
    Then only H3 and H4 appear in checks

  Scenario: H8 is skipped, not passed
    When report health runs
    Then H8 is "skipped" with the reason "capacity unknown: allocations not wired yet"

  Scenario: without a state carrier in progress means incomplete and assigned
    Given state_carrier none and an assigned task unchanged for four days
    When report health runs
    Then H5 flags it and notes say in progress fell back

  Scenario: a missing sprint section is finding H9
    Given the current sprint has no section and H9 is enabled
    When report health runs
    Then H9 is reported with the sprint start command and the task checks are skipped

  Scenario: a missing sprint section fails when H9 is not enabled
    Given the current sprint has no section and checks omit H9
    When report health runs
    Then it fails with code "sprint-none"

  Scenario: a sprint that has not begun fails even with H9 enabled
    Given today is before the anchor date
    When report health runs
    Then it fails with code "sprint-none"

  Scenario: a task in two sprints is flagged
    Given an incomplete task in "Sprint 2" and "Sprint 3"
    When report health runs
    Then H11 names both sprints

  # ── reports: workload ──

  Scenario: workload sums both point kinds into effort hours and shows the parts
    Given hours_per_point 2 and Ann has 3 story points and 1 task point open in the sprint
    When report workload runs
    Then Ann has effort hours story 6, task 2, and total 8

  Scenario: a percent allocation is percent times working hours per day times working days
    Given Ann is allocated 50 percent for the whole of a ten working day sprint
    When report workload runs
    Then Ann's capacity is 40 hours

  Scenario: an hours allocation is taken as given when it lies inside the window
    Given Ann is allocated 20 hours inside the sprint
    When report workload runs
    Then Ann's capacity is 20 hours

  Scenario: an allocation is clipped to the window
    Given Ann is allocated 100 percent and 80 hours over twenty working days, and the window covers five of them
    When report workload runs
    Then Ann's capacity is 60 hours

  Scenario: utilization over the threshold is over and under the threshold is under
    Given Ann is at 125 percent and Bob at 12.5 percent
    When report workload runs
    Then Ann is flagged "over" and Bob "under"

  Scenario: a plan without allocations names the reason and still shows the load
    Given Asana answers 402 to the allocation read
    When report workload runs
    Then every person's capacity is "unknown" with reason "plan", the effort hours show, and notes name the plan limit

  Scenario: a person with no allocation in the window is unknown, not fine
    Given Bob has tasks and no allocation overlapping the window
    When report workload runs
    Then Bob's capacity is "unknown" with reason "no-allocation" and his flag is "unknown"

  Scenario: out of office is a note and never subtracted
    Given Ann is out of office for two days of the sprint and allocated 40 hours
    When report workload runs
    Then Ann lists her out-of-office range and her capacity is still 40 hours

  Scenario: the team total counts only people whose capacity is known
    Given Ann's capacity is 40 hours and Bob's is unknown
    When report workload runs
    Then the team capacity is 40 hours, one person is unknown, and utilization is Ann's alone

  Scenario: a sprint with no section fails with sprint-none
    Given the sprint has no section
    When report workload runs
    Then it fails with code "sprint-none" and exits 2

  Scenario: --from and --to replace the sprint
    Given incomplete assigned tasks due inside and outside a window, and one with no due date
    When report workload runs with --from and --to
    Then only the task due inside counts, and notes count the one with no due date

  Scenario: a half-given or backwards window is window-invalid
    When report workload runs with --from alone, or with from after to
    Then it fails with code "window-invalid" and exits 2
