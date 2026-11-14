import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const IMPLEMENTATIONS = [
	'cyber-asana.report.standup',
	'cyber-asana.report.sprint',
	'cyber-asana.report.retro',
	'cyber-asana.report.velocity',
	'cyber-asana.report.health',
	'cyber-asana.report.workload',
]
const NAMES = ['cyber-asana.report.interface', ...IMPLEMENTATIONS]
const repo = mkdtempSync(join(tmpdir(), 'ca-refs-'))
afterAll(() => rmSync(repo, { recursive: true, force: true }))

function agentkit(...args: string[]) {
	return JSON.parse(
		execFileSync(
			join(PACKAGE, 'node_modules/.bin/cyber-agentkit'),
			['reference', ...args, '--root', repo, '--format', 'json'],
			{ encoding: 'utf8', cwd: repo },
		),
	)
}

describe('report references', () => {
	execFileSync('git', ['init', '-q', repo])
	mkdirSync(join(repo, '.agents/references'), { recursive: true })
	for (const name of NAMES)
		copyFileSync(join(PACKAGE, `references/${name}.md`), join(repo, `.agents/references/${name}.md`))

	it('are accepted by cyber-agentkit reference check', () => {
		const result = agentkit('check', ...NAMES)
		expect(result.failed ?? []).toEqual([])
		expect(result.passed).toBe(NAMES.length)
	})

	it('lists every report as an implementation of the many-cardinality interface', () => {
		const listed = JSON.stringify(agentkit('implementations', 'cyber-asana.report'))
		for (const name of IMPLEMENTATIONS) expect(listed).toContain(name)
	})

	it('lists health as an implementation too', () => {
		expect(JSON.stringify(agentkit('implementations', 'cyber-asana.report'))).toContain('cyber-asana.report.health')
	})

	it('ships health frontmatter that parses to the defaults', async () => {
		const { readFileSync } = await import('node:fs')
		const { parseHealthSettings, DEFAULT_HEALTH_SETTINGS } = await import('./health.js')
		const front = readFileSync(join(PACKAGE, 'references/cyber-asana.report.health.md'), 'utf8').split('---')[1] ?? ''
		const yaml = (await import('yaml')).parse(front)
		expect(parseHealthSettings(yaml)).toEqual(DEFAULT_HEALTH_SETTINGS)
		expect(yaml.checks).toHaveLength(11)
	})

	it('lists workload as an implementation too', () => {
		expect(JSON.stringify(agentkit('implementations', 'cyber-asana.report'))).toContain('cyber-asana.report.workload')
	})

	it('ships workload frontmatter that parses to the defaults', async () => {
		const { readFileSync } = await import('node:fs')
		const { parseWorkloadSettings, DEFAULT_WORKLOAD_SETTINGS } = await import('./workload.js')
		const front = readFileSync(join(PACKAGE, 'references/cyber-asana.report.workload.md'), 'utf8').split('---')[1] ?? ''
		const yaml = (await import('yaml')).parse(front)
		expect(parseWorkloadSettings(yaml)).toEqual(DEFAULT_WORKLOAD_SETTINGS)
		expect(yaml).toMatchObject({ over_allocation_pct: 100, under_allocation_pct: 60 })
	})

	it('checks the dashboard reference with cyber-agentkit', () => {
		const dir = join(repo, '.agents/references')
		copyFileSync(join(PACKAGE, 'references/cyber-asana.dashboard.md'), join(dir, 'cyber-asana.dashboard.md'))
		const result = agentkit('check', 'cyber-asana.dashboard')
		expect(result.failed ?? []).toEqual([])
		expect(result.passed).toBe(1)
	})
})

describe('the shipped cyber-asana.dashboard status update template', () => {
	it('renders to a body inside the HTML subset for a full dashboard', async () => {
		const { loadStatusTemplate } = await import('./dashboard.js')
		const { renderStatusUpdate } = await import('./status-update.js')
		const { findHtmlSubsetProblems } = await import('../../platform/html-subset.js')
		const empty = mkdtempSync(join(tmpdir(), 'dash-tpl-'))
		const template = await loadStatusTemplate({ root: empty, home: empty, env: {} })
		const out = renderStatusUpdate(template, {
			scope: 'web',
			status_type: 'off_track',
			reports: [
				{
					key: 'health',
					status: 'ok',
					data: {
						counts: { error: 1, warning: 0 },
						findings: [{ check: 'H4', message: 'late', task: { gid: '1', name: 'T' }, fix: 'x' }],
					},
				},
				{
					key: 'sprint',
					status: 'ok',
					data: {
						sprint: { name: 'Sprint 3' },
						points_tracked: { story: true, task: true },
						committed: { source: 'snapshot', count: 4, points: { story: 8, task: 3 } },
						completed: { count: 2, points: { story: 5, task: 1 } },
						completion_rate: { count: 50 },
					},
				},
				{
					key: 'workload',
					status: 'ok',
					data: {
						people: [
							{
								person: { gid: 'u', name: 'A' },
								effort_hours: { total: 5 },
								capacity: { status: 'known', hours: 8 },
								flag: 'ok',
							},
						],
					},
				},
				{
					key: 'velocity',
					status: 'ok',
					data: { window: 3, mean: { story: 6, task: 2 }, points_tracked: { story: true, task: true } },
				},
			],
		} as never)
		expect(out.title).toBe('Sprint 3 — Off track')
		expect(findHtmlSubsetProblems(out.html_text)).toEqual([])
		for (const h of ['Health', 'Sprint', 'Workload', 'Velocity']) expect(out.html_text).toContain(`<h2>${h}</h2>`)
		expect(out.html_text).toContain('Mean of the last 3 sprints: 6 story points, 2 task points')
	})
})
