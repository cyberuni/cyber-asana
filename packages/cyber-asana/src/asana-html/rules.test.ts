import { describe, expect, it } from 'vitest'
import { parseDocumentedSubset } from '../skills/html-subset.js'
import { htmlRules } from './rules.js'
import { SURFACES } from './surfaces.js'

describe('htmlRules', () => {
	it('ships the first cut: task notes and status updates', () => {
		expect(SURFACES).toEqual(['task-notes', 'status-update'])
	})

	it('describes task notes from the live probe in tidy-description', () => {
		const rules = htmlRules('task-notes')
		expect(rules.allowed).toContain('h3')
		expect(rules.allowed).toContain('body')
		expect(rules.rejected).toEqual(expect.arrayContaining(['p', 'br', 'div', 'h4', 'th']))
		expect(rules.evidence).toContain('2026-08')
		expect(rules.unverified).toEqual([])
	})

	it('marks a heading as refused on status updates and says why', () => {
		const rules = htmlRules('status-update')
		expect(rules.allowed).not.toContain('h1')
		expect(rules.rejected).toEqual(expect.arrayContaining(['h1', 'h2', 'h3']))
		expect(rules.messages.h2).toContain('use <strong> for a heading')
		expect(rules.evidence).toContain('2026-11-14')
	})

	it('names the tags a status update inherits without a live probe', () => {
		expect(htmlRules('status-update').unverified).toEqual(expect.arrayContaining(['table', 'blockquote', 'ol']))
	})

	it('marks the refusals a status update inherits from task notes as unverified', () => {
		expect(htmlRules('status-update').unverified).toEqual(expect.arrayContaining(['p', 'br', 'div']))
		expect(htmlRules('status-update').unverified).not.toContain('h1')
	})

	it('cites every source behind the status-update claims', () => {
		const { evidence } = htmlRules('status-update')
		expect(evidence).toContain('scrum-system.md')
		expect(evidence).toContain('tidy-description.md')
		expect(evidence).toContain('status-post.system.ts')
	})

	it('stays in step with the tags the tidy-description reference documents', () => {
		const documented = parseDocumentedSubset()
		const notes = htmlRules('task-notes')
		expect([...notes.allowed.map((t) => `<${t}>`)].sort()).toEqual([...documented.supported].sort())
		// <li> is rejected only outside a list, which checkHtml checks by position.
		const refusedByDoc = [...documented.rejected].filter((t) => t !== '<li>').map((t) => t.slice(1, -1))
		expect(refusedByDoc.every((t) => notes.rejected.includes(t))).toBe(true)
	})
})
