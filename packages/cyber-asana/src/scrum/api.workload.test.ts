import { describe, expect, it, vi } from 'vitest'
import type { LoadedScopes, ScopeStore } from '../config/scope-store.js'
import type { ScopeEntry } from '../config/scopes.js'
import { createSprintWorld, type WorldTask } from '../testing/sprint-world.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY, type ScrumPolicy } from './policy.js'
import type { WorkloadAllocation } from './reports/workload.js'

const web: ScopeEntry = { name: 'web', kind: 'project', projects: ['p1'], default: true }
const mine = { gid: 'u1', name: 'Me' }
const bob = { gid: 'u2', name: 'Bob' }
const STORY = 'f-story'
const TASK = 'f-task'
const fields: LoadedScopes['fields'] = {
	p1: { story_points: { gid: STORY, name: 'Story Points' }, task_points: { gid: TASK, name: 'Task Points' } },
}

const open = (gid: string, assignee: { gid: string; name: string } | null, story = 0, taskPts = 0, extra = {}) => ({
	gid,
	name: `task ${gid}`,
	completed: false,
	assignee,
	custom_fields: [
		{ gid: STORY, number_value: story },
		{ gid: TASK, number_value: taskPts },
	],
	...extra,
})

const planError = () =>
	Object.assign(new Error('402'), { response: { status: 402, body: { errors: [{ message: 'no plan' }] } } })

