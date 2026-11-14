import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installUsageErrors } from '../../platform/cli/usage.js'
import type { ScrumApi } from '../api.js'
import { reportCommand } from './cli.js'

const sprint = { n: 2, name: 'Sprint 2', start: '2026-01-19', end: '2026-02-01', working_days: 10 }
const item = (gid: string, name: string, extra: Record<string, unknown> = {}) => ({ gid, name, ...extra })
const pts = (story: number, task: number) => ({ story, task })
const tracked = { story: true, task: true }

const sprintReport = {
	scope: 'web',
	sprint,
	committed: { source: 'snapshot', count: 4, points: pts(18, 0), tasks: [] },
	completed: { count: 3, points: pts(5, 1), tasks: [item('a', 'Login', { story_points: 3 })] },
	added: { count: 1, points: pts(0, 1), tasks: [item('d', 'Cleanup')] },
	removed: { count: 1, points: pts(8, 0), tasks: [item('g', 'Gone')] },
	completion_rate: { count: 75, story: 50, task: 100 },
	carry_over_candidates: [item('c', 'Reports', { story_points: 5 })],
	burndown: [{ date: '2026-01-19', completed: 0, remaining: { count: 4, story: 10, task: 1 } }],
	demo: { basis: 'story-points', tasks: [item('a', 'Login')] },
	points_tracked: tracked,
	notes: ['Rebuilt from history.'],
}

const retro = {
	scope: 'web',
	sprint,
	carry_over: [item('c', 'Reports')],
	scope_change: { source: 'snapshot', added: sprintReport.added, removed: sprintReport.removed },
	blocked: { tasks: [{ gid: 'c', name: 'Reports', hours: 12, open: true }], total_hours: 12 },
	cycle_time: { basis: 'created_at', count: 2, mean_days: 3, median_days: 3 },
	estimate_vs_actual: {
		tasks: [],
		totals: { estimate: pts(3, 0), actual: pts(5, 0) },
	},
	points_tracked: tracked,
	notes: ['No system story showed a block.'],
}

const velocity = {
	scope: 'web',
	window: 3,
	sprints: [{ n: 1, name: 'Sprint 1', completed: { count: 2, points: pts(8, 1) } }],
	mean: { count: 2, story: 8, task: 1 },
	points_tracked: tracked,
	notes: ['1 closed sprint(s) found.'],
}

const fakeApi = (o: Record<string, unknown> = {}) =>
	({
		reportSprint: vi.fn(async () => sprintReport),
		reportRetro: vi.fn(async () => retro),
		reportVelocity: vi.fn(async () => velocity),
		...o,
	}) as unknown as ScrumApi

describe('report sprint | retro | velocity commands', () => {
	const originalArgv = [...process.argv]
	afterEach(() => {
		vi.restoreAllMocks()
		process.argv = [...originalArgv]
	})

	async function run(api: ScrumApi, ...args: string[]) {
		const lines: string[] = []
		vi.spyOn(console, 'log').mockImplementation((...a) => {
			lines.push(a.join(' '))
		})
		process.argv = ['node', 'test', ...args]
		const p = new Command().addCommand(reportCommand(() => api))
		p.option('--json').option('--toon')
		installUsageErrors(p)
		await p.parseAsync(['node', 'test', ...args], { from: 'node' })
		return lines.join('\n')
	}

	it('report sprint prints committed, completed, scope change, rates, burndown, and next steps', async () => {
		const out = await run(fakeApi(), 'report', 'sprint')
		expect(out).toContain('Sprint 2')
		expect(out).toContain('Committed: 4 tasks')
		expect(out).toContain('18 story points')
		expect(out).toContain('Completed: 3 tasks')
		expect(out).toContain('Removed: 1 task')
		expect(out).toContain('75% by count')
		expect(out).toContain('Carry-over candidates (1)')
		expect(out).toContain('2026-01-19')
		expect(out).toContain('Rebuilt from history.')
		expect(out).toMatch(/Next steps/)
	})

	it('report sprint says removed is unavailable when it is null', async () => {
		const api = fakeApi({ reportSprint: vi.fn(async () => ({ ...sprintReport, removed: null })) })
		expect(await run(api, 'report', 'sprint')).toContain('Removed: unavailable')
	})

	it('report sprint says so when nothing is left to carry over', async () => {
		const api = fakeApi({ reportSprint: vi.fn(async () => ({ ...sprintReport, carry_over_candidates: [] })) })
		expect(await run(api, 'report', 'sprint')).toContain('0 carry-over candidates found')
	})

	it('passes --scope and --sprint through, and prints JSON with --json', async () => {
		const api = fakeApi()
		await run(api, 'report', 'sprint', '--scope', 'web', '--sprint', 'previous')
		expect(api.reportSprint).toHaveBeenCalledWith(
			{ scope: 'web', sprint: 'previous' },
			{ configPath: undefined, repo: undefined },
		)
		expect(JSON.parse(await run(fakeApi(), '--json', 'report', 'sprint')).completed.count).toBe(3)
	})

	it('report retro prints carry-over, scope change, blocked time, cycle time, and estimate against actual', async () => {
		const out = await run(fakeApi(), 'report', 'retro')
		expect(out).toContain('Carry-over (1)')
		expect(out).toContain('Scope change')
		expect(out).toContain('12h')
		expect(out).toContain('mean 3 days')
		expect(out).toContain('estimate 3 story points')
		expect(out).toContain('No system story showed a block.')
		expect(out).toContain('cyber-asana sprint close')
	})

	it('report retro says the estimate comparison is unavailable when null', async () => {
		const api = fakeApi({ reportRetro: vi.fn(async () => ({ ...retro, estimate_vs_actual: null })) })
		expect(await run(api, 'report', 'retro')).toContain('Estimate against actual: unavailable')
	})

	it('report velocity prints a table with the mean, and takes no --sprint', async () => {
		const out = await run(fakeApi(), 'report', 'velocity')
		expect(out).toContain('Sprint 1')
		expect(out).toContain('mean')
		await expect(run(fakeApi(), 'report', 'velocity', '--sprint', '2')).rejects.toThrow()
	})

	it('report velocity says so when there are no closed sprints', async () => {
		const api = fakeApi({ reportVelocity: vi.fn(async () => ({ ...velocity, sprints: [], mean: null })) })
		expect(await run(api, 'report', 'velocity')).toContain('0 closed sprints found')
	})
})
