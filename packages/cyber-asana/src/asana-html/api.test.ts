import { describe, expect, it } from 'vitest'
import { htmlCheckResult, htmlFixResult, htmlRulesFor } from './api.js'

describe('asana-html api', () => {
	it('reports a clean body as ok', () => {
		expect(htmlCheckResult('<body>x</body>', 'task-notes')).toEqual({ surface: 'task-notes', ok: true, problems: [] })
	})

	it('reports the problems of a body it would refuse', () => {
		const result = htmlCheckResult('<h2>x</h2>', 'status-update')
		expect(result.ok).toBe(false)
		expect(result.problems).toContain('the text must be wrapped in <body>')
	})

	it('returns the fixed html and what fix could not repair', () => {
		expect(htmlFixResult('<p>a</p><img src="https://e.com/a.png">', 'task-notes')).toEqual({
			surface: 'task-notes',
			html: '<body>a\n\n<img src="https://e.com/a.png"></body>',
			ok: false,
			problems: ["<img> is not in Asana's HTML subset"],
		})
	})

	it('gives the rules of one surface, or of every surface', () => {
		expect(htmlRulesFor('status-update').map((r) => r.surface)).toEqual(['status-update'])
		expect(htmlRulesFor().map((r) => r.surface)).toEqual(['task-notes', 'comment', 'project-brief', 'status-update'])
	})
})
