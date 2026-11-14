import { describe, expect, it, vi } from 'vitest'
import type { LoadedScopes, ScopeStore } from '../config/scope-store.js'
import type { ScopeEntry } from '../config/scopes.js'
import { createSprintWorld, type WorldTask } from '../testing/sprint-world.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY, type ScrumPolicy } from './policy.js'
import { formatCommitment } from './reports/commitment.js'

const web: ScopeEntry = { name: 'web', kind: 'project', projects: ['p1'], default: true }
const fields = { p1: { story_points: { gid: 'S', name: 'Story' }, task_points: { gid: 'T', name: 'Task' } } }

const t = (gid: string, o: Record<string, unknown> = {}, story = 0, task = 0): WorldTask =>
	({
		gid,
		name: `task ${gid}`,
		completed: false,
		created_at: '2026-01-01T00:00:00Z',
		custom_fields: [
			{ gid: 'S', number_value: story },
			{ gid: 'T', number_value: task },
		],
		...o,
	}) as WorldTask
const done = (gid: string, at: string, story = 0, task = 0) =>
	t(gid, { completed: true, completed_at: at }, story, task)

type Status = { gid?: string; created_at?: string; text?: string }

function setup(
	opts: {
		sections?: Array<{ name: string; tasks?: WorldTask[] }>
		policy?: Partial<ScrumPolicy>
		now?: string
		statuses?: Status[]
		stories?: Record<string, unknown[]>
		noHistory?: boolean
	} = {},
) {
	const world = createSprintWorld({
		p1: opts.sections ?? [
			{ name: 'Backlog' },
			{
				name: 'Sprint 1',
				tasks: [done('v1', '2026-01-08T00:00:00Z', 5, 1), done('v2', '2026-01-09T00:00:00Z', 3)],
			},
			{
				name: 'Sprint 2',
				tasks: [done('a', '2026-01-20T10:00:00Z', 3), t('c', {}, 5), t('d', {}, 0, 1)],
			},
		],
	})
	const store: ScopeStore = {
		load: async (): Promise<LoadedScopes> => ({ scopes: [web], sources: {}, fields }),
		add: vi.fn(),
		remove: vi.fn(),
	}
	const listStatuses = vi.fn(async () => opts.statuses ?? [])
	const createStatus = vi.fn(async (_parent: string, f: { title?: string }) => ({ gid: 'st1', ...f }))
	const listStories = vi.fn(async (gid: string) => opts.stories?.[gid] ?? [])
	const api = createScrumApi({
		store: () => store,
		gateways: {
			portfolios: { listPortfolioItems: vi.fn(async () => []) },
			tasks: { listTasks: vi.fn(async () => []) },
		},
		sprint: {
			...world.gateways,
			users: { getMe: vi.fn(async () => ({ gid: 'u1', time_zone: 'UTC' })), getUser: vi.fn() } as never,
		},
		dependencies: { getDependencies: vi.fn(async () => []) },
		...(!opts.noHistory && {
			history: { statuses: { listStatuses, createStatus } as never, stories: { listStories } as never },
		}),
		loadPolicy: async () => ({
			...DEFAULT_SCRUM_POLICY,
			sprint_anchor_date: '2026-01-05',
			sprint_length_days: 14,
			...opts.policy,
		}),
		now: () => new Date(opts.now ?? '2026-01-21T12:00:00Z'),
	})
	return { api, world, listStatuses, createStatus, listStories }
}

// sprint_length 14 from 2026-01-05 → Sprint 1 = 01-05..01-18 would make "now" 01-21 sprint 2.
const snapshot = (n: number, name: string, tasks: Array<[string, number, number]>, at = '2026-01-19T09:00:00Z') => ({
	created_at: at,
	text: formatCommitment(
		{ n, name },
		tasks.map(([gid, story, task]) => ({ gid, name: gid, story, task })),
	).text,
})

