import { describe, expect, it, vi } from 'vitest'
import type { LoadedScopes, ScopeStore } from '../config/scope-store.js'
import type { ScopeEntry } from '../config/scopes.js'
import { createSprintWorld, type WorldTask } from '../testing/sprint-world.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY } from './policy.js'
import type { WorkloadAllocation } from './reports/workload.js'

const web: ScopeEntry = { name: 'web', kind: 'project', projects: ['p1'], default: true }
const fields: LoadedScopes['fields'] = {
	p1: { story_points: { gid: 'S', name: 'Story' }, task_points: { gid: 'T', name: 'Task' } },
}
const me = { gid: 'u1', name: 'Me' }

const t = (gid: string, story = 0, extra: Record<string, unknown> = {}): WorldTask =>
	({
		gid,
		name: `task ${gid}`,
		completed: false,
		created_at: '2026-01-01T00:00:00Z',
		custom_fields: [{ gid: 'S', number_value: story }],
		...extra,
	}) as WorldTask
const done = (gid: string, at: string, story: number) => t(gid, story, { completed: true, completed_at: at })

const planError = () =>
	Object.assign(new Error('402'), { response: { status: 402, body: { errors: [{ message: 'no plan' }] } } })

const allocation: WorkloadAllocation = {
	gid: 'al1',
	assignee: me,
	parent: { gid: 'p1' },
	start_date: '2026-02-02',
	end_date: '2026-02-15',
	effort: { type: 'hours', value: 40 },
}

function setup(opts: { closed?: boolean; allocations?: WorkloadAllocation[] | 'plan' } = {}) {
	const world = createSprintWorld({
		p1: [
			{ name: 'Backlog', tasks: [t('a', 3), t('b', 5), t('c', 2)] },
			...(opts.closed === false
				? []
				: [
						{ name: 'Sprint 1', tasks: [done('v1', '2026-01-08T00:00:00Z', 5), done('v2', '2026-01-09T00:00:00Z', 3)] },
					]),
			{ name: 'Sprint 2', tasks: [t('cur', 1)] },
		],
	})
	const store: ScopeStore = {
		load: async (): Promise<LoadedScopes> => ({ scopes: [web], sources: {}, fields }),
		add: vi.fn(),
		remove: vi.fn(),
	}
	return createScrumApi({
		store: () => store,
		gateways: {
			portfolios: { listPortfolioItems: vi.fn(async () => []) },
			tasks: { listTasks: vi.fn(async () => []) },
		},
		sprint: {
			...world.gateways,
			users: { getMe: vi.fn(async () => ({ ...me, time_zone: 'UTC' })), getUser: vi.fn() } as never,
		},
		dependencies: { getDependencies: vi.fn(async () => []) },
		allocations: {
			listAllocations: vi.fn(async () => {
				if (opts.allocations === 'plan') throw planError()
				return opts.allocations ?? []
			}) as never,
		},
		loadPolicy: async () => ({ ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05' }),
		now: () => new Date('2026-01-21T12:00:00Z'),
	})
}

describe('scrum api: plan a sprint', () => {
	it('plans the next sprint from velocity, capacity, and the backlog top', async () => {
		const r = await setup({ allocations: [allocation] }).planSprint({})
		expect(r.scope).toBe('web')
		expect(r.sprint).toMatchObject({ n: 3, name: 'Sprint 3' })
		expect(r.velocity.mean).toMatchObject({ count: 2, story: 8 })
		expect(r.velocity.sprints).toBe(1)
		expect(r.capacity).toEqual({ status: 'known', hours: 40 })
		expect(r.proposal.tasks).toEqual(['a', 'b'])
		expect(r.backlog.map((x) => x.gid)).toEqual(['a', 'b', 'c'])
	})

	it('can plan the current sprint instead', async () => {
		const r = await setup({ allocations: [] }).planSprint({ sprint: 'current' })
		expect(r.sprint.n).toBe(2)
	})

	it('totals the tasks the user picked against the limits', async () => {
		const r = await setup({ allocations: [allocation] }).planSprint({ tasks: ['a', 'b', 'c'] })
		expect(r.selection?.totals).toMatchObject({ count: 3, story_points: 10 })
		expect(r.selection?.fits).toBe(false)
		expect(r.selection?.against.story_points).toEqual({ total: 10, limit: 8, over: true })
	})

	it('names unknown capacity when no allocation overlaps the sprint', async () => {
		const r = await setup({ allocations: [] }).planSprint({})
		expect(r.capacity).toEqual({ status: 'unknown', hours: null, reason: 'no-allocation' })
	})

	it('names a plan limit (402) as the reason capacity is unknown', async () => {
		const r = await setup({ allocations: 'plan' }).planSprint({})
		expect(r.capacity).toMatchObject({ status: 'unknown', reason: 'plan' })
	})

	it('has no velocity before any sprint closed', async () => {
		const r = await setup({ closed: false, allocations: [allocation] }).planSprint({})
		expect(r.velocity).toEqual({ sprints: 0, mean: null })
		expect(r.proposal.tasks).toEqual(['a', 'b', 'c'])
		expect(r.notes.join(' ')).toContain('no velocity')
	})
})
