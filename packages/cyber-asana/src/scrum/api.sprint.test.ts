import { describe, expect, it, vi } from 'vitest'
import type { LoadedScopes, ScopeStore } from '../config/scope-store.js'
import type { ScopeEntry } from '../config/scopes.js'
import { createSprintWorld } from '../testing/sprint-world.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY, type ScrumPolicy } from './policy.js'

const web: ScopeEntry = { name: 'web', kind: 'project', projects: ['p1'], default: true }

function setup(opts: { scopes?: ScopeEntry[]; policy?: Partial<ScrumPolicy>; now?: string; timeZone?: string } = {}) {
	const world = createSprintWorld({
		p1: [
			{ name: 'Backlog', tasks: [{ gid: 't1' }] },
			{ name: 'Sprint 2', tasks: [{ gid: 't2' }, { gid: 't3', completed: true }] },
		],
	})
	const store: ScopeStore = {
		load: async (): Promise<LoadedScopes> => ({ scopes: opts.scopes ?? [web], sources: {} }),
		add: vi.fn(),
		remove: vi.fn(),
	}
	const api = createScrumApi({
		store: () => store,
		gateways: {
			portfolios: { listPortfolioItems: vi.fn(async () => []) },
			tasks: { listTasks: vi.fn(async () => []) },
		},
		sprint: {
			...world.gateways,
			users: {
				getMe: vi.fn(async () => ({ gid: 'u', ...(opts.timeZone && { time_zone: opts.timeZone }) })),
				getUser: vi.fn(),
			} as never,
		},
		dependencies: { getDependencies: vi.fn(async () => []) },
		loadPolicy: async () => ({ ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05', ...opts.policy }),
		now: () => new Date(opts.now ?? '2026-01-20T12:00:00Z'),
	})
	return { api, world }
}

describe('scrum api: sprints', () => {
	it('reports the current sprint from the policy and the projects that hold its section', async () => {
		const { api } = setup()
		const current = await api.currentSprint({})
		expect(current.sprint).toEqual({ n: 2, name: 'Sprint 2', start: '2026-01-19', end: '2026-02-01', working_days: 10 })
		expect(current.today).toBe('2026-01-20')
		expect(current.projects).toEqual([{ gid: 'p1', section_gid: expect.any(String) }])
		expect(current.missing).toEqual([])
	})

	it("reads today in the user's Asana timezone and says where the timezone came from", async () => {
		const { api } = setup({ now: '2026-01-18T20:00:00Z', timeZone: 'Asia/Tokyo' })
		const current = await api.currentSprint({})
		expect(current.today).toBe('2026-01-19')
		expect(current.timezone).toBe('Asia/Tokyo')
		expect(current.timezone_source).toBe('asana')
		expect(current.sprint.n).toBe(2)
	})

	it('falls back to the machine timezone when Asana reports none', async () => {
		const { api } = setup()
		expect((await api.currentSprint({})).timezone_source).toBe('machine')
	})

	it('fails with sprint-none before the anchor date', async () => {
		const { api } = setup({ now: '2026-01-01T12:00:00Z' })
		await expect(api.currentSprint({})).rejects.toMatchObject({ code: 'sprint-none' })
	})

	it('fails with sprint-none, and says how to start one, when no project has the sprint section', async () => {
		const { api } = setup({ now: '2026-02-03T12:00:00Z' })
		await expect(api.currentSprint({})).rejects.toMatchObject({
			code: 'sprint-none',
			hint: expect.stringContaining('sprint start'),
		})
	})

	it('fails with policy-incomplete when no anchor date is set', async () => {
		const { api } = setup({ policy: { sprint_anchor_date: undefined as never } })
		await expect(api.currentSprint({})).rejects.toMatchObject({ code: 'policy-incomplete' })
	})

	it('stops with model-unsupported for a model the CLI does not build in', async () => {
		const { api } = setup({ policy: { sprint_model: 'tags' } })
		await expect(api.currentSprint({})).rejects.toMatchObject({
			code: 'model-unsupported',
			message: expect.stringContaining('tags'),
		})
	})

	it('stops with model-unsupported for a portfolio scope under the sections model', async () => {
		const { api } = setup({ scopes: [{ name: 'g', kind: 'portfolio', portfolio: '9', default: true }] })
		await expect(api.currentSprint({})).rejects.toMatchObject({ code: 'model-unsupported' })
	})

	it('lists sprints with their state', async () => {
		const { api } = setup()
		const listed = await api.listSprints({})
		expect(listed.sprints.map((s) => [s.n, s.state, s.exists])).toEqual([[2, 'current', true]])
	})

	it('lists the sprint tasks with counts', async () => {
		const { api } = setup()
		const result = await api.sprintTasks({})
		expect(result.tasks.map((t) => t.gid)).toEqual(['t2', 't3'])
		expect(result.count).toEqual({ total: 2, completed: 1, open: 1 })
	})

	it('starts the next sprint, and starting it again is a no-op', async () => {
		const { api } = setup()
		const first = await api.startSprint({ sprint: 'next' })
		expect(first.sprint.name).toBe('Sprint 3')
		expect(first.created).toEqual(['p1'])
		expect(first.already_started).toBe(false)
		const again = await api.startSprint({ sprint: 'next' })
		expect(again.already_started).toBe(true)
		expect(again.created).toEqual([])
	})

	it('adds tasks to a sprint', async () => {
		const { api } = setup()
		const result = await api.addToSprint({ tasks: ['t1'] })
		expect(result.added).toEqual([{ task: 't1', project: 'p1', from: 'Backlog' }])
	})

	it('fails when adding to a sprint that has not started', async () => {
		const { api } = setup()
		await expect(api.addToSprint({ tasks: ['t1'], sprint: 'next' })).rejects.toMatchObject({ code: 'sprint-none' })
	})

	it("closes with the policy's carry_over", async () => {
		const { api, world } = setup()
		const closed = await api.closeSprint({})
		expect(closed.carry_over).toBe('move')
		expect(closed.moved).toEqual([{ task: 't2', project: 'p1' }])
		expect(closed.next_sprint.name).toBe('Sprint 3')
		expect(world.world.p1?.find((s) => s.name === 'Sprint 3')?.tasks.map((t) => t.gid)).toEqual(['t2'])
	})

	it('closes with leave: nothing moves', async () => {
		const { api } = setup({ policy: { carry_over: 'leave' } })
		const closed = await api.closeSprint({})
		expect(closed.moved).toEqual([])
		expect(closed.left).toEqual([{ task: 't2', project: 'p1' }])
	})

	it('lists the backlog', async () => {
		const { api } = setup()
		const backlog = await api.listBacklog({})
		expect(backlog.tasks.map((t) => t.gid)).toEqual(['t1'])
		expect(backlog.count).toBe(1)
	})

	it('names a missing backlog section instead of failing', async () => {
		const { api } = setup({ policy: { backlog_section: 'Ideas' } })
		expect((await api.listBacklog({})).backlog_section_missing).toEqual(['p1'])
	})
})
