@frozen
Feature: skills

  The catalog contract every shipped skill meets: loadable by an agent runtime,
  followable to its own references, pinned in the commands it prescribes, listed in
  both published tables, and carried to the consumer by the packaging.

  The plugin root's SETUP.md is held to the same bar. It sits outside skills/, so the
  per-skill checks never see it, yet it is the first instruction file an agent reads
  after a plugin install and it hands off to the skills by link.

  # ── loading a skill ──

  Scenario: a skill whose declared name matches its directory is accepted
    Given a skill directory "asana-standup"
    And its SKILL.md front block declares the name "asana-standup"
    And its front block declares the description "Use this skill when the user wants a standup update from Asana."
    When the catalog contract is checked
    Then no violation is reported

  Scenario: a SKILL.md with no front block is rejected by skill name
    Given a skill directory "asana-standup"
    And its SKILL.md begins with the heading "# Asana Standup"
    When the catalog contract is checked
    Then a violation is reported for the rule "front-block"
    And that violation names the skill "asana-standup"

  Scenario: a skill whose declared name differs from its directory is rejected
    Given a skill directory "asana-standup"
    And its SKILL.md front block declares the name "standup"
    And its front block declares the description "Use this skill when the user wants a standup update from Asana."
    When the catalog contract is checked
    Then a violation is reported for the rule "name-matches-directory"
    And that violation names the skill "asana-standup"

  Scenario: a skill with no description is rejected by skill name
    Given a skill directory "asana-standup"
    And its SKILL.md front block declares the name "asana-standup" and no other field
    When the catalog contract is checked
    Then a violation is reported for the rule "description-present"
    And that violation names the skill "asana-standup"

  Scenario: a description that says when the skill applies is accepted
    Given a skill directory "asana-standup"
    And its SKILL.md front block declares the name "asana-standup"
    And its front block declares the description "Use this skill when the user wants a standup update from Asana."
    When the catalog contract is checked
    Then no violation is reported for the rule "description-trigger-language"

  Scenario: a description that never says when to use the skill is rejected
    Given a skill directory "asana-standup"
    And its SKILL.md front block declares the name "asana-standup"
    And its front block declares the description "A standup update built from recent Asana activity."
    When the catalog contract is checked
    Then a violation is reported for the rule "description-trigger-language"
    And that violation names the skill "asana-standup"

  Scenario: a description at the 120-character budget is accepted
    Given a skill directory "asana-standup"
    And its SKILL.md front block declares the name "asana-standup"
    And its front block declares a description of exactly 120 characters opening with "Use this skill when"
    When the catalog contract is checked
    Then no violation is reported for the rule "description-budget"

  Scenario: a description over the budget is rejected with its character count
    Given a skill directory "asana-standup"
    And its SKILL.md front block declares the name "asana-standup"
    And its front block declares a description of exactly 121 characters opening with "Use this skill when"
    When the catalog contract is checked
    Then a violation is reported for the rule "description-budget"
    And that violation reports the length 121

  # ── following a reference ──

  Scenario: a reference the skill ships is accepted
    Given a skill directory "asana"
    And its SKILL.md body names the reference "references/tidy-description-templates.md"
    And the file "references/tidy-description-templates.md" exists in that skill directory
    When the catalog contract is checked
    Then no violation is reported for the rule "reference-resolves"

  Scenario: a reference the skill names but does not ship is rejected by file name
    Given a skill directory "asana"
    And its SKILL.md body names the reference "references/tidy-description-templates.md"
    And that skill directory has no references directory
    When the catalog contract is checked
    Then a violation is reported for the rule "reference-resolves"
    And that violation names the file "references/tidy-description-templates.md"

  # ── running a prescribed command ──

  Scenario: an invocation pinned to a version is accepted
    Given a skill directory "asana-standup"
    And its SKILL.md body contains the command "npx cyber-asana@0.9.0 task list"
    When the catalog contract is checked
    Then no violation is reported for the rule "npx-pinned"

  Scenario: an unpinned invocation is rejected by file name
    Given a skill directory "asana-standup"
    And its SKILL.md body contains the command "npx cyber-asana task list"
    When the catalog contract is checked
    Then a violation is reported for the rule "npx-pinned"
    And that violation names the file "SKILL.md"

  Scenario: an unpinned invocation abbreviating --yes to -y is rejected
    Given a skill directory "asana-standup"
    And its SKILL.md contains the command "npx -y cyber-asana task list"
    When the catalog contract is checked
    Then a violation is reported for the rule "npx-pinned"
    And that violation names the file "SKILL.md"

  Scenario: an unpinned invocation inside a reference file is rejected by file name
    Given a skill directory "asana"
    And the file "references/tidy-description-templates.md" in that skill directory contains the command "npx --yes cyber-asana task list"
    When the catalog contract is checked
    Then a violation is reported for the rule "npx-pinned"
    And that violation names the file "references/tidy-description-templates.md"

  # ── discovering the catalog ──

  Scenario: a skill listed in both published tables is accepted
    Given a skill directory "asana-standup"
    And the readme names "asana-standup"
    And the docs site skills index names "asana-standup"
    When the catalog contract is checked
    Then no violation is reported for the rule "docs-listing"

  Scenario: a skill missing from the readme table is rejected naming the readme
    Given a skill directory "asana-standup"
    And the readme names no skill
    And the docs site skills index names "asana-standup"
    When the catalog contract is checked
    Then a violation is reported for the rule "docs-listing"
    And that violation names the file "readme.md"

  Scenario: a skill missing from the docs site index is rejected naming that page
    Given a skill directory "asana-standup"
    And the readme names "asana-standup"
    And the docs site skills index names no skill
    When the catalog contract is checked
    Then a violation is reported for the rule "docs-listing"
    And that violation names the file "apps/web/src/content/docs/skills/index.md"

  # ── finishing a plugin install ──

  Scenario: a SETUP.md at the plugin root is accepted
    Given a SETUP.md at the plugin root
    When the catalog contract is checked
    Then no violation is reported for the rule "setup-present"

  Scenario: a plugin root with no SETUP.md is rejected naming the file
    Given a plugin root that ships no SETUP.md
    When the catalog contract is checked
    Then a violation is reported for the rule "setup-present"
    And that violation names the file "SETUP.md"

  Scenario: a handoff SETUP.md links to a shipped skill is accepted
    Given a skill directory "asana-standup"
    And a SETUP.md linking to "./skills/asana-standup/SKILL.md"
    When the catalog contract is checked
    Then no violation is reported for the rule "setup-link-resolves"

  Scenario: a handoff SETUP.md links to but does not ship is rejected by target
    Given a SETUP.md linking to "./skills/init-asana/SKILL.md"
    And no skill directory "init-asana"
    When the catalog contract is checked
    Then a violation is reported for the rule "setup-link-resolves"
    And that violation names the file "./skills/init-asana/SKILL.md"

  Scenario: an absolute link out of SETUP.md is left alone
    Given a SETUP.md linking to "https://app.asana.com/"
    When the catalog contract is checked
    Then no violation is reported for the rule "setup-link-resolves"

  Scenario: an unpinned invocation in SETUP.md is rejected naming SETUP.md
    Given a SETUP.md containing the command "npx cyber-asana workspace list"
    When the catalog contract is checked
    Then a violation is reported for the rule "npx-pinned"
    And that violation names the file "SETUP.md"

  Scenario: a SETUP.md on the publish allowlist is accepted
    Given a package manifest whose files list is "dist" and "skills" and "SETUP.md"
    When the catalog contract is checked
    Then no violation is reported for the rule "setup-allowlist"

  Scenario: a SETUP.md absent from the publish allowlist is rejected naming the manifest
    Given a package manifest whose files list is "dist" and "skills"
    When the catalog contract is checked
    Then a violation is reported for the rule "setup-allowlist"
    And that violation names the file "package.json"

  # ── publishing the catalog ──

  Scenario: a skills directory on the publish allowlist is accepted
    Given a package manifest whose files list is "dist" and "skills"
    When the catalog contract is checked
    Then no violation is reported for the rule "publish-allowlist"

  Scenario: a skills directory absent from the publish allowlist is rejected
    Given a package manifest whose files list is "dist"
    When the catalog contract is checked
    Then a violation is reported for the rule "publish-allowlist"

  Scenario: a plugin manifest pointing at the shipped directory is accepted
    Given a plugin manifest whose skills field is "./skills/"
    When the catalog contract is checked
    Then no violation is reported for the rule "manifest-skills-pointer"

  Scenario: a plugin manifest pointing away from the shipped directory is rejected
    Given a plugin manifest whose skills field is "./agent-skills/"
    When the catalog contract is checked
    Then a violation is reported for the rule "manifest-skills-pointer"
    And that violation names the file "plugin.json"
