import { describe, expect, it, vi } from 'vitest'
import type { LoadedScopes, ScopeStore } from '../config/scope-store.js'
import type { ScopeEntry } from '../config/scopes.js'
import { createSprintProjectWorld } from '../testing/sprint-project-world.js'
import { createSprintWorld } from '../testing/sprint-world.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY, type ScrumPolicy } from './policy.js'

const base: ScopeEntry = { name: 'web', kind: 'project', projects: ['backlog'], sprint_portfolio: 'pf1', default: true }

function setup(opts: { scope?: ScopeEntry; policy?: Partial<ScrumPolicy> } = {}) {
	const world = createSprintProjectWorld({
		sprints: { 'Sprint 1': ['t3'], 'Sprint 2': ['t1'] },
		backlog: ['t1', 't2', 't3'],
		tasks: [{ gid: 't1' }, { gid: 't2' }, { gid: 't3', completed: true }],
	})
	const store: ScopeStore = {
		load: async (): Promise<LoadedScopes> => ({ scopes: [opts.scope ?? { ...base }], sources: {} }),
		add: vi.fn(),
		remove: vi.fn(),
	}
	const sections = createSprintWorld({ backlog: [] })
	const api = createScrumApi({
		store: () => store,
		gateways: {
			portfolios: { listPortfolioItems: vi.fn(async () => []) as never },
			tasks: { listTasks: vi.fn(async () => []) },
		},
		sprint: {
			...sections.gateways,
			users: { getMe: vi.fn(async () => ({ gid: 'u' })) as never, getUser: vi.fn() as never },
			projectModel: { ...world.gateways, duplicateProject: world.raw.duplicateProject },
		},
		dependencies: { getDependencies: vi.fn(async () => []) },
		loadPolicy: async () => ({
			...DEFAULT_SCRUM_POLICY,
			sprint_anchor_date: '2026-01-05',
			sprint_model: 'project',
			...opts.policy,
		}),
		now: () => new Date('2026-01-20T12:00:00Z'),
	})
	return { api, world }
}

describe('scrum api: project sprint model', () => {
	it('reports the current sprint as a project, with its GID as section_gid', async () => {
		const { api } = setup()
		const current = await api.currentSprint({})
		expect(current.sprint.name).toBe('Sprint 2')
		expect(current.projects).toEqual([{ gid: 'backlog', section_gid: 'sp-sprint2' }])
	})

	it('lists the sprint tasks and the backlog', async () => {
		const { api } = setup()
		expect((await api.sprintTasks({ sprint: 'current' })).tasks.map((t) => t.gid)).toEqual(['t1'])
		expect((await api.listBacklog({})).tasks.map((t) => t.gid)).toEqual(['t2'])
	})

	it('starts the next sprint, names the project it made, and a repeat is a no-op', async () => {
		const { api, world } = setup()
		const first = await api.startSprint({ sprint: 'next' })
		expect(first.already_started).toBe(false)
		expect(first.sprint_project).toEqual({ gid: 'new1', name: 'Sprint 3' })
		expect(world.portfolio).toContain('new1')
		const again = await api.startSprint({ sprint: 'next' })
		expect(again.already_started).toBe(true)
	})

	it('adds a task by multi-homing it', async () => {
		const { api, world } = setup()
		const result = await api.addToSprint({ sprint: 'current', tasks: ['t2'] })
		expect(result.added).toEqual([{ task: 't2', project: 'backlog' }])
		expect(world.homes('t2')).toEqual(['backlog', 'sp-sprint2'])
	})

	it('closes the sprint, carrying incomplete tasks to the next project', async () => {
		const { api, world } = setup()
		const result = await api.closeSprint({ sprint: 'current' })
		expect(result.moved).toEqual([{ task: 't1', project: 'backlog' }])
		expect(world.homes('t1')).toEqual(['backlog', 'new1'])
	})

	it('takes the backlog project and portfolio from a project or portfolio scope when not named', async () => {
		const { api } = setup({ scope: { name: 'web', kind: 'project', projects: ['backlog'], default: true } })
		await expect(api.currentSprint({})).rejects.toMatchObject({ code: 'scope-incomplete' })
		const portfolioScope = setup({
			scope: { name: 'g', kind: 'portfolio', portfolio: 'pf1', backlog_project: 'backlog', default: true },
		})
		expect((await portfolioScope.api.currentSprint({})).sprint.name).toBe('Sprint 2')
	})

	it('names the missing piece when the scope has no backlog project', async () => {
		const { api } = setup({
			scope: { name: 'p', kind: 'projects', projects: ['a', 'b'], sprint_portfolio: 'pf1', default: true },
		})
		await expect(api.currentSprint({})).rejects.toMatchObject({
			code: 'scope-incomplete',
			message: expect.stringContaining('backlog project'),
		})
	})

	it('accepts state_carrier: sections, which only this model and custom-field allow', async () => {
		const { api } = setup({ policy: { state_carrier: 'sections' } })
		expect((await api.currentSprint({})).sprint.name).toBe('Sprint 2')
	})
})
