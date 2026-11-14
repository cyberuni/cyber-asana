import { describe, expect, it, vi } from 'vitest'
import type { LoadedScopes, ScopeStore } from '../config/scope-store.js'
import type { ScopeEntry } from '../config/scopes.js'
import { createSprintWorld } from '../testing/sprint-world.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY, type ScrumPolicy } from './policy.js'

const web: ScopeEntry = { name: 'web', kind: 'project', projects: ['p1'], default: true }
const mine = { gid: 'u1', name: 'Me' }

type Listed = Array<Record<string, unknown> & { gid: string }>

function setup(
	opts: {
		scopes?: ScopeEntry[]
		policy?: Partial<ScrumPolicy>
		now?: string
		listed?: Listed
		sections?: Array<{ name: string; tasks?: Array<{ gid: string }> }>
		fields?: LoadedScopes['fields']
		dependencies?: Record<string, Array<{ gid: string; name?: string; completed?: boolean }>>
	} = {},
) {
	const world = createSprintWorld({
		p1: opts.sections ?? [
			{ name: 'Backlog', tasks: [{ gid: 'back' }] },
			{ name: 'Sprint 2', tasks: [{ gid: 'a' }, { gid: 'b' }] },
		],
	})
	const store: ScopeStore = {
		load: async (): Promise<LoadedScopes> => ({
			scopes: opts.scopes ?? [web],
			sources: {},
			...(opts.fields && { fields: opts.fields }),
		}),
		add: vi.fn(),
		remove: vi.fn(),
	}
	const listTasks = vi.fn(async () => opts.listed ?? [])
	const getUser = vi.fn(async (ref: string) => ({ gid: ref === 'me@x.io' ? 'u9' : ref, name: `User ${ref}` }))
	const api = createScrumApi({
		store: () => store,
		gateways: { portfolios: { listPortfolioItems: vi.fn(async () => []) }, tasks: { listTasks } as never },
		sprint: {
			...world.gateways,
			users: { getMe: vi.fn(async () => ({ ...mine, time_zone: 'UTC' })), getUser } as never,
		},
		dependencies: { getDependencies: vi.fn(async (gid: string) => opts.dependencies?.[gid] ?? []) as never },
		loadPolicy: async () => ({ ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05', ...opts.policy }),
		now: () => new Date(opts.now ?? '2026-01-21T12:00:00Z'),
	})
	return { api, listTasks, getUser }
}

const open = (gid: string, extra: Record<string, unknown> = {}) => ({
	gid,
	name: `task ${gid}`,
	completed: false,
	assignee: mine,
	...extra,
})

describe('scrum api: report standup', () => {
	it('asks Asana for the window once per project, and reports done, today, and the window', async () => {
		const { api, listTasks } = setup({
			listed: [
				open('a'),
				open('b'),
				open('back'),
				{ ...open('done'), completed: true, completed_at: '2026-01-20T09:00:00Z' },
			],
		})
		const report = await api.reportStandup({})
		expect(listTasks).toHaveBeenCalledTimes(1)
		expect(listTasks).toHaveBeenCalledWith(
			'p1',
			expect.objectContaining({ incompleteOrCompletedSince: '2026-01-20T00:00:00.000Z', fetchAll: true }),
		)
		expect(report.member).toEqual({ gid: 'u1', name: 'Me', source: 'me' })
		expect(report.sprint?.name).toBe('Sprint 2')
		expect(report.done.tasks.map((t) => t.gid)).toEqual(['done'])
		// The backlog task is outside the sprint, so Today leaves it out.
		expect(report.today.tasks.map((t) => t.gid)).toEqual(['a', 'b'])
		expect(report.window).toEqual({
			setting: 'previous_working_day',
			from: '2026-01-20',
			since: '2026-01-20T00:00:00.000Z',
		})
		expect(report.today_date).toBe('2026-01-21')
	})

	it('reports for another member, looked up by email or GID', async () => {
		const { api, getUser } = setup({
			listed: [open('a', { assignee: { gid: 'u9', name: 'Other' } }), open('b')],
		})
		const report = await api.reportStandup({ member: 'me@x.io' })
		expect(getUser).toHaveBeenCalledWith('me@x.io', expect.anything())
		expect(report.member).toEqual({ gid: 'u9', name: 'User me@x.io', source: 'member' })
		expect(report.today.tasks.map((t) => t.gid)).toEqual(['a'])
	})

	it('carries on without sprint filters, and says so, when the current sprint has no section', async () => {
		const { api } = setup({
			sections: [{ name: 'Backlog', tasks: [{ gid: 'back' }] }],
			listed: [open('back')],
		})
		const report = await api.reportStandup({})
		expect(report.sprint).toBeNull()
		expect(report.sprint_note).toContain('Sprint 2')
		expect(report.today.tasks.map((t) => t.gid)).toEqual(['back'])
	})

	it('carries on when no sprint_anchor_date is set', async () => {
		const { api } = setup({ policy: { sprint_anchor_date: undefined as never }, listed: [open('a')] })
		const report = await api.reportStandup({})
		expect(report.sprint).toBeNull()
		expect(report.sprint_note).toContain('sprint_anchor_date')
	})

	it('carries on before the anchor date', async () => {
		const { api } = setup({ now: '2026-01-01T12:00:00Z', listed: [open('a')] })
		const report = await api.reportStandup({})
		expect(report.sprint).toBeNull()
		expect(report.sprint_note).toContain('before')
	})

	it('fails with sprint-none when an explicitly named sprint has no section', async () => {
		const { api } = setup({ listed: [] })
		await expect(api.reportStandup({ sprint: '5' })).rejects.toMatchObject({ code: 'sprint-none' })
	})

	it('reads points and the status field from the fields registered for the scope', async () => {
		const { api } = setup({
			policy: { state_carrier: 'field' },
			fields: {
				p1: {
					story_points: { gid: 'f-story', name: 'Story Points' },
					status: { gid: 'f-status', name: 'Status' },
				},
			},
			listed: [
				open('a', {
					custom_fields: [
						{ gid: 'f-status', enum_value: { name: 'In Progress' } },
						{ gid: 'f-story', number_value: 3 },
					],
				}),
				open('b'),
			],
		})
		const report = await api.reportStandup({})
		expect(report.today.tasks.map((t) => t.gid)).toEqual(['a'])
		expect(report.today.points).toEqual({ story: 3, task: 0 })
		expect(report.points_tracked).toEqual({ story: true, task: false })
	})

	it('names the blocker of a task that depends on an open task', async () => {
		const { api } = setup({
			listed: [open('a')],
			dependencies: { a: [{ gid: 'd', name: 'upstream', completed: false }] },
		})
		const report = await api.reportStandup({})
		expect(report.blocked.tasks[0]?.blockers).toEqual([{ signal: 'dependency', task: { gid: 'd', name: 'upstream' } }])
	})

	it('rejects the team form until it is built', async () => {
		const { api } = setup()
		await expect(api.reportStandup({ team: true })).rejects.toMatchObject({ code: 'team-unsupported' })
	})
})
