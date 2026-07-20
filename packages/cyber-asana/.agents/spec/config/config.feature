@frozen
Feature: config

  Where a cyber-asana value comes from: the committed project registry
  .agents/cyber-asana.json, the verbs that maintain it, and the fixed order in which
  an explicit input, then each environment alias, is tried.

  # ── locating the config file ──

  Scenario: an explicit --config path wins over the CYBER_ASANA_CONFIG variable
    Given a file "/work/harbour/flagged.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Rollout"
    And a file "/work/harbour/ambient.json" holding schema_version 1 and the project "7702219900202" named "Quartz Bulkhead"
    And CYBER_ASANA_CONFIG is set to "/work/harbour/ambient.json"
    When config show runs with --config "/work/harbour/flagged.json"
    Then stdout contains "7702219900101"
    And stdout does not contain "7702219900202"

  Scenario: CYBER_ASANA_CONFIG wins over the config file committed in the repo
    Given a git repository at "/work/harbour" whose .agents/cyber-asana.json holds the project "7702219900202" named "Quartz Bulkhead"
    And a file "/work/harbour/ambient.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Rollout"
    And CYBER_ASANA_CONFIG is set to "/work/harbour/ambient.json"
    And the working directory is "/work/harbour"
    When config show runs with no --config option
    Then stdout contains "7702219900101"
    And stdout does not contain "7702219900202"

  Scenario: with no override the search walks up from the current directory
    Given a git repository at "/work/harbour" whose .agents/cyber-asana.json holds the project "7702219900202" named "Quartz Bulkhead"
    And a directory "/work/harbour/packages/dinghy" that contains no .agents directory
    And CYBER_ASANA_CONFIG is absent from the environment
    And the working directory is "/work/harbour/packages/dinghy"
    When config path runs with no --config option
    Then stdout is "/work/harbour/.agents/cyber-asana.json"

  Scenario: the upward search stops at the git root
    Given a directory "/work" whose .agents/cyber-asana.json holds the project "7702219900303" named "Marmalade Signal"
    And a git repository at "/work/harbour" that contains no .agents directory
    And CYBER_ASANA_CONFIG is absent from the environment
    And the working directory is "/work/harbour"
    When config path runs with no --config option
    Then stdout is an empty line
    And stdout does not contain "7702219900303"

  Scenario: a relative override is resolved against the current directory
    Given a file "/work/harbour/nested/beside.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Rollout"
    And the working directory is "/work/harbour/nested"
    When config path runs with --config "beside.json"
    Then stdout is "/work/harbour/nested/beside.json"

  Scenario: path prints an override that names a file which does not exist
    Given CYBER_ASANA_CONFIG is set to "/work/harbour/absent.json"
    And no file exists at "/work/harbour/absent.json"
    When config path runs with no --config option
    Then stdout is "/work/harbour/absent.json"
    And the process exits with status 0

  Scenario: path prints an empty line when no config file is found
    Given a git repository at "/work/harbour" that contains no .agents directory
    And CYBER_ASANA_CONFIG is absent from the environment
    And the working directory is "/work/harbour"
    When config path runs with no --config option
    Then stdout is an empty line
    And the process exits with status 0

  # ── reading the registry ──

  Scenario: show prints the config path and a row per registered project
    Given a file "/work/harbour/registry.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Rollout"
    And that file also holds the project "7702219900202" named "Quartz Bulkhead"
    When config show runs in text mode with --config "/work/harbour/registry.json"
    Then stdout contains the line "/work/harbour/registry.json"
    And stdout pairs "7702219900101" with "Lanternfish Rollout" on one line
    And stdout pairs "7702219900202" with "Quartz Bulkhead" on one line

  Scenario: list prints the same rows as show
    Given a file "/work/harbour/registry.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Rollout"
    And that file also holds the project "7702219900202" named "Quartz Bulkhead"
    When config list runs in text mode with --config "/work/harbour/registry.json"
    Then stdout is identical to the stdout of config show with the same options

  Scenario: show without a config file anywhere is an error
    Given a git repository at "/work/harbour" that contains no .agents directory
    And CYBER_ASANA_CONFIG is absent from the environment
    And the working directory is "/work/harbour"
    When config show runs with no --config option
    Then the command fails with the message "Repo config not found"

  Scenario: resolve-project matches a registered name ignoring case and surrounding spaces
    Given a file "/work/harbour/registry.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Rollout"
    When config resolve-project runs with the argument "  lanternfish rollout  " and --config "/work/harbour/registry.json"
    Then stdout contains "7702219900101"
    And stdout contains "Lanternfish Rollout"

  Scenario: resolve-project reaches no Asana endpoint
    Given a file "/work/harbour/registry.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Rollout"
    And an Asana API that answers every request with the project "7702219900101" named "Renamed In Asana"
    When config resolve-project runs with the argument "Lanternfish Rollout" and --config "/work/harbour/registry.json"
    Then no request reaches any Asana API endpoint
    And stdout contains "Lanternfish Rollout"

  Scenario: resolve-project reports a name that is not registered
    Given a file "/work/harbour/registry.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Rollout"
    When config resolve-project runs with the argument "Quartz Bulkhead" and --config "/work/harbour/registry.json"
    Then the command fails with the message "Project not found in repo config: Quartz Bulkhead"

  Scenario: a config file declaring schema_version 2 is rejected
    Given a file "/work/harbour/registry.json" holding schema_version 2 and the project "7702219900101" named "Lanternfish Rollout"
    When config show runs with --config "/work/harbour/registry.json"
    Then the command fails with a message containing "schema_version"

  Scenario: a project entry without a name is rejected
    Given a file "/work/harbour/registry.json" holding schema_version 1 and one project entry whose only key is the gid "7702219900101"
    When config show runs with --config "/work/harbour/registry.json"
    Then the command fails with a message containing "projects[0].name"

  Scenario: show omits a workspace GID found in the config file
    Given a file "/work/harbour/registry.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Rollout"
    And that file also holds a top-level key "workspace_gid" with the value "5500330011122"
    When config show runs in JSON mode with --config "/work/harbour/registry.json"
    Then stdout contains "7702219900101"
    And stdout does not contain "5500330011122"
    And stdout does not contain "workspace_gid"

  # ── writing the registry ──

  Scenario: add appends a project whose name comes from Asana
    Given a file "/work/harbour/registry.json" holding schema_version 1 and an empty projects list
    And an Asana API that answers a fetch of project "7702219900101" with the name "Lanternfish Rollout"
    When config add runs with the argument "7702219900101" and --config "/work/harbour/registry.json"
    Then the file "/work/harbour/registry.json" holds exactly one project entry
    And that entry has the gid "7702219900101" and the name "Lanternfish Rollout"

  Scenario: add replaces the entry when the GID is already registered
    Given a file "/work/harbour/registry.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Pilot"
    And an Asana API that answers a fetch of project "7702219900101" with the name "Lanternfish Rollout"
    When config add runs with the argument "7702219900101" and --config "/work/harbour/registry.json"
    Then the file "/work/harbour/registry.json" holds exactly one project entry
    And that entry has the gid "7702219900101" and the name "Lanternfish Rollout"

  Scenario: add creates the config file at the git root when none exists
    Given a git repository at "/work/harbour" that contains no .agents directory
    And CYBER_ASANA_CONFIG is absent from the environment
    And the working directory is "/work/harbour"
    And an Asana API that answers a fetch of project "7702219900101" with the name "Lanternfish Rollout"
    When config add runs with the argument "7702219900101" and no --config option
    Then the file "/work/harbour/.agents/cyber-asana.json" holds schema_version 1
    And that file holds the project "7702219900101" named "Lanternfish Rollout"

  Scenario: add writes at the git root even when a nearer config file was read
    Given a git repository at "/work/harbour" that contains no .agents directory
    And a directory "/work/harbour/packages/dinghy" whose .agents/cyber-asana.json holds the project "7702219900202" named "Quartz Bulkhead"
    And CYBER_ASANA_CONFIG is absent from the environment
    And the working directory is "/work/harbour/packages/dinghy"
    And an Asana API that answers a fetch of project "7702219900101" with the name "Lanternfish Rollout"
    When config add runs with the argument "7702219900101" and no --config option
    Then the file "/work/harbour/.agents/cyber-asana.json" holds the project "7702219900101" named "Lanternfish Rollout"
    And the file "/work/harbour/packages/dinghy/.agents/cyber-asana.json" holds exactly one project entry
    And that nested file still holds the project "7702219900202" named "Quartz Bulkhead"

  Scenario: add leaves the file untouched when the Asana response carries no name
    Given a file "/work/harbour/registry.json" holding schema_version 1 and the project "7702219900202" named "Quartz Bulkhead"
    And an Asana API that answers a fetch of project "7702219900101" with a record whose only key is the gid
    When config add runs with the argument "7702219900101" and --config "/work/harbour/registry.json"
    Then the command fails with the message "Project response is missing name"
    And the file "/work/harbour/registry.json" holds exactly one project entry
    And that entry has the gid "7702219900202" and the name "Quartz Bulkhead"

  Scenario: add writes no workspace GID even when the workspace variable is set
    Given a file "/work/harbour/registry.json" holding schema_version 1 and an empty projects list
    And ASANA_WORKSPACE is set to "5500330011122"
    And an Asana API that answers a fetch of project "7702219900101" with the name "Lanternfish Rollout"
    When config add runs with the argument "7702219900101" and --config "/work/harbour/registry.json"
    Then the file "/work/harbour/registry.json" contains no text "5500330011122"
    And the top-level keys of that file are exactly "schema_version" and "projects"
    And each entry in its projects list has exactly the keys "gid" and "name"

  Scenario: add drops a workspace GID that was already in the file
    Given a file "/work/harbour/registry.json" holding schema_version 1 and the project "7702219900202" named "Quartz Bulkhead"
    And that file also holds a top-level key "workspace_gid" with the value "5500330011122"
    And an Asana API that answers a fetch of project "7702219900101" with the name "Lanternfish Rollout"
    When config add runs with the argument "7702219900101" and --config "/work/harbour/registry.json"
    Then the file "/work/harbour/registry.json" contains no text "workspace_gid"
    And that file holds the project "7702219900101" named "Lanternfish Rollout"

  Scenario: remove deletes the entry whose GID matches a digits-only argument
    Given a file "/work/harbour/registry.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Rollout"
    And that file also holds the project "7702219900202" named "Quartz Bulkhead"
    When config remove runs with the argument "7702219900101" and --config "/work/harbour/registry.json"
    Then the file "/work/harbour/registry.json" holds exactly one project entry
    And that entry has the gid "7702219900202" and the name "Quartz Bulkhead"

  Scenario: remove deletes the entry whose name matches, ignoring case
    Given a file "/work/harbour/registry.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Rollout"
    And that file also holds the project "7702219900202" named "Quartz Bulkhead"
    When config remove runs with the argument "lanternfish rollout" and --config "/work/harbour/registry.json"
    Then the file "/work/harbour/registry.json" holds exactly one project entry
    And that entry has the gid "7702219900202" and the name "Quartz Bulkhead"

  Scenario: remove reports an argument that matches no entry
    Given a file "/work/harbour/registry.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Rollout"
    When config remove runs with the argument "Marmalade Signal" and --config "/work/harbour/registry.json"
    Then the command fails with the message "Project not found in repo config: Marmalade Signal"
    And the file "/work/harbour/registry.json" holds exactly one project entry

  Scenario: sync rewrites the names that differ from Asana
    Given a file "/work/harbour/registry.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Pilot"
    And an Asana API that answers a fetch of project "7702219900101" with the name "Lanternfish Rollout"
    When config sync runs with --config "/work/harbour/registry.json"
    Then the file "/work/harbour/registry.json" holds the project "7702219900101" named "Lanternfish Rollout"
    And stdout contains "1 name(s) updated"

  Scenario: sync leaves the file byte-identical when every name already matches
    Given a file "/work/harbour/registry.json" holding schema_version 1 and the project "7702219900101" named "Lanternfish Rollout"
    And that file also holds the project "7702219900202" named "Quartz Bulkhead"
    And an Asana API that answers each fetch with the name already recorded for that gid
    When config sync runs with --config "/work/harbour/registry.json"
    Then the bytes of "/work/harbour/registry.json" are unchanged
    And stdout contains "0 name(s) updated"

  Scenario: sync without a config file anywhere is an error
    Given an empty directory "/scratch/loose"
    And "/scratch/loose" sits outside any git working tree
    And CYBER_ASANA_CONFIG is absent from the environment
    And the working directory is "/scratch/loose"
    When config sync runs with no --config option
    Then the command fails with the message "Repo config not found"

  Scenario: a project fetched by another command refreshes its registered name
    Given a git repository at "/work/harbour" whose .agents/cyber-asana.json holds the project "7702219900101" named "Lanternfish Pilot"
    And the working directory is "/work/harbour"
    And an Asana API that answers a fetch of project "7702219900101" with the name "Lanternfish Rollout"
    When project get runs with the argument "7702219900101"
    Then the file "/work/harbour/.agents/cyber-asana.json" holds the project "7702219900101" named "Lanternfish Rollout"

  Scenario: a project fetched by another command leaves an unregistered GID alone
    Given a git repository at "/work/harbour" whose .agents/cyber-asana.json holds the project "7702219900101" named "Lanternfish Rollout"
    And the working directory is "/work/harbour"
    And an Asana API that answers a fetch of project "7702219900303" with the name "Marmalade Signal"
    When project get runs with the argument "7702219900303"
    Then the file "/work/harbour/.agents/cyber-asana.json" holds exactly one project entry
    And that entry has the gid "7702219900101" and the name "Lanternfish Rollout"

  # ── resolving a configured value ──

  Scenario: the token flag wins over the token environment variables
    Given ASANA_ACCESS_TOKEN is set to "pat-tidewater-4402"
    And a workspace-scoped command invoked with --token "pat-halyard-9001"
    When that command reaches Asana
    Then the outgoing request carries the bearer token "pat-halyard-9001"

  Scenario: ASANA_ACCESS_TOKEN wins over ASANA_TOKEN
    Given ASANA_ACCESS_TOKEN is set to "pat-tidewater-4402"
    And ASANA_TOKEN is set to "pat-driftwood-7715"
    And a workspace-scoped command invoked with no --token option
    When that command reaches Asana
    Then the outgoing request carries the bearer token "pat-tidewater-4402"

  Scenario: an empty ASANA_ACCESS_TOKEN falls through to ASANA_TOKEN
    Given ASANA_ACCESS_TOKEN is set to the empty string
    And ASANA_TOKEN is set to "pat-driftwood-7715"
    And a workspace-scoped command invoked with no --token option
    When that command reaches Asana
    Then the outgoing request carries the bearer token "pat-driftwood-7715"

  Scenario: no token anywhere is an error naming the environment variable
    Given ASANA_ACCESS_TOKEN is absent from the environment
    And ASANA_TOKEN is absent from the environment
    And a workspace-scoped command invoked with no --token option
    When that command tries to reach Asana
    Then the command fails with a message containing "ASANA_TOKEN environment variable is not set"

  Scenario: ASANA_WORKSPACE_GID wins over ASANA_WORKSPACE
    Given ASANA_WORKSPACE_GID is set to "5500330011122"
    And ASANA_WORKSPACE is set to "5500330099988"
    When project list runs with no workspace option
    Then the outgoing request is scoped to workspace "5500330011122"

  Scenario: an explicit workspace flag wins over the workspace environment variables
    Given ASANA_WORKSPACE_GID is set to "5500330099988"
    When project list runs with --workspace-gid "5500330011122"
    Then the outgoing request is scoped to workspace "5500330011122"

  Scenario: the repo config supplies no workspace GID to a workspace-scoped command
    Given a git repository at "/work/harbour" whose .agents/cyber-asana.json holds the project "7702219900101" named "Lanternfish Rollout"
    And the working directory is "/work/harbour"
    And ASANA_WORKSPACE_GID is absent from the environment
    And ASANA_WORKSPACE is absent from the environment
    When project list runs with no workspace option
    Then the command fails with a message containing "Workspace GID is required"
    And no request reaches any Asana API endpoint

  Scenario: no MCP tool is registered for the repo config
    Given an MCP server with every cyber-asana tool registered
    When the server lists its tools
    Then no listed tool name starts with "asana_config"
    And no listed tool description mentions ".agents/cyber-asana.json"
