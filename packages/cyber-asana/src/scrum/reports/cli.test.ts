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

function fakeApi(overrides: Record<string, unknown> = {}) {
	return { reportStandup: vi.fn(async () => standup), ...overrides } as unknown as ScrumApi
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