function setup(
	opts: {
		policy?: Partial<ScrumPolicy>
		tasks?: Array<WorldTask & Record<string, unknown>>
		allocations?: WorkloadAllocation[] | 'plan'
		ooo?: Record<string, Array<{ start_date: string; end_date: string }>>
		workspace?: string | undefined
		projectTasks?: Array<Record<string, unknown>>
	} = {},
) {
	const world = createSprintWorld({
		p1: [{ name: 'Backlog' }, { name: 'Sprint 2', tasks: opts.tasks ?? [] }],
	})
	const store: ScopeStore = {
		load: async (): Promise<LoadedScopes> => ({ scopes: [web], sources: {}, fields }),
		add: vi.fn(),
		remove: vi.fn(),
	}
	const listAllocations = vi.fn(async () => {
		if (opts.allocations === 'plan') throw planError()
		return opts.allocations ?? []
	})
	const listOooEntries = vi.fn(async (userGid: string) => opts.ooo?.[userGid] ?? [])
	const listTasks = vi.fn(async () => opts.projectTasks ?? [])
	const api = createScrumApi({
		store: () => store,
		gateways: { portfolios: { listPortfolioItems: vi.fn(async () => []) }, tasks: { listTasks } as never },
		sprint: {
			...world.gateways,
			users: { getMe: vi.fn(async () => ({ ...mine, time_zone: 'UTC' })), getUser: vi.fn() } as never,
		},
		dependencies: { getDependencies: vi.fn(async () => []) as never },
		allocations: { listAllocations: listAllocations as never },
		ooo: { listOooEntries: listOooEntries as never },
		workspaceGid: () => ('workspace' in opts ? opts.workspace : 'w1'),
		loadPolicy: async () => ({ ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05', ...opts.policy }),
		now: () => new Date('2026-01-21T12:00:00Z'),
	})
	return { api, listAllocations, listOooEntries, listTasks }
}

const hours = (type: 'hours' | 'percent', value: number, who = mine): WorkloadAllocation => ({
	gid: `al${value}`,
	assignee: who,
	parent: { gid: 'p1' },
	start_date: '2026-01-19',
	end_date: '2026-02-01',
	effort: { type, value },
})

describe('scrum api reportWorkload', () => {
	it('defaults to the current sprint: open assigned tasks, capacity from the scope projects, clipped to its dates', async () => {
		const { api, listAllocations } = setup({
			tasks: [
				open('a', mine, 3, 1),
				open('b', mine, 2),
				open('c', bob, 0, 4),
				{ ...open('d', mine, 9), completed: true },
			],
			allocations: [hours('percent', 50)],
		})

		const result = await api.reportWorkload({})

		expect(result.sprint).toMatchObject({ n: 2, name: 'Sprint 2' })
		expect(result.window).toEqual({ from: '2026-01-19', to: '2026-02-01' })
		expect(listAllocations).toHaveBeenCalledWith(expect.objectContaining({ parent: 'p1', fetchAll: true }))
		const ann = result.people.find((p) => p.person.gid === 'u1')
		expect(ann).toMatchObject({
			tasks: 2,
			story_points: 5,
			task_points: 1,
			effort_hours: { story: 5, task: 1, total: 6 },
			capacity: { status: 'known', hours: 40 },
			utilization_pct: 15,
			flag: 'under',
		})
		expect(result.people.find((p) => p.person.gid === 'u2')?.capacity).toEqual({
			status: 'unknown',
			reason: 'no-allocation',
		})
		expect(result.settings).toEqual({ over_allocation_pct: 100, under_allocation_pct: 60 })
	})

	it('multiplies both point kinds by hours_per_point and shows the parts', async () => {
		const { api } = setup({ policy: { hours_per_point: 2 }, tasks: [open('a', mine, 3, 1)] })
		const result = await api.reportWorkload({})
		expect(result.people[0]?.effort_hours).toEqual({ story: 6, task: 2, total: 8 })
	})

	it('names a 402 and still shows the load', async () => {
		const { api } = setup({ tasks: [open('a', mine, 3)], allocations: 'plan' })
		const result = await api.reportWorkload({})
		expect(result.people[0]).toMatchObject({
			effort_hours: { total: 3 },
			capacity: { status: 'unknown', reason: 'plan' },
		})
		expect(result.notes.join(' ')).toMatch(/402/)
	})

	it('re-throws an allocation failure that is not a plan limit', async () => {
		const { api, listAllocations } = setup({ tasks: [open('a', mine, 3)] })
		listAllocations.mockRejectedValue(Object.assign(new Error('boom'), { response: { status: 500, body: {} } }))
		await expect(api.reportWorkload({})).rejects.toThrow('boom')
	})

	it('shows out-of-office beside capacity without subtracting it (D9)', async () => {
		const { api, listOooEntries } = setup({
			tasks: [open('a', mine, 4)],
			allocations: [hours('hours', 40)],
			ooo: { u1: [{ start_date: '2026-01-26', end_date: '2026-01-27' }] },
		})
		const result = await api.reportWorkload({})
		expect(listOooEntries).toHaveBeenCalledWith(
			'u1',
			'w1',
			expect.objectContaining({ startDate: '2026-01-19', endDate: '2026-02-01', fetchAll: true }),
		)
		expect(result.people[0]?.ooo).toEqual([{ start_date: '2026-01-26', end_date: '2026-01-27' }])
		expect(result.people[0]?.capacity).toMatchObject({ status: 'known', hours: 40 })
	})

	it('skips out-of-office, saying so, when no workspace is known', async () => {
		const { api, listOooEntries } = setup({ tasks: [open('a', mine, 4)], workspace: undefined })
		const result = await api.reportWorkload({})
		expect(listOooEntries).not.toHaveBeenCalled()
		expect(result.notes.join(' ')).toMatch(/out-of-office.*workspace/i)
	})

	it('fails with sprint-none when the sprint has no section (D12)', async () => {
		const { api } = setup()
		await expect(api.reportWorkload({ sprint: '5' })).rejects.toMatchObject({ code: 'sprint-none' })
	})

	it('takes --from and --to instead: the scope incomplete assigned tasks due in the window, no sprint needed', async () => {
		const { api, listAllocations } = setup({
			policy: { sprint_anchor_date: undefined },
			allocations: [hours('hours', 40)],
			projectTasks: [
				open('in', mine, 3, 0, { due_on: '2026-01-21' }),
				open('late', mine, 8, 0, { due_on: '2026-03-01' }),
				open('undated', mine, 5),
			],
		})

		const result = await api.reportWorkload({ from: '2026-01-19', to: '2026-01-23' })

		expect(result.sprint).toBeNull()
		expect(result.window).toEqual({ from: '2026-01-19', to: '2026-01-23' })
		expect(result.people[0]).toMatchObject({ tasks: 1, story_points: 3 })
		expect(result.notes.join(' ')).toMatch(/1 task.*no due date/)
		expect(listAllocations).toHaveBeenCalled()
	})

	it('rejects a bad window with window-invalid', async () => {
		const { api } = setup()
		await expect(api.reportWorkload({ from: '2026-01-19' })).rejects.toMatchObject({ code: 'window-invalid' })
		await expect(api.reportWorkload({ from: 'soon', to: '2026-01-23' })).rejects.toMatchObject({
			code: 'window-invalid',
		})
		await expect(api.reportWorkload({ from: '2026-02-01', to: '2026-01-23' })).rejects.toMatchObject({
			code: 'window-invalid',
		})
	})
})
