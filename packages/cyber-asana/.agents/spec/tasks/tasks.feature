Feature: tasks

  Finding, reading, writing, and relating Asana tasks — lists that ask for four
  fields, single reads that ask for everything, batched reads that fail per GID,
  and writes that send only what was supplied — over the CLI and MCP surfaces
  that share one api.ts.

  # ── Listing tasks in a container ──

  Scenario: a task list asks Asana for only the four fields the table renders
    Given a project named "Coastal Survey 1908" with GID "7201"
    And a workspace named "Tidewater Cartography" with GID "7100"
    And a task named "Regrind the theodolite lens" with GID "7301"
    When the task list entry point runs for the project GID "7201" with no fields named
    And the my-tasks list entry point runs for the workspace GID "7100" with no fields named
    And the subtask list entry point runs for the task GID "7301" with no fields named
    Then the request from each of those three runs carries the opt_fields value "gid,name,completed,due_on"

  Scenario: an explicit field list replaces the default task field set
    Given a project named "Coastal Survey 1908" with GID "7201"
    When the task list entry point runs for the project GID "7201" naming the fields "gid,permalink_url"
    Then the request reaching the tasks-for-project endpoint carries the opt_fields value "gid,permalink_url"

  Scenario: a subtask include flag supplies the field set in place of the default
    Given a task named "Regrind the theodolite lens" with GID "7301"
    When the subtask list entry point runs for the task GID "7301" with the assignee-email include flag and no fields named
    Then the request reaching the subtasks endpoint carries the opt_fields value "assignee,assignee.email"

  Scenario: the MCP task list tool sends no default field set
    Given a project named "Coastal Survey 1908" with GID "7201"
    When the asana_task_list tool runs with the project GID "7201" and no opt_fields parameter
    Then the request reaching the tasks-for-project endpoint carries no opt_fields value

  Scenario: the incomplete flag lists only tasks completed since now
    Given a project named "Coastal Survey 1908" with GID "7201"
    When the task list entry point runs for the project GID "7201" with the incomplete flag and the completed-since date "2026-01-04"
    Then the request reaching the tasks-for-project endpoint carries the completed_since value "now"

  Scenario: a task list without a project GID is a usage error
    Given the task command group
    When the task list entry point runs with no project GID supplied
    Then the process exits with a non-zero status
    And no request reaches the tasks-for-project endpoint

  Scenario: my-tasks takes the workspace GID from the environment
    Given the ASANA_WORKSPACE environment variable is set to "7100"
    When the my-tasks list entry point runs with no workspace GID flag
    Then the user-task-list lookup reaching Asana names the workspace GID "7100"

  Scenario: my-tasks resolves the authenticated user's task list before reading tasks
    Given a workspace named "Tidewater Cartography" with GID "7100"
    And the authenticated user's personal task list in that workspace has the GID "7405"
    When the my-tasks list entry point runs for the workspace GID "7100"
    Then a user-task-list lookup reaches Asana for the user "me" in the workspace "7100"
    And the tasks read that follows it names the user task list GID "7405"

  Scenario: a task list reports how many of the listed tasks are done
    Given a project named "Coastal Survey 1908" with GID "7201"
    And that project holding a completed task "Varnish the plane table"
    And that project holding two incomplete tasks "Regrind the theodolite lens" and "Index the tidal almanac"
    When the task list entry point runs in text mode for the project GID "7201"
    Then stdout contains "3 task(s): 2 incomplete, 1 done"

  Scenario: an empty task list reports no done-versus-incomplete count
    Given a project named "Dry Dock Backlog" with GID "7202"
    And the tasks-for-project endpoint answers for "7202" with an empty list
    When the task list entry point runs in text mode for the project GID "7202"
    Then stdout contains no line matching "task(s):"

  # ── Reading tasks by GID ──

  Scenario: get asks for the wide single-task field set
    Given a task named "Regrind the theodolite lens" with GID "7301"
    When the task get entry point runs with the GID "7301"
    Then the request reaching the single-task endpoint carries an opt_fields value containing "html_notes"
    And that opt_fields value contains "memberships.section.name"
    And that opt_fields value contains "num_subtasks"

  Scenario: get shows the rich-text notes in place of the plain notes
    Given a task with GID "7301" whose plain notes read "grind to 400 grit"
    And that task's rich notes read "<body><strong>grind to 400 grit</strong></body>"
    When the task get entry point runs in text mode with the GID "7301"
    Then stdout contains "<strong>grind to 400 grit</strong>"

  Scenario: get-many returns one record per requested GID in the order given
    Given a task with GID "7303" named "Index the tidal almanac"
    And a task with GID "7301" named "Regrind the theodolite lens"
    And a task with GID "7302" named "Varnish the plane table"
    When the task get-many entry point runs with the GIDs "7303", "7301" and "7302"
    Then the returned records carry the GIDs "7303", "7301" and "7302" in that order

  Scenario: get-many splits more than ten GIDs across separate batch requests
    Given twelve tasks whose GIDs run from "7401" through "7412"
    When the task get-many entry point runs with all twelve of those GIDs
    Then two requests reach the batch endpoint
    And the first of them carries ten actions and the second carries two
    And the returned records carry all twelve GIDs

  Scenario: get-many reports a per-GID failure alongside the lookups that succeeded
    Given a task with GID "7301" named "Regrind the theodolite lens"
    And the batch endpoint answering status 404 with the error message "Not Found" for the GID "7399"
    When the task get-many entry point runs with the GIDs "7301" and "7399"
    Then the record for "7301" carries the task name "Regrind the theodolite lens"
    And the record for "7399" carries the status 404
    And the record for "7399" carries the error message "Not Found"

  Scenario: get-many carries the requested fields in each batched task path
    Given a task with GID "7301" named "Regrind the theodolite lens"
    When the task get-many entry point runs with the GID "7301" naming the fields "gid,permalink_url"
    Then the action reaching the batch endpoint names the relative path "/tasks/7301?opt_fields=gid,permalink_url"

  # ── Creating, updating, and deleting a task ──

  Scenario: create posts the task name under the workspace GID it was given
    Given a workspace named "Tidewater Cartography" with GID "7100"
    When the task create entry point runs for the workspace GID "7100" with the name "Regrind the theodolite lens"
    Then the request body reaching the task-creation endpoint carries the name "Regrind the theodolite lens"
    And that request body carries the workspace value "7100"

  Scenario: create and update send only the optional fields that were supplied
    Given a workspace named "Tidewater Cartography" with GID "7100"
    And a task with GID "7301"
    When the task create entry point runs for the workspace GID "7100" with the name "Varnish the plane table" and the due date "2026-03-02" as its only optional input
    And the task update entry point runs for the GID "7301" with the name "Varnish the plane table" as its only optional input
    Then the create request body carries the due_on value "2026-03-02"
    And the create request body has no notes field and no assignee field
    And the update request body has no notes field and no due_on field

  Scenario: conflicting write options are rejected before any request reaches Asana
    Given a workspace named "Tidewater Cartography" with GID "7100"
    And a task with GID "7301"
    When the task create entry point runs with the notes "grind to 400 grit" and the rich notes "<body>grind to 400 grit</body>"
    And the task update entry point runs for the GID "7301" with the parent GID "7302" and the clear-parent flag
    And the task update entry point runs for the GID "7301" with the due date "2026-03-02" and the clear-due-on flag
    Then each of those three runs exits with a non-zero status
    And no request reaches the task-creation endpoint or the task-update endpoint
    And stderr names the mutually exclusive pair for each run

  Scenario: create sends followers twice, on the create body and again in a follower-addition request
    Given a workspace named "Tidewater Cartography" with GID "7100"
    And the task-creation endpoint answering with a task whose GID is "7301"
    And a user "Bex Halloran" with GID "7501"
    And a user "Ines Okonjo" with GID "7502"
    When the task create entry point runs for the workspace GID "7100" with the name "Regrind the theodolite lens" and the follower GIDs "7501,7502"
    Then the request body reaching the task-creation endpoint carries the follower GIDs "7501" and "7502"
    And a follower-addition request reaches Asana for the task GID "7301"
    And that request carries the follower GIDs "7501" and "7502"

  Scenario: a repeated custom-field entry overrides the same field from the custom-fields JSON
    Given a workspace named "Tidewater Cartography" with GID "7100"
    And a custom-fields JSON value of "{\"7601\":\"chart\",\"7602\":2}"
    And a custom-field entry of "7602=survey"
    And a custom-field entry of "7603=tidal"
    When the task create entry point runs for the workspace GID "7100" with the name "Index the tidal almanac" and those custom-field inputs
    Then the request body carries the custom field "7601" with the value "chart"
    And that request body carries the custom field "7602" with the value "survey"
    And that request body carries the custom field "7603" with the value "tidal"

  Scenario: malformed custom-field input is rejected before any request reaches Asana
    Given a workspace named "Tidewater Cartography" with GID "7100"
    When the task create entry point runs for the workspace GID "7100" with the custom-fields JSON value "[\"chart\"]"
    And the task create entry point runs for the workspace GID "7100" with the custom-field entry "7602"
    Then each of those two runs exits with a non-zero status
    And no request reaches the task-creation endpoint

  Scenario: clear-due-on sets the due date to null
    Given a task with GID "7301" whose due date is "2026-03-02"
    When the task update entry point runs for the GID "7301" with the clear-due-on flag as its only input
    Then the request body reaching the task-update endpoint carries a due_on value of null

  Scenario: update routes a parent change through a separate request from the other fields
    Given a task with GID "7301"
    And a task with GID "7302" named "Varnish the plane table"
    When the task update entry point runs for the GID "7301" with the name "Regrind the theodolite lens" and the parent GID "7302"
    Then the request body reaching the task-update endpoint carries the name "Regrind the theodolite lens"
    And that request body has no parent field
    And a set-parent request reaches Asana for the task GID "7301" carrying the parent value "7302"

  Scenario: clear-parent alone issues only the parent request
    Given a task with GID "7301" whose parent is the task "7302"
    When the task update entry point runs for the GID "7301" with the clear-parent flag as its only input
    Then no request reaches the task-update endpoint
    And a set-parent request reaches Asana for the task GID "7301" carrying a parent value of null

  Scenario: delete confirms by naming the task it removed
    Given a task with GID "7301" named "Regrind the theodolite lens"
    When the task delete entry point runs in text mode with the GID "7301"
    Then a delete request reaches Asana for the task GID "7301"
    And stdout contains "7301"

  Scenario: subtask create posts the name under the parent task
    Given a task with GID "7301" named "Regrind the theodolite lens"
    When the subtask create entry point runs for the parent GID "7301" with the name "Order the grinding paste"
    Then the subtask-creation request reaches Asana for the parent task GID "7301"
    And that request body carries the name "Order the grinding paste"
    And that request body has no notes field and no due_on field

  # ── Project membership and position ──

  Scenario: project add posts the project GID with no positioning keys when none are given
    Given a task with GID "7301"
    And a project named "Coastal Survey 1908" with GID "7201"
    When the task project add entry point runs with the task GID "7301" and the project GID "7201"
    Then the request body reaching the add-project endpoint carries the project value "7201"
    And that request body has no section field, no insert_after field, and no insert_before field

  Scenario: project add carries the section and the insert-after position
    Given a task with GID "7301"
    And a project named "Coastal Survey 1908" with GID "7201"
    And a section named "Field work" with GID "7701"
    And a task with GID "7302" already sitting in that section
    When the task project add entry point runs with the task GID "7301", the project GID "7201", the section GID "7701", and the insert-after GID "7302"
    Then the request body reaching the add-project endpoint carries the section value "7701"
    And that request body carries the insert_after value "7302"

  Scenario: project add with both insert-after and insert-before is a usage error
    Given a task with GID "7301"
    And a project named "Coastal Survey 1908" with GID "7201"
    When the task project add entry point runs with the task GID "7301", the project GID "7201", the insert-after GID "7302", and the insert-before GID "7303"
    Then the process exits with a non-zero status
    And stderr states that insert-after and insert-before are mutually exclusive
    And no request reaches the add-project endpoint

  Scenario: the MCP project-add tool forwards both positioning values without a local guard
    Given a task with GID "7301"
    And a project named "Coastal Survey 1908" with GID "7201"
    When the asana_task_project_add tool runs with the task GID "7301", the project GID "7201", the insert-after GID "7302", and the insert-before GID "7303"
    Then the request body reaching the add-project endpoint carries the insert_after value "7302"
    And that request body carries the insert_before value "7303"

  Scenario: project remove confirms the task left the project
    Given a task with GID "7301" sitting in the project "7201"
    When the task project remove entry point runs in text mode with the task GID "7301" and the project GID "7201"
    Then the request body reaching the remove-project endpoint carries the project value "7201"
    And stdout contains "7301" and "7201"

  # ── Followers ──

  Scenario: follower add sends the user GIDs as a plain list of strings
    Given a task with GID "7301"
    And a user "Bex Halloran" with GID "7501"
    And a user "Ines Okonjo" with GID "7502"
    When the task follower add entry point runs in text mode with the task GID "7301" and the user GIDs "7501" and "7502"
    Then the request body reaching the follower-addition endpoint carries the followers list of the two strings "7501" and "7502"
    And stdout contains "2 follower(s)"

  Scenario: follower remove reaches the follower-removal endpoint and reports the count
    Given a task with GID "7301" followed by the users "7501" and "7502"
    When the task follower remove entry point runs in text mode with the task GID "7301" and the user GIDs "7501" and "7502"
    Then a request reaches the follower-removal endpoint for the task GID "7301"
    And no request reaches the follower-addition endpoint
    And stdout contains "2 follower(s)"

  # ── Dependencies and dependents ──

  Scenario: dependency list asks for a default field set when none is named
    Given a task with GID "7301"
    When the task dependency list entry point runs with the task GID "7301" and no fields named
    Then the request reaching the dependencies endpoint carries the opt_fields value "gid,name,completed,due_on"

  Scenario: dependency add wraps each GID in an object in the request body
    Given a task with GID "7301"
    And a task with GID "7302" named "Varnish the plane table"
    And a task with GID "7303" named "Index the tidal almanac"
    When the task dependency add entry point runs with the task GID "7301" and the dependency GIDs "7302" and "7303"
    Then the request body reaching the dependency-addition endpoint carries a dependencies list of two objects
    And the first of those objects carries the gid "7302"
    And the second of those objects carries the gid "7303"

  Scenario: the dependency and dependent verbs reach the endpoint matching their direction
    Given a task with GID "7301"
    And a task with GID "7302"
    When the task dependency add entry point runs with the task GID "7301" and the GID "7302"
    And the task dependent add entry point runs with the task GID "7301" and the GID "7302"
    And the task dependency list entry point runs with the task GID "7301"
    And the task dependent list entry point runs with the task GID "7301"
    Then the two dependency runs reach the dependencies endpoints and not the dependents endpoints
    And the two dependent runs reach the dependents endpoints and not the dependencies endpoints

  Scenario: dependency remove reports how many dependencies it removed
    Given a task with GID "7301" that depends on the tasks "7302" and "7303"
    When the task dependency remove entry point runs in text mode with the task GID "7301" and the GIDs "7302" and "7303"
    Then a request reaches the dependency-removal endpoint for the task GID "7301"
    And stdout contains "2 dependency(s)"

  # ── Searching a workspace ──

  Scenario: search maps its any, not, and all filters to Asana's dotted parameter names
    Given a workspace named "Tidewater Cartography" with GID "7100"
    When the task search entry point runs for the workspace GID "7100" with the assignee GID "7501", the excluded project GID "7202", and the required tag GIDs "7801,7802"
    Then the request reaching the workspace-search endpoint carries the parameter "assignee.any" with the value "7501"
    And that request carries the parameter "projects.not" with the value "7202"
    And that request carries the parameter "tags.all" with the value "7801,7802"

  Scenario: search asks only for incomplete tasks under the no-completed flag
    Given a workspace named "Tidewater Cartography" with GID "7100"
    When the task search entry point runs for the workspace GID "7100" with the no-completed flag
    Then the request reaching the workspace-search endpoint carries the completed parameter with the value false

  Scenario: search asks for the default task field set when no fields are named
    Given a workspace named "Tidewater Cartography" with GID "7100"
    When the task search entry point runs for the workspace GID "7100" with the text "theodolite" and no fields named
    Then the request reaching the workspace-search endpoint carries the opt_fields value "gid,name,completed,due_on"

  Scenario: search offers no pagination options
    Given the task command group
    When the help text for the search subcommand is rendered
    Then the options it lists contain no limit option, no offset option, and no all option

  # ── Scanning source for TODO markers ──

  Scenario: scan-todos reports the marker, relative path, and line of each hit
    Given a directory holding a file "survey/theodolite.ts"
    And line 3 of that file reading "// TODO: regrind the lens"
    And line 9 of that file reading "// FIXME: plane table warps in damp air"
    When the scan-todos entry point runs against that directory
    Then one returned match carries the pattern "TODO", the file "survey/theodolite.ts", the line 3, and the text "regrind the lens"
    And another returned match carries the pattern "FIXME", the file "survey/theodolite.ts", the line 9, and the text "plane table warps in damp air"

  Scenario: scan-todos skips the directories and file types outside its filters
    Given a directory holding a file "survey/theodolite.ts" whose line 3 reads "// TODO: regrind the lens"
    And that directory holding a file "node_modules/almanac/index.ts" whose line 1 reads "// TODO: vendored marker"
    And that directory holding a file "survey/notes.txt" whose line 1 reads "// TODO: plain text marker"
    When the scan-todos entry point runs against that directory with the extension list ".ts" and the exclude list "node_modules"
    Then the returned matches carry exactly one file, "survey/theodolite.ts"

  Scenario: scan-todos runs without contacting Asana
    Given the ASANA_TOKEN environment variable is set to the string "not-a-real-token"
    And a directory holding a file "survey/theodolite.ts" whose line 3 reads "// TODO: regrind the lens"
    When the scan-todos entry point runs against that directory
    Then the process exits with status 0
    And no request reaches any Asana endpoint
