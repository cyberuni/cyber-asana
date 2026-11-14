import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installUsageErrors } from '../../platform/cli/usage.js'
import type { ScrumApi } from '../api.js'
import { reportCommand } from './cli.js'

const group = (tasks: Array<Record<string, unknown>>, points = { story: 0, task: 0 }) => ({
	count: tasks.length,
	points,
	tasks,
})

const standup = {
	scope: 'web',
	member: { gid: 'u1', name: 'Me', source: 'me' },
	today_date: '2026-01-21',
	timezone: 'UTC',
	timezone_source: 'asana',
	window: { setting: 'previous_working_day', from: '2026-01-20', since: '2026-01-20T00:00:00.000Z' },
	sprint: { n: 2, name: 'Sprint 2', start: '2026-01-19', end: '2026-02-01', working_days: 10 },
	done: group([{ gid: 'd1', name: 'Shipped it', story_points: 5 }], { story: 5, task: 0 }),
	today: group([{ gid: 't1', name: 'Doing it', reason: 'in progress' }]),
	blocked: group([
		{ gid: 'b1', name: 'Stuck', blockers: [{ signal: 'dependency', task: { gid: 'x9', name: 'upstream' } }] },
	]),
	today_basis: 'in-progress-or-due',
	points_tracked: { story: true, task: false },
	notes: [],
}

const health = {
	scope: 'web',
	today_date: '2026-01-21',
	timezone: 'UTC',
	timezone_source: 'asana',
	sprint: { n: 2, name: 'Sprint 2', start: '2026-01-19', end: '2026-02-01', working_days: 10 },
	sprint_started: true,
	settings: { checks: ['H3', 'H4', 'H8'], stale_days: 3, wip_limit: 3, overdue_grace_days: 0 },
	checks: [
		{ id: 'H3', name: 'a sprint task is unassigned', status: 'failed', findings: 1 },
		{ id: 'H4', name: 'a sprint task is overdue', status: 'passed', findings: 0 },
		{
			id: 'H8',
			name: 'the sprint is over capacity',
			status: 'skipped',
			findings: 0,
			reason: 'capacity unknown: no allocation overlaps the sprint dates',
		},
	],
	findings: [
		{
			check: 'H3',
			level: 'warning',
			message: 'Nobody task is unassigned',
			task: { gid: 't9', name: 'Nobody task' },
			fix: 'cyber-asana task update t9 --assignee me',
		},
	],
	counts: { error: 0, warning: 1 },
	in_progress_basis: 'incomplete-and-assigned',
	notes: ['state_carrier is none: completion is the only state, so in progress means incomplete and assigned.'],
}

const workload = {
	scope: 'web',
	today_date: '2026-01-21',
	timezone: 'UTC',
	timezone_source: 'asana',
	sprint: { n: 2, name: 'Sprint 2', start: '2026-01-19', end: '2026-02-01', working_days: 10 },
	window: { from: '2026-01-19', to: '2026-02-01' },
	settings: { over_allocation_pct: 100, under_allocation_pct: 60 },
	hours_per_point: 1,
	working_hours_per_day: 8,
	people: [
		{
			person: { gid: 'u1', name: 'Ann' },
			tasks: 2,
			story_points: 5,
			task_points: 1,
			effort_hours: { story: 5, task: 1, total: 6 },
			capacity: { status: 'known', hours: 40, allocations: [] },
			utilization_pct: 15,
			flag: 'under',
			ooo: [{ start_date: '2026-01-26', end_date: '2026-01-27' }],
		},
		{
			person: { gid: 'u2', name: 'Bob' },
			tasks: 1,
			story_points: 0,
			task_points: 4,
			effort_hours: { story: 0, task: 4, total: 4 },
			capacity: { status: 'unknown', reason: 'no-allocation' },
			utilization_pct: null,
			flag: 'unknown',
		},
	],
	team: {
		people: 2,
		tasks: 3,
		story_points: 5,
		task_points: 5,
		effort_hours: { story: 5, task: 5, total: 10 },
		capacity_hours: 40,
		capacity_unknown: 1,
		utilization_pct: 15,
	},
	unassigned_tasks: 0,
	points_tracked: { story: true, task: true },
	notes: ['One note.'],
}

function fakeApi(overrides: Record<string, unknown> = {}) {
	return {
		reportStandup: vi.fn(async () => standup),
		reportHealth: vi.fn(async () => health),
		reportWorkload: vi.fn(async () => workload),
		...overrides,
	} as unknown as ScrumApi
}

function program(api: ScrumApi) {
	const p = new Command().addCommand(reportCommand(() => api))
	p.option('--json').option('--toon')
	installUsageErrors(p)
	return p
}

