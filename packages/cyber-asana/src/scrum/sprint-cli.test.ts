import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installUsageErrors } from '../platform/cli/usage.js'
import type { ScrumApi } from './api.js'
import { backlogCommand, sprintCommand } from './cli.js'

const sprint = { n: 2, name: 'Sprint 2', start: '2026-01-19', end: '2026-02-01', working_days: 10 }

function fakeApi(overrides: Partial<ScrumApi> = {}) {
	return {
		currentSprint: vi.fn(async () => ({
			scope: 'web',
			today: '2026-01-20',
			timezone: 'UTC',
			timezone_source: 'machine',
			sprint,
			projects: [{ gid: 'p1', section_gid: 's1' }],
			missing: [],
		})),
		listSprints: vi.fn(async () => ({
			scope: 'web',
			today: '2026-01-20',
			sprints: [{ ...sprint, state: 'current', exists: true, projects: ['p1'] }],
		})),
		sprintTasks: vi.fn(async () => ({
			scope: 'web',
			sprint,
			tasks: [{ gid: 't1', name: 'Do it', completed: false }],
			count: { total: 1, completed: 0, open: 1 },
		})),
		addToSprint: vi.fn(async () => ({
			scope: 'web',
			sprint,
			added: [{ task: 't1', project: 'p1', from: 'Backlog' }],
			already_in_sprint: [],
			outside_scope: [],
			missing: [],
		})),
		startSprint: vi.fn(async () => ({
			scope: 'web',
			sprint,
			created: ['p1'],
			existing: [],
			already_started: false,
		})),
		closeSprint: vi.fn(async () => ({
			scope: 'web',
			sprint,
			next_sprint: { ...sprint, n: 3, name: 'Sprint 3' },
			carry_over: 'move',
			ended: true,
			moved: [{ task: 't1', project: 'p1' }],
			left: [],
			created_next: ['p1'],
		})),
		listBacklog: vi.fn(async () => ({
			scope: 'web',
			backlog_section: 'Backlog',
			backlog_section_missing: [],
			tasks: [],
			count: 0,
		})),
		...overrides,
	} as unknown as ScrumApi
}

function program(api: ScrumApi) {
	const p = new Command().addCommand(sprintCommand(() => api)).addCommand(backlogCommand(() => api))
	p.option('--json').option('--toon')
	installUsageErrors(p)
	return p
}

describe('sprint and backlog commands', () => {
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

	it('sprint current prints the sprint, its dates, and next steps', async () => {
		const out = await run(fakeApi(), 'sprint', 'current')
		expect(out).toContain('Sprint 2')
		expect(out).toContain('2026-01-19')
		expect(out).toMatch(/next/i)
	})

	it('passes --scope through, and --json prints the api result', async () => {
		const api = fakeApi()
		const out = await run(api, '--json', 'sprint', 'current', '--scope', 'web')
		expect(api.currentSprint).toHaveBeenCalledWith({ scope: 'web' }, { configPath: undefined, repo: undefined })
		expect(JSON.parse(out).sprint.name).toBe('Sprint 2')
	})

	it('sprint list shows a table and a count', async () => {
		const out = await run(fakeApi(), 'sprint', 'list')
		expect(out).toContain('Sprint 2')
		expect(out).toContain('1 sprint(s)')
	})

	it('sprint tasks passes --sprint and --incomplete and prints counts', async () => {
		const api = fakeApi()
		const out = await run(api, 'sprint', 'tasks', '--sprint', 'previous', '--incomplete')
		expect(api.sprintTasks).toHaveBeenCalledWith(
			{ sprint: 'previous', incomplete: true },
			{ configPath: undefined, repo: undefined },
		)
		expect(out).toContain('Do it')
		expect(out).toContain('1 task(s)')
	})

	it('sprint tasks names an empty sprint', async () => {
		const api = fakeApi({
			sprintTasks: vi.fn(async () => ({ scope: 'web', sprint, tasks: [], count: { total: 0, completed: 0, open: 0 } })),
		} as never)
		expect(await run(api, 'sprint', 'tasks')).toContain('0 tasks found')
	})

	it('sprint add takes task GIDs', async () => {
		const api = fakeApi()
		const out = await run(api, 'sprint', 'add', 't1', 't2', '--sprint', 'next')
		expect(api.addToSprint).toHaveBeenCalledWith(
			{ tasks: ['t1', 't2'], sprint: 'next' },
			{ configPath: undefined, repo: undefined },
		)
		expect(out).toContain('t1')
	})

	it('sprint start says when the sprint already existed', async () => {
		const api = fakeApi({
			startSprint: vi.fn(async () => ({
				scope: 'web',
				sprint,
				created: [],
				existing: ['p1'],
				already_started: true,
			})),
		} as never)
		expect(await run(api, 'sprint', 'start')).toMatch(/already started/i)
	})

	it('sprint close reports what moved and where', async () => {
		const out = await run(fakeApi(), 'sprint', 'close')
		expect(out).toContain('Sprint 3')
		expect(out).toMatch(/1 task\(s\) moved/)
	})

	it('backlog list names an empty backlog', async () => {
		expect(await run(fakeApi(), 'backlog', 'list')).toContain('0 tasks found')
	})

	it('backlog list warns about a missing backlog section', async () => {
		const api = fakeApi({
			listBacklog: vi.fn(async () => ({
				scope: 'web',
				backlog_section: 'Backlog',
				backlog_section_missing: ['p1'],
				tasks: [],
				count: 0,
			})),
		} as never)
		expect(await run(api, 'backlog', 'list')).toContain('section create "Backlog"')
	})
})
