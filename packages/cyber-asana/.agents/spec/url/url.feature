Feature: url

  Reading an Asana app URL into a kind plus the GIDs in its path, over the exported
  parser, the CLI verb, and the MCP tool that all share one grammar and touch no network.

  # ── parseAsanaUrl — the grammar ──

  Scenario: a project list-view URL yields the workspace, project, and list-view GIDs
    Given the input string "https://app.asana.com/1/8801234500011/project/8801234500022/list/8801234500044"
    When the URL is parsed
    Then the result kind is "project_list"
    And the result workspace GID is "8801234500011"
    And the result project GID is "8801234500022"
    And the result list-view GID is "8801234500044"
    And the result task GID is empty

  Scenario: a project task URL yields the task GID and leaves the list-view GID empty
    Given the input string "https://app.asana.com/1/8801234500011/project/8801234500022/task/8801234500033"
    When the URL is parsed
    Then the result kind is "project_task"
    And the result workspace GID is "8801234500011"
    And the result project GID is "8801234500022"
    And the result task GID is "8801234500033"
    And the result list-view GID is empty

  Scenario: a project URL yields only the workspace and project GIDs
    Given the input string "https://app.asana.com/1/8801234500011/project/8801234500022"
    When the URL is parsed
    Then the result kind is "project"
    And the result workspace GID is "8801234500011"
    And the result project GID is "8801234500022"
    And the result task GID is empty
    And the result list-view GID is empty

  Scenario: a legacy task URL yields the workspace and task GIDs and no project GID
    Given the input string "https://app.asana.com/0/8801234500011/8801234500033"
    When the URL is parsed
    Then the result kind is "legacy_task"
    And the result workspace GID is "8801234500011"
    And the result task GID is "8801234500033"
    And the result project GID is empty
    And the result list-view GID is empty

  Scenario: a portfolio URL is reported as unknown with every GID empty
    Given the input string "https://app.asana.com/1/8801234500011/portfolio/8801234500055"
    When the URL is parsed
    Then the result kind is "unknown"
    And the result workspace GID is empty
    And the result project GID is empty
    And the result task GID is empty
    And the result list-view GID is empty

  Scenario: a task URL with an extra trailing segment is reported as unknown
    Given the input string "https://app.asana.com/1/8801234500011/project/8801234500022/task/8801234500033/subtasks"
    When the URL is parsed
    Then the result kind is "unknown"
    And the result project GID is empty
    And the result task GID is empty

  Scenario: a scheme-less Asana path is reported as unknown
    Given the input string "app.asana.com/0/8801234500011/8801234500033"
    When the URL is parsed
    Then the result kind is "unknown"
    And the result workspace GID is empty
    And the result task GID is empty
    And the result url field is "app.asana.com/0/8801234500011/8801234500033"

  Scenario: a trailing slash does not change the parse
    Given the input string "https://app.asana.com/1/8801234500011/project/8801234500022/"
    When the URL is parsed
    Then the result kind is "project"
    And the result project GID is "8801234500022"

  Scenario: a query string and a fragment are ignored
    Given the input string "https://app.asana.com/1/8801234500011/project/8801234500022/list/8801234500044?focus=true#comment"
    When the URL is parsed
    Then the result kind is "project_list"
    And the result project GID is "8801234500022"
    And the result list-view GID is "8801234500044"

  Scenario: surrounding whitespace is trimmed before parsing
    Given the input string "  https://app.asana.com/1/8801234500011/project/8801234500022  "
    When the URL is parsed
    Then the result kind is "project"
    And the result project GID is "8801234500022"
    And the result url field is "https://app.asana.com/1/8801234500011/project/8801234500022"

  Scenario: a blank URL string is rejected
    Given the input string "   "
    When the URL is parsed
    Then parsing raises an error whose message is "URL is required"

  Scenario: the host is not required to be app.asana.com
    Given the input string "https://asana.example.net/1/8801234500011/project/8801234500022"
    When the URL is parsed
    Then the result kind is "project"
    And the result workspace GID is "8801234500011"
    And the result project GID is "8801234500022"

  # ── url parse (CLI) ──

  Scenario: parse prints the kind and the populated GID fields in text mode
    Given the URL argument "https://app.asana.com/1/8801234500011/project/8801234500022/task/8801234500033"
    When the url parse entry point runs in text mode
    Then stdout pairs the label "Kind" with "project_task"
    And stdout pairs the label "Workspace GID" with "8801234500011"
    And stdout pairs the label "Project GID" with "8801234500022"
    And stdout pairs the label "Task GID" with "8801234500033"
    And stdout contains no line labelled "List view GID"

  Scenario: parse succeeds with no Asana token set and reaches no network
    Given the ASANA_TOKEN environment variable is unset
    And the URL argument "https://app.asana.com/1/8801234500011/project/8801234500022"
    When the url parse entry point runs
    Then the process exits with status 0
    And stdout contains "8801234500022"
    And no request reaches any Asana API endpoint

  # ── asana_url_parse (MCP) ──

  Scenario: asana_url_parse returns the parse result as JSON text
    Given the url tool parameter "https://app.asana.com/1/8801234500011/project/8801234500022/list/8801234500044"
    When the asana_url_parse tool handler runs
    Then the returned text parses as JSON whose kind is "project_list"
    And that JSON has the project GID "8801234500022"
    And that JSON has the list-view GID "8801234500044"
