import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installUsageErrors } from '../platform/cli/usage.js'
import type { ScrumApi } from './api.js'
import { sprintCommand } from './cli.js'

const row = (gid: string, story: number, cum: number, within: boolean) => ({
	gid,
	name: `task ${gid}`,
	story_points: story,
	task_points: 0,
	effort_hours: story,
	cumulative: { story_points: cum, task_points: 0, effort_hours: cum },
	within_limits: within,
})

const plan = {
	scope: 'web',
	today_date: '2026-01-21',
	timezone: 'UTC',
	sprint: { n: 3, name: 'Sprint 3', start: '2026-02-02', end: '2026-02-15', working_days: 10 },
	velocity_window: 3,
	hours_per_point: 1,
	velocity: { sprints: 2, mean: { count: 4, story: 8, task: 0 } },
	capacity: { status: 'known', hours: 40 },
	limits: { story_points: 8, task_points: null, effort_hours: 40 },
	points_tracked: { story: true, task: false },
	backlog: [row('a', 3, 3, true), row('b', 5, 8, true), row('c', 2, 10, false)],
	proposal: {
		tasks: ['a', 'b'],
		totals: { count: 2, story_points: 8, task_points: 0, effort_hours: 8 },
		stopped_before: { gid: 'c', reasons: ['story points 10 > 8 (velocity)'] },
		unestimated: [],
	},
	notes: ['One note.'],
}

describe('sprint plan command', () => {
	const originalArgv = [...process.argv]
	afterEach(() => {
		vi.restoreAllMocks()
		process.argv = [...originalArgv]
	})

	const api = (result: unknown = plan) => ({ planSprint: vi.fn(async () => result) }) as unknown as ScrumApi

	async function run(a: ScrumApi, ...args: string[]) {
		const lines: string[] = []
		vi.spyOn(console, 'log').mockImplementation((...x) => {
			lines.push(x.join(' '))
		})
		process.argv = ['node', 'test', ...args]
		const p = new Command().addCommand(sprintCommand(() => a))
		p.option('--json').option('--toon')
		installUsageErrors(p)
		await p.parseAsync(['node', 'test', ...args], { from: 'node' })
		return lines.join('\n')
	}

	it('prints the limits, the proposal, and why it stopped, with next steps', async () => {
		const out = await run(api(), 'sprint', 'plan')
		expect(out).toContain('Plan for Sprint 3')
		expect(out).toContain('mean 8 story points over 2 closed sprints')
		expect(out).toContain('capacity 40 h')
		expect(out).toContain('Proposed: 2 tasks — 8 story points, 8 h')
		expect(out).toContain('a  task a')
		expect(out).toContain('stopped before c: story points 10 > 8 (velocity)')
		expect(out).toContain('Note: One note.')
		expect(out).toMatch(/Next steps/)
	})

	it('says when capacity is unknown, and why', async () => {
		const out = await run(
			api({
				...plan,
				capacity: { status: 'unknown', hours: null, reason: 'plan' },
				limits: { ...plan.limits, effort_hours: null },
			}),
			'sprint',
			'plan',
		)
		expect(out).toContain('capacity unknown (plan)')
	})

	it('says so when the backlog is empty', async () => {
		const out = await run(api({ ...plan, backlog: [], proposal: { ...plan.proposal, tasks: [] } }), 'sprint', 'plan')
		expect(out).toContain('0 tasks found')
	})

	it('plans the next sprint unless told otherwise, and passes --scope and --tasks through', async () => {
		const a = api()
		await run(a, 'sprint', 'plan')
		expect(a.planSprint).toHaveBeenLastCalledWith({ sprint: 'next' }, { configPath: undefined, repo: undefined })
		await run(a, 'sprint', 'plan', '--scope', 'web', '--sprint', 'current', '--tasks', 'a,b', '--tasks', 'c')
		expect(a.planSprint).toHaveBeenLastCalledWith(
			{ scope: 'web', sprint: 'current', tasks: ['a', 'b', 'c'] },
			{ configPath: undefined, repo: undefined },
		)
	})

	it('shows the totals of a selection against each limit', async () => {
		const selection = {
			tasks: ['a', 'b', 'c'],
			not_in_backlog: ['gone'],
			totals: { count: 3, story_points: 10, task_points: 0, effort_hours: 10 },
			against: {
				story_points: { total: 10, limit: 8, over: true },
				effort_hours: { total: 10, limit: 40, over: false },
			},
			fits: false,
		}
		const out = await run(api({ ...plan, selection }), 'sprint', 'plan', '--tasks', 'a,b,c,gone')
		expect(out).toContain('Selection: 3 tasks — does not fit')
		expect(out).toContain('story points 10 of 8 (over)')
		expect(out).toContain('effort hours 10 of 40')
		expect(out).toContain('not in the backlog: gone')
	})

	it('--json prints the api result', async () => {
		expect(JSON.parse(await run(api(), '--json', 'sprint', 'plan')).proposal.tasks).toEqual(['a', 'b'])
	})
})
