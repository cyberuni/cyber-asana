import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { readSubsetSkill, skillsRoot } from './html-subset.js'

describe('the tag subset', () => {
	// The tags live in the asana-html rule table (src/asana-html/surfaces.ts), where the CLI and MCP
	// read them; the reference sends the agent there instead of carrying its own copy.
	it('sends the agent to the rule table instead of listing tags', () => {
		const content = readSubsetSkill()
		expect(content).toContain('cyber-asana html rules --surface task-notes')
		expect(content).not.toContain('**Supported**')
	})

	it('checks and fixes the body before writing it back', () => {
		const content = readSubsetSkill()
		expect(content).toContain('cyber-asana html fix')
		expect(content).toContain('cyber-asana html check')
	})
})

describe('pitfalls that do not surface as "XML is invalid"', () => {
	it('documents each distinct API error string', () => {
		const content = readSubsetSkill()
		const errors = [
			'Rich text should be wrapped in <body> tag.',
			'Found < or > that was not part of tag.',
			'XML tag was not closed.',
			'One of data-asana-gid or href is required in anchor attributes',
			'invalid protocol in HREF field',
		]
		for (const message of errors) {
			expect(content, `skill no longer explains: ${message}`).toContain(message)
		}
	})

	it('warns that <pre><code> nested together fails', () => {
		expect(readSubsetSkill()).toContain('<pre><code>')
	})

	it('requires escaping < and > inside code and pre', () => {
		const content = readSubsetSkill()
		expect(content).toMatch(/&lt;/)
		expect(content).toMatch(/do \*\*not\*\* suppress parsing/)
	})

	it('records that a rejected update writes nothing', () => {
		expect(readSubsetSkill()).toMatch(/rejected update writes nothing/i)
	})
})

describe('default behavior', () => {
	// Per the follow-up on #159: the default pass must stay a light copy-edit.
	it('states that the default is a copy-edit, not a rewrite', () => {
		expect(readSubsetSkill()).toMatch(/default is a copy-edit, not a rewrite/i)
	})

	it('lists emoji and tone rewriting as things not done by default', () => {
		const content = readSubsetSkill()
		const doNot = content.slice(content.indexOf('Do **not**, unless asked:'), content.indexOf('### 3.'))
		expect(doNot).toMatch(/Add emoji/i)
		expect(doNot).toMatch(/Rewrite for tone/i)
		expect(doNot).toMatch(/Add, remove, or reorder sections/i)
	})
})

describe('reading the description', () => {
	it('directs the agent to html_notes and away from the notes projection', () => {
		const content = readSubsetSkill()
		expect(content).toMatch(/Always edit from `html_notes`/)
		expect(content).toMatch(/no case where you need the plain-text `notes` projection/)
	})
})

describe('where the procedure lives', () => {
	it('is a reference of the asana skill, routed to as "Tidy a description"', () => {
		const router = readFileSync(path.join(skillsRoot, 'asana', 'SKILL.md'), 'utf8')
		expect(router).toMatch(/## Tidy a description/)
		expect(router).toContain('`references/tidy-description.md`')
		expect(existsSync(path.join(skillsRoot, 'improve-description'))).toBe(false)
	})

	it('is reached explicitly by the /cyber-asana:tidy-description command', () => {
		const command = readFileSync(path.join(skillsRoot, '..', 'commands', 'tidy-description.md'), 'utf8')
		expect(command).toMatch(/\*\*Tidy a description\*\* route/)
		expect(command).toContain('references/tidy-description.md')
	})
})

describe('other skills that write rich text', () => {
	it('create-task fixes --html-notes for task notes', () => {
		const content = readFileSync(path.join(skillsRoot, 'asana', 'references', 'create-task.md'), 'utf8')
		expect(content).toContain('cyber-asana html fix')
	})

	it('the dashboard reference names the status-update rules', () => {
		const content = readFileSync(path.join(skillsRoot, '..', 'references', 'cyber-asana.dashboard.md'), 'utf8')
		expect(content).toContain('cyber-asana html rules --surface status-update')
	})
})
