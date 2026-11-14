import { describe, expect, it } from 'vitest'
import { findHtmlSubsetProblems } from '../../platform/html-subset.js'
import { parseStatusTemplate, renderStatusUpdate, statusParentFor } from './status-update.js'

const CONTENT = [
	'---',
	'description: x',
	'---',
	'',
	'## Status update',
	'',
	'Title: `{sprint} — {status}`',
	'',
	'```html',
	'<body><h2>Health</h2>',
	'<ul>',
	'<li><strong>{errors} errors</strong>, {warnings} warnings</li>',
	'<li>{finding}</li>',
	'</ul>',
	'<h2>Sprint</h2>',
	'<ul>',
	'<li>Committed {committed_tasks} tasks, completed {completed_tasks} ({completion_rate} by count)</li>',
	'<li>Story points: {story_completed} of {story_committed}</li>',
	'</ul>',
	'<h2>Workload</h2>',
	'<ul>',
	'<li>{person}: {load} of {capacity} ({flag})</li>',
	'</ul>',
	'</body>',
	'```',
	'',
	'## Page',
	'',
	'ignored',
].join('\n')

const dashboard = {
	scope: 'web',
	status_type: 'at_risk' as const,
	reports: [
		{
			key: 'health',
			status: 'ok',
			data: {
				counts: { error: 0, warning: 2 },
				findings: [
					{
						check: 'H1',
						level: 'warning',
						message: 'no estimate <now>',
						task: { gid: '1', name: 'Fix & ship', url: 'https://app.asana.com/0/1/1' },
						fix: 'x',
					},
					{ check: 'H5', level: 'warning', message: 'stale', fix: 'y' },
				],
			},
		},
		{
			key: 'sprint',
			status: 'ok',
			data: {
				sprint: { name: 'Sprint 4' },
				points_tracked: { story: true, task: false },
				committed: { source: 'snapshot', count: 5, points: { story: 20, task: 0 } },
				completed: { count: 3, points: { story: 8, task: 0 } },
				completion_rate: { count: 60, story: 40, task: null },
			},
		},
		{
			key: 'workload',
			status: 'ok',
			data: {
				people: [
					{
						person: { gid: 'u1', name: 'Ann' },
						effort_hours: { total: 30 },
						capacity: { status: 'known', hours: 24 },
						flag: 'over',
					},
					{
						person: { gid: 'u2' },
						effort_hours: { total: 4 },
						capacity: { status: 'unknown', reason: 'no-allocation' },
						flag: 'unknown',
					},
				],
			},
		},
	],
} as never

describe('parseStatusTemplate', () => {
	it('reads the title line and the html block of the Status update section only', () => {
		const t = parseStatusTemplate(CONTENT)
		expect(t.title).toBe('{sprint} — {status}')
		expect(t.body.startsWith('<body>')).toBe(true)
		expect(t.body).not.toContain('ignored')
	})

	it('fails with a coded error when the section, title or block is missing', () => {
		expect(() => parseStatusTemplate('## Page\n')).toThrow(/Status update/)
		expect(() => parseStatusTemplate('## Status update\n\n```html\n<body></body>\n```\n')).toThrow(/Title/)
		expect(() => parseStatusTemplate('## Status update\n\nTitle: `x`\n')).toThrow(/html/)
	})
})

describe('renderStatusUpdate', () => {
	const out = renderStatusUpdate(parseStatusTemplate(CONTENT), dashboard)

	it('fills the title with the sprint name and the status label', () => {
		expect(out.title).toBe('Sprint 4 — At risk')
	})

	it('repeats a line per finding and per person, escaping values', () => {
		expect(out.html_text).toContain(
			'<li>H1 <a href="https://app.asana.com/0/1/1">Fix &amp; ship</a>: no estimate &lt;now&gt;</li>',
		)
		expect(out.html_text).toContain('<li>H5 stale</li>')
		expect(out.html_text).toContain('<li>Ann: 30 h of 24 h (over)</li>')
		expect(out.html_text).toContain('<li>u2: 4 h of unknown (no-allocation) (unknown)</li>')
	})

	it('fills scalars and keeps the output inside the HTML subset', () => {
		expect(out.html_text).toContain('<li><strong>0 errors</strong>, 2 warnings</li>')
		expect(out.html_text).toContain('<li>Committed 5 tasks, completed 3 (60% by count)</li>')
		expect(findHtmlSubsetProblems(out.html_text)).toEqual([])
	})

	it('omits a line whose data was not computed, and a heading left with no lines', () => {
		const bare = renderStatusUpdate(parseStatusTemplate(CONTENT), { ...(dashboard as object), reports: [] } as never)
		expect(bare.html_text).not.toContain('<h2>')
		expect(bare.title).toBe('web — At risk')
	})

	it('writes unknown, with the reason, for a commitment that could not be rebuilt', () => {
		const d = structuredClone(dashboard) as { reports: Array<{ key: string; data: { committed?: unknown } }> }
		d.reports[1]!.data.committed = { source: 'unavailable', count: 0, points: { story: 0, task: 0 } }
		const r = renderStatusUpdate(parseStatusTemplate(CONTENT), d as never)
		expect(r.html_text).toContain('Committed unknown (no commitment snapshot) tasks')
		expect(r.html_text).toContain('Story points: 8 of unknown (no commitment snapshot)')
	})

	it('rejects a placeholder it does not know', () => {
		expect(() => renderStatusUpdate({ title: '{nope}', body: '<body></body>' }, dashboard)).toThrow(/nope/)
	})
})

describe('statusParentFor', () => {
	it('uses the project of a project scope and the portfolio of a portfolio scope by default', () => {
		expect(statusParentFor({ name: 'a', kind: 'project', projects: ['1'] }, 'scope-default')).toEqual({
			gid: '1',
			type: 'project',
		})
		expect(statusParentFor({ name: 'a', kind: 'portfolio', portfolio: '9' }, 'scope-default')).toEqual({
			gid: '9',
			type: 'portfolio',
		})
	})

	it('honours status_parent when the scope has that object', () => {
		expect(
			statusParentFor({ name: 'a', kind: 'project', projects: ['1'], sprint_portfolio: '7' }, 'portfolio'),
		).toEqual({ gid: '7', type: 'portfolio' })
		expect(statusParentFor({ name: 'a', kind: 'portfolio', portfolio: '9', backlog_project: '3' }, 'project')).toEqual({
			gid: '3',
			type: 'project',
		})
	})

	it('stops with a coded error when no single parent exists', () => {
		expect(() => statusParentFor({ name: 'a', kind: 'projects', projects: ['1', '2'] }, 'scope-default')).toThrow(
			expect.objectContaining({ code: 'status-parent-unavailable' }),
		)
		expect(() => statusParentFor({ name: 'a', kind: 'portfolio', portfolio: '9' }, 'project')).toThrow(
			expect.objectContaining({ code: 'status-parent-unavailable' }),
		)
	})
})
