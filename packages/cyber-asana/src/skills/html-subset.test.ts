import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDocumentedSubset, readSubsetSkill, skillsRoot } from './html-subset.js'

// Verified against the live Asana API (PUT /tasks/{gid}), 2026-08. Issue #159 reported
// several of these backwards, so the claims are pinned rather than trusted. When Asana
// changes the subset out of band, `pnpm test:system` is what detects it — see
// html-subset.system.ts. Update both sides together.
const SUPPORTED = [
	'<body>',
	'<h1>',
	'<h2>',
	'<h3>',
	'<strong>',
	'<em>',
	'<u>',
	'<s>',
	'<code>',
	'<pre>',
	'<ul>',
	'<ol>',
	'<li>',
	'<a>',
	'<blockquote>',
	'<table>',
	'<tr>',
	'<td>',
	'<hr>',
	'<mark>',
]
const REJECTED = ['<p>', '<br>', '<div>', '<h4>', '<h5>', '<h6>', '<img>', '<del>', '<sub>', '<sup>', '<th>']

// `<li>` is deliberately on both sides: supported inside a list, rejected outside one.
const QUALIFIED = ['<li>']

const documented = parseDocumentedSubset()

describe('documented supported tags', () => {
	it.each(SUPPORTED)('%s is listed as supported', (tag) => {
		expect([...documented.supported]).toContain(tag)
	})

	it.each(SUPPORTED.filter((tag) => !QUALIFIED.includes(tag)))('%s is not also listed as rejected', (tag) => {
		expect([...documented.rejected]).not.toContain(tag)
	})

	it('lists nothing beyond the verified set', () => {
		expect([...documented.supported].sort()).toEqual([...SUPPORTED].sort())
	})
})

describe('documented rejected tags', () => {
	it.each(REJECTED)('%s is listed as rejected', (tag) => {
		expect([...documented.rejected]).toContain(tag)
	})
})

describe('headings', () => {
	// Issue #159 claimed <h2>/<h3> were unsupported and that emoji headers were the
	// workaround. They are supported; <h4>-<h6> are the ones the API rejects.
	it('treats h1-h3 as supported and h4-h6 as rejected', () => {
		for (const tag of ['<h1>', '<h2>', '<h3>']) {
			expect([...documented.supported]).toContain(tag)
			expect([...documented.rejected]).not.toContain(tag)
		}
		for (const tag of ['<h4>', '<h5>', '<h6>']) expect([...documented.rejected]).toContain(tag)
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
