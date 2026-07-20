@frozen
Feature: stories

  Reading an Asana task's comment thread and appending a comment to it, over the
  CLI and MCP surfaces that share one api.ts, each exposed under both a story and
  a comment name.

  # ── task scoping (shared by list and create) ──

  Scenario: list reads the stories of the task GID it was given
    Given a task named "Repave the koi pond" with GID "8801"
    And a story on that task whose text is "Gravel arrives Tuesday"
    When the story list entry point runs with the task GID "8801"
    Then the request reaching the Asana stories endpoint names the task GID "8801"
    And the output contains "Gravel arrives Tuesday"

  Scenario: an entry point without a task GID is a usage error
    Given a task named "Repave the koi pond" with GID "8801"
    When the story list entry point runs with no task GID argument
    Then the process exits with a non-zero status
    And stderr states that a Task GID is required

  Scenario: the create entry point without a task GID is a usage error
    Given a task named "Repave the koi pond" with GID "8801"
    When the story create entry point runs with the text "Gravel arrives Tuesday" and no task GID argument
    Then the process exits with a non-zero status
    And stderr states that a Task GID is required
    And no request reaches the Asana stories endpoint

  Scenario: an entry point does not default the task GID from the environment
    Given the ASANA_WORKSPACE environment variable is set to "8801"
    When the story list entry point runs with no task GID argument
    Then the process exits with a non-zero status
    And no request reaches the Asana stories endpoint

  # ── story list / asana_story_list ──

  Scenario: list renders each story's id, type, author and text in text mode
    Given a task with GID "8801"
    And a story on that task with GID "5501", type "comment", author "Devon Ashgrove" and text "Gravel arrives Tuesday"
    And a story on that task with GID "5502", type "system", author "Marisol Quint" and text "changed the due date"
    When the story list entry point runs in text mode with the task GID "8801"
    Then stdout puts "5501", "comment", "Devon Ashgrove" and "Gravel arrives Tuesday" on one row
    And stdout puts "5502", "system", "Marisol Quint" and "changed the due date" on one row

  Scenario: list cuts a long story's text at sixty characters in the table
    Given a task with GID "8801"
    And a story on that task whose text is the letter "g" repeated sixty times followed by "-overflow"
    When the story list entry point runs in text mode with the task GID "8801"
    Then stdout contains the run of sixty "g" characters
    And stdout does not contain "-overflow"

  # ── story create / asana_story_create ──

  Scenario: create posts the positional text as a comment on the task
    Given a task with GID "8801"
    When the story create entry point runs with the task GID "8801" and the text "Gravel arrives Tuesday"
    Then the request reaching the Asana stories endpoint carries the text field "Gravel arrives Tuesday"
    And that request carries no html_text field

  Scenario: create posts html_text unchanged when the rich-text flag is given
    Given a task with GID "8801"
    When the story create entry point runs with the task GID "8801" and the rich text "<body><strong>Gravel arrives Tuesday</strong></body>"
    Then the request reaching the Asana stories endpoint carries the html_text field "<body><strong>Gravel arrives Tuesday</strong></body>"
    And that request carries no text field

  Scenario: create rejects html_text that has no body root
    Given a task with GID "8801"
    When the story create entry point runs with the task GID "8801" and the rich text "<strong>Gravel arrives Tuesday</strong>"
    Then the process exits with a non-zero status
    And no request reaches the Asana stories endpoint
    And stderr states that html_text must be wrapped in a single body root element

  Scenario: create rejects html_text whose tags are unbalanced
    Given a task with GID "8801"
    When the story create entry point runs with the task GID "8801" and the rich text "<body><strong>Gravel arrives Tuesday</body>"
    Then the process exits with a non-zero status
    And no request reaches the Asana stories endpoint
    And stderr states that html_text has unbalanced closing tags

  Scenario: create accepts html_text with self-closing and attributed tags
    Given a task with GID "8801"
    When the story create entry point runs with the task GID "8801" and the rich text "<body><div class=\"note\">Gravel<br />arrives Tuesday</div></body>"
    Then the request reaching the Asana stories endpoint carries the html_text field "<body><div class=\"note\">Gravel<br />arrives Tuesday</div></body>"

  Scenario: create with both text and html_text is a usage error
    Given a task with GID "8801"
    When the story create entry point runs with the task GID "8801", the text "Gravel arrives Tuesday" and the rich text "<body>Gravel arrives Tuesday</body>"
    Then the process exits with a non-zero status
    And stderr states that text and html-text are mutually exclusive
    And no request reaches the Asana stories endpoint

  Scenario: create with neither text nor html_text is a usage error
    Given a task with GID "8801"
    When the story create entry point runs with the task GID "8801" as its only input
    Then the process exits with a non-zero status
    And stderr states that either text or html-text must be provided
    And no request reaches the Asana stories endpoint

  Scenario: create substitutes task fields into the text under the template flag
    Given a task with GID "8801" named "Repave the koi pond"
    And that task is assigned to "Marisol Quint"
    And that task is due on "2026-09-14"
    When the story create entry point runs with the task GID "8801", the template flag, and the text "{task.assignee}: {task.name} is due {task.due_on}"
    Then the request reaching the Asana stories endpoint carries the text field "Marisol Quint: Repave the koi pond is due 2026-09-14"

  Scenario: create substitutes task fields into html_text under the template flag
    Given a task with GID "8801" named "Repave the koi pond"
    And that task is assigned to "Marisol Quint"
    When the story create entry point runs with the task GID "8801", the template flag, and the rich text "<body><strong>{task.name}</strong> for {task.assignee}</body>"
    Then the request reaching the Asana stories endpoint carries the html_text field "<body><strong>Repave the koi pond</strong> for Marisol Quint</body>"

  Scenario: create substitutes every occurrence of a repeated placeholder
    Given a task with GID "8801" named "Repave the koi pond"
    When the story create entry point runs with the task GID "8801", the template flag, and the text "{task.name} then {task.name}"
    Then the request reaching the Asana stories endpoint carries the text field "Repave the koi pond then Repave the koi pond"

  Scenario: create substitutes an empty string for a task field that is unset
    Given a task with GID "8801" named "Repave the koi pond"
    And that task has an assignee value of null
    When the story create entry point runs with the task GID "8801", the template flag, and the text "owner=[{task.assignee}]"
    Then the request reaching the Asana stories endpoint carries the text field "owner=[]"

  Scenario: create leaves placeholder syntax untouched without the template flag
    Given a task with GID "8801" named "Repave the koi pond"
    When the story create entry point runs with the task GID "8801" and the text "write {task.name} to substitute the title"
    Then the request reaching the Asana stories endpoint carries the text field "write {task.name} to substitute the title"
    And no request reaches the Asana single-task endpoint

  Scenario: create adds rich-text guidance to an Asana rejection that names html_text
    Given a task with GID "8801"
    And the Asana stories endpoint answers the create call with the error "html_text: malformed rich text payload"
    When the story create entry point runs with the task GID "8801" and the rich text "<body><em>Gravel arrives Tuesday</em></body>"
    Then the process exits with a non-zero status
    And stderr states that the payload must be wrapped in a single body element with balanced tags

  Scenario: create passes through an Asana rejection that does not name html_text
    Given a task with GID "8801"
    And the Asana stories endpoint answers the create call with the error "Not Found: task 8801"
    When the story create entry point runs with the task GID "8801" and the text "Gravel arrives Tuesday"
    Then the process exits with a non-zero status
    And stderr contains "Not Found: task 8801"
    And stderr contains no guidance about wrapping the payload in a body element

  Scenario: create renders the new story's fields in text mode
    Given a task with GID "8801"
    And the Asana stories endpoint answers the create call with a story with GID "5503", type "comment", author "Devon Ashgrove", timestamp "2026-09-01T09:30:00.000Z" and text "Gravel arrives Tuesday"
    When the story create entry point runs in text mode with the task GID "8801" and the text "Gravel arrives Tuesday"
    Then stdout contains "5503"
    And stdout contains "comment"
    And stdout contains "Devon Ashgrove"
    And stdout contains "2026-09-01T09:30:00.000Z"
    And stdout contains "Gravel arrives Tuesday"

  # ── comment aliases ──

  Scenario: the comment command group exposes the same list and create subcommands as story
    Given the built CLI program
    When the help text for the comment command group is rendered
    Then the subcommands it lists include "list"
    And the subcommands it lists include "create"

  Scenario: the MCP server registers list and create tools under both the story and comment names
    Given the built MCP server
    When its registered tool names are read
    Then those names include "asana_story_list" and "asana_story_create"
    And those names include "asana_comment_list" and "asana_comment_create"

  Scenario: a comment posted through the comment alias reaches the same stories endpoint
    Given a task with GID "8801"
    When the comment create entry point runs with the task GID "8801" and the text "Gravel arrives Tuesday"
    Then the request reaching the Asana stories endpoint names the task GID "8801"
    And that request carries the text field "Gravel arrives Tuesday"
