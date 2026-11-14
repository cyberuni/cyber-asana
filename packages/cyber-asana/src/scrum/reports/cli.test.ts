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
			reason: 'capacity unknown: allocations not wired yet',
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

function fakeApi(overrides: Record<string, unknown> = {}) {
	return {
		reportStandup: vi.fn(async () => standup),
		reportHealth: vi.fn(async () => health),
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
		expect(out).toContain('capacity unknown: allocations not wired yet')
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
