import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installUsageErrors } from '../../../platform/cli/usage.js'
import type { ScrumApi } from '../../api.js'
import { reportCommand } from '../cli.js'

const sprint = { n: 2, name: 'Sprint 2', start: '2026-01-19', end: '2026-02-01', working_days: 10 }
const tracked = { story: true, task: false }

const dashboard = {
	scope: 'web',
	settings: {
		reports: ['sprint', 'health', 'workload', 'velocity', 'release-readiness', 'retro'],
		forms: ['cli'],
		status_parent: 'scope-default',
		status_rules: { off_track: 'error', at_risk: 'warning', otherwise: 'on_track' },
	},
	reports: [
		{
			key: 'sprint',
			status: 'ok',
			data: {
				sprint,
				points_tracked: tracked,
				committed: { source: 'snapshot', count: 4, points: { story: 10, task: 0 } },
				completed: { count: 2, points: { story: 5, task: 0 } },
				added: { count: 1, points: { story: 1, task: 0 } },
				removed: { count: 0, points: { story: 0, task: 0 } },
				completion_rate: { count: 40, story: 50, task: null },
			},
		},
		{
			key: 'health',
			status: 'ok',
			data: {
				counts: { error: 1, warning: 1 },
				findings: [
					{
						check: 'H4',
						level: 'error',
						message: 'Late task is overdue',
						fix: 'cyber-asana task update t1 --due-on <date>',
					},
					{
						check: 'H3',
						level: 'warning',
						message: 'Nobody task is unassigned',
						fix: 'cyber-asana task update t2 --assignee me',
					},
				],
			},
		},
		{
			key: 'workload',
			status: 'failed',
			error: {
				code: 'sprint-none',
				message: 'Sprint 2 has no section',
				hint: 'Start it with: cyber-asana sprint start',
			},
		},
		{
			key: 'velocity',
			status: 'ok',
			data: { window: 3, sprints: [], mean: { count: 5, story: 8, task: 0 }, points_tracked: tracked },
		},
		{
			key: 'release-readiness',
			status: 'unsupported',
			reason: 'the CLI does not compute it',
			reference: 'cyber-asana.report.release-readiness',
		},
		{
			key: 'retro',
			status: 'ok',
			data: {
				carry_over: [{ gid: 'c', name: 'left over' }],
				scope_change: { added: { count: 1 }, removed: null },
				blocked: { tasks: [], total_hours: 0 },
				cycle_time: { count: 0 },
				points_tracked: tracked,
			},
		},
	],
	counts: { ok: 4, failed: 1, unsupported: 1 },
	status_type: 'off_track',
	status_basis: 'health: 1 error, 1 warning',
	notes: ['Report release-readiness is unsupported: the CLI does not compute it.'],
}

function run(api: ScrumApi, ...args: string[]) {
	const lines: string[] = []
	vi.spyOn(console, 'log').mockImplementation((...a) => {
		lines.push(a.join(' '))
	})
	process.argv = ['node', 'test', ...args]
	const p = new Command().addCommand(reportCommand(() => api))
	p.option('--json').option('--toon')
	installUsageErrors(p)
	return p.parseAsync(['node', 'test', ...args], { from: 'node' }).then(() => lines.join('\n'))
}

describe('report dashboard command', () => {
	const originalArgv = [...process.argv]
	const api = () => ({ reportDashboard: vi.fn(async () => dashboard) }) as unknown as ScrumApi
	afterEach(() => {
		vi.restoreAllMocks()
		process.argv = [...originalArgv]
	})

	it('prints the status, then one section per report in order', async () => {
		const out = await run(api(), 'report', 'dashboard')
		expect(out).toContain('Dashboard for web')
		expect(out).toContain('off_track (health: 1 error, 1 warning)')
		const order = ['Sprint report', 'Health', 'Workload', 'Velocity', 'release-readiness', 'Retro'].map((h) =>
			out.indexOf(`\n${h}`),
		)
		expect(order.every((i) => i >= 0)).toBe(true)
		expect([...order].sort((a, b) => a - b)).toEqual(order)
	})

	it('shows the sprint figures, the findings with their fixes, and the velocity mean', async () => {
		const out = await run(api(), 'report', 'dashboard')
		expect(out).toContain('Committed: 4 tasks — 10 story points (snapshot)')
		expect(out).toContain('[error] H4  Late task is overdue')
		expect(out).toContain('fix: cyber-asana task update t1')
		expect(out).toContain('mean per sprint: 5 tasks')
	})

	it('names a failed report with its code and a report it cannot compute as unsupported', async () => {
		const out = await run(api(), 'report', 'dashboard')
		expect(out).toContain('failed (sprint-none): Sprint 2 has no section')
		expect(out).toContain('unsupported: the CLI does not compute it')
	})

	it('summarizes the counts and gives next steps', async () => {
		const out = await run(api(), 'report', 'dashboard')
		expect(out).toContain('4 ok, 1 failed, 1 unsupported')
		expect(out).toMatch(/Next steps/)
	})

	it('passes --scope and --sprint through', async () => {
		const a = api()
		await run(a, 'report', 'dashboard', '--scope', 'web', '--sprint', 'previous')
		expect(a.reportDashboard).toHaveBeenCalledWith(
			{ scope: 'web', sprint: 'previous' },
			{ configPath: undefined, repo: undefined },
		)
	})

	it('--json prints the api result', async () => {
		expect(JSON.parse(await run(api(), '--json', 'report', 'dashboard')).status_type).toBe('off_track')
	})
})
