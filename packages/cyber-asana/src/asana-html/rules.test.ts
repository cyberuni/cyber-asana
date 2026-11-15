import { describe, expect, it } from 'vitest'
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

	// Verified against the live Asana API (PUT /tasks/{gid}), 2026-08. Issue #159 reported several of
	// these backwards, so the claims are pinned rather than trusted. When Asana changes the subset out
	// of band, `pnpm test:system` is what detects it (src/skills/html-subset.system.ts).
	it('pins the task-notes subset to the live probe', () => {
		const rules = htmlRules('task-notes')
		expect(rules.allowed).toEqual(
			[
				'body',
				'h1',
				'h2',
				'h3',
				'strong',
				'em',
				'u',
				's',
				'code',
				'pre',
				'ul',
				'ol',
				'li',
				'a',
				'blockquote',
				'table',
				'tr',
				'td',
				'hr',
				'mark',
			].sort(),
		)
		expect(rules.rejected).toEqual(['p', 'br', 'div', 'h4', 'h5', 'h6', 'img', 'del', 'sub', 'sup', 'th'].sort())
	})

	// Issue #159 claimed <h2>/<h3> were unsupported. They are supported; <h4>-<h6> are the ones refused.
	it('keeps h1-h3 and refuses h4-h6 in task notes', () => {
		const rules = htmlRules('task-notes')
		for (const tag of ['h1', 'h2', 'h3']) expect(rules.allowed).toContain(tag)
		for (const tag of ['h4', 'h5', 'h6']) expect(rules.rejected).toContain(tag)
	})
})