describe('scrum api: report sprint', () => {
	it('reads the commitment snapshot back and compares it with the sprint now', async () => {
		const { api, listStatuses } = setup({
			statuses: [
				snapshot(2, 'Sprint 2', [
					['a', 3, 0],
					['c', 5, 0],
					['gone', 2, 0],
				]),
			],
		})
		const r = await api.reportSprint({})
		expect(listStatuses).toHaveBeenCalledWith('p1', expect.objectContaining({ fetchAll: true }))
		expect(r.committed).toMatchObject({ source: 'snapshot', count: 3, points: { story: 10, task: 0 } })
		expect(r.completed.count).toBe(1)
		expect(r.added.tasks.map((x) => x.gid)).toEqual(['d'])
		expect(r.removed?.tasks.map((x) => x.gid)).toEqual(['gone'])
		expect(r.carry_over_candidates.map((x) => x.gid)).toEqual(['c', 'd'])
		expect(r.scope).toBe('web')
	})

	it('rebuilds the commitment from stories when no snapshot exists, and cannot name removed tasks', async () => {
		const join = (at: string) => [
			{ resource_subtype: 'section_changed', created_at: at, text: 'moved this Task from "Backlog" to "Sprint 2"' },
		]
		const { api } = setup({
			stories: { a: join('2026-01-19T09:00:00Z'), c: join('2026-01-19T10:00:00Z'), d: join('2026-01-21T09:00:00Z') },
		})
		const r = await api.reportSprint({})
		expect(r.committed.source).toBe('rebuilt')
		expect(r.committed.tasks.map((x) => x.gid)).toEqual(['a', 'c'])
		expect(r.added.tasks.map((x) => x.gid)).toEqual(['d'])
		expect(r.removed).toBeNull()
	})

	it('names the gap when the history gateways are not wired', async () => {
		const { api } = setup({ noHistory: true })
		const r = await api.reportSprint({})
		expect(r.committed.source).toBe('unavailable')
		expect(r.notes.join(' ')).toMatch(/snapshot/i)
	})

	it('fails with sprint-none for a sprint that has no section', async () => {
		const { api } = setup()
		await expect(api.reportSprint({ sprint: '9' })).rejects.toMatchObject({ code: 'sprint-none' })
	})
})

describe('scrum api: report retro', () => {
	it('reads blocked time from the stories of the sprint tasks', async () => {
		const { api, listStories } = setup({
			policy: { blocked_signals: ['tag:Blocked'] },
			statuses: [
				snapshot(2, 'Sprint 2', [
					['a', 3, 0],
					['c', 5, 0],
				]),
			],
			stories: {
				c: [{ resource_subtype: 'added_to_tag', created_at: '2026-01-21T00:00:00Z', text: 'added tag Blocked' }],
			},
		})
		const r = await api.reportRetro({})
		expect(listStories).toHaveBeenCalledWith('c', expect.objectContaining({ fetchAll: true }))
		expect(r.blocked.tasks).toEqual([{ gid: 'c', name: 'task c', hours: 12, open: true }])
		expect(r.carry_over.map((x) => x.gid)).toEqual(['c', 'd'])
		expect(r.estimate_vs_actual?.tasks.map((x) => x.gid)).toEqual(['a'])
	})
})

describe('scrum api: report velocity', () => {
	it('sums the points each closed sprint completed, per kind, over the window', async () => {
		const { api } = setup()
		const r = await api.reportVelocity({})
		expect(r.window).toBe(3)
		expect(r.sprints).toEqual([{ n: 1, name: 'Sprint 1', completed: { count: 2, points: { story: 8, task: 1 } } }])
		expect(r.mean).toEqual({ count: 2, story: 8, task: 1 })
		expect(r.notes.join(' ')).toMatch(/1 closed sprint/)
	})
})

describe('scrum api: sprint start with a commitment snapshot', () => {
	it('posts the committed tasks and points as a status update', async () => {
		const { api, createStatus } = setup()
		const r = await api.startSprint({ snapshot: true })
		expect(createStatus).toHaveBeenCalledTimes(1)
		const [parent, body] = createStatus.mock.calls[0] as unknown as [
			string,
			{ title: string; text: string; status_type: string },
		]
		expect(parent).toBe('p1')
		expect(body.title).toBe('Sprint 2 started')
		expect(body.text).toContain('3 tasks, 8 story points, 1 task points')
		expect(r.snapshot).toEqual({ posted: ['p1'], existing: [] })
	})

	it('posts nothing when a snapshot is already there', async () => {
		const { api, createStatus } = setup({ statuses: [snapshot(2, 'Sprint 2', [['a', 3, 0]])] })
		const r = await api.startSprint({ snapshot: true })
		expect(createStatus).not.toHaveBeenCalled()
		expect(r.snapshot).toEqual({ posted: [], existing: ['p1'] })
	})

	it('does not touch status updates unless asked', async () => {
		const { api, createStatus, listStatuses } = setup()
		const r = await api.startSprint({})
		expect(createStatus).not.toHaveBeenCalled()
		expect(listStatuses).not.toHaveBeenCalled()
		expect(r.snapshot).toBeUndefined()
	})
})