describe('report standup command', () => {
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
		await program(api).parseAsync(['node', 'test', ...args], { from: 'node' })
		return lines.join('\n')
	}

	it('prints done, today, and blocked with the blocker, then next steps', async () => {
		const out = await run(fakeApi(), 'report', 'standup')
		expect(out).toContain('Done (1)')
		expect(out).toContain('Shipped it')
		expect(out).toContain('Today (1)')
		expect(out).toContain('Blocked (1)')
		expect(out).toContain('x9')
		expect(out).toContain('upstream')
		expect(out).toMatch(/Next steps/)
	})

	it('shows story points and task points apart', async () => {
		const out = await run(fakeApi(), 'report', 'standup')
		expect(out).toContain('5 story points')
	})

	it('says so when a group is empty', async () => {
		const api = fakeApi({ reportStandup: vi.fn(async () => ({ ...standup, blocked: group([]) })) })
		expect(await run(api, 'report', 'standup')).toContain('0 blocked tasks found')
	})

	it('says there is no current sprint, and why', async () => {
		const api = fakeApi({
			reportStandup: vi.fn(async () => ({ ...standup, sprint: null, sprint_note: 'Sprint 2 has no section.' })),
		})
		expect(await run(api, 'report', 'standup')).toContain('Sprint 2 has no section.')
	})

	it('passes --scope, --sprint and --member through', async () => {
		const api = fakeApi()
		await run(api, 'report', 'standup', '--scope', 'web', '--sprint', 'previous', '--member', 'a@b.io')
		expect(api.reportStandup).toHaveBeenCalledWith(
			{ scope: 'web', sprint: 'previous', member: 'a@b.io' },
			{ configPath: undefined, repo: undefined },
		)
	})

	it('--json prints the api result', async () => {
		const out = await run(fakeApi(), '--json', 'report', 'standup')
		expect(JSON.parse(out).done.count).toBe(1)
	})

	it('--team is passed on so the api can refuse it by code', async () => {
		const api = fakeApi()
		await run(api, 'report', 'standup', '--team')
		expect(api.reportStandup).toHaveBeenCalledWith({ team: true }, { configPath: undefined, repo: undefined })
	})

	it('rejects --me together with --member as a usage error', async () => {
		await expect(run(fakeApi(), 'report', 'standup', '--me', '--member', 'x')).rejects.toThrow()
	})
})

describe('report health command', () => {
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
		await program(api).parseAsync(['node', 'test', ...args], { from: 'node' })
		return lines.join('\n')
	}

	it('prints each check, each finding with its fix, a count summary, and next steps', async () => {
		const out = await run(fakeApi(), 'report', 'health')
		expect(out).toContain('H3')
		expect(out).toContain('failed')
		expect(out).toContain('H8')
		expect(out).toContain('capacity unknown: no allocation overlaps the sprint dates')
		expect(out).toContain('Nobody task is unassigned')
		expect(out).toContain('cyber-asana task update t9 --assignee me')
		expect(out).toContain('0 errors, 1 warning')
		expect(out).toContain('Note: state_carrier is none')
		expect(out).toMatch(/Next steps/)
	})

	it('says so when there are no findings', async () => {
		const api = fakeApi({
			reportHealth: vi.fn(async () => ({ ...health, findings: [], counts: { error: 0, warning: 0 } })),
		})
		expect(await run(api, 'report', 'health')).toContain('0 findings found')
	})

	it('passes --scope and --sprint through', async () => {
		const api = fakeApi()
		await run(api, 'report', 'health', '--scope', 'web', '--sprint', 'previous')
		expect(api.reportHealth).toHaveBeenCalledWith(
			{ scope: 'web', sprint: 'previous' },
			{ configPath: undefined, repo: undefined },
		)
	})

	it('--json prints the api result', async () => {
		const out = await run(fakeApi(), '--json', 'report', 'health')
		expect(JSON.parse(out).counts.warning).toBe(1)
	})
})

describe('report workload command', () => {
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
		await program(api).parseAsync(['node', 'test', ...args], { from: 'node' })
		return lines.join('\n')
	}

	it('prints each person with load, capacity, utilization and flag, the unknown reason, the ooo note, and the team total', async () => {
		const out = await run(fakeApi(), 'report', 'workload')
		expect(out).toContain('Workload for Sprint 2')
		expect(out).toMatch(/Ann.*5 story.*1 task.*6 h.*40 h.*15%.*under/)
		expect(out).toMatch(/Bob.*4 h.*capacity unknown.*no allocation/)
		expect(out).toContain('out of office 2026-01-26 to 2026-01-27')
		expect(out).toMatch(/Team.*10 h.*40 h/)
		expect(out).toContain('Note: One note.')
		expect(out).toMatch(/Next steps/)
	})

	it('names a plan limit as the reason', async () => {
		const plan = {
			...workload,
			people: [{ ...workload.people[1], capacity: { status: 'unknown', reason: 'plan' } }],
		}
		const out = await run(fakeApi({ reportWorkload: vi.fn(async () => plan) }), 'report', 'workload')
		expect(out).toMatch(/capacity unknown.*plan/)
	})

	it('says so when nobody has load or capacity', async () => {
		const empty = { ...workload, people: [], team: { ...workload.team, people: 0, capacity_hours: null } }
		const out = await run(fakeApi({ reportWorkload: vi.fn(async () => empty) }), 'report', 'workload')
		expect(out).toContain('0 people found')
	})

	it('passes --scope, --sprint, --from, --to and --workspace through', async () => {
		const api = fakeApi()
		await run(
			api,
			'report',
			'workload',
			'--scope',
			'web',
			'--from',
			'2026-01-19',
			'--to',
			'2026-01-23',
			'--workspace',
			'w1',
		)
		expect(api.reportWorkload).toHaveBeenCalledWith(
			{ scope: 'web', from: '2026-01-19', to: '2026-01-23', workspace: 'w1' },
			{ configPath: undefined, repo: undefined },
		)
		await run(api, 'report', 'workload', '--sprint', 'previous')
		expect(api.reportWorkload).toHaveBeenLastCalledWith(
			{ sprint: 'previous' },
			{ configPath: undefined, repo: undefined },
		)
	})

	it('--sprint conflicts with --from and --to as a usage error', async () => {
		await expect(
			run(fakeApi(), 'report', 'workload', '--sprint', 'previous', '--from', '2026-01-19', '--to', '2026-01-23'),
		).rejects.toThrow()
	})

	it('--json prints the api result', async () => {
		const out = await run(fakeApi(), '--json', 'report', 'workload')
		expect(JSON.parse(out).team.capacity_hours).toBe(40)
	})
})
