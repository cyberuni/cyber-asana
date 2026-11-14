import { describe, expect, it, vi } from 'vitest'
import type { LoadedScopes, ScopeStore } from '../config/scope-store.js'
import type { ScopeEntry } from '../config/scopes.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY } from './policy.js'

function memoryStore(initial: ScopeEntry[] = [], defaultProject?: { gid: string; name: string }) {
	let scopes = initial
	const store: ScopeStore = {
		async load(): Promise<LoadedScopes> {
			return {
				scopes,
				sources: Object.fromEntries(scopes.map((s) => [s.name.toLowerCase(), 'repo' as const])),
				...(defaultProject && { defaultProject }),
			}
		},
		add: vi.fn(async (entry: ScopeEntry, target) => {
			scopes = [...scopes.filter((s) => s.name !== entry.name), entry]
			return { path: '/repo.json', target }
		}),
		remove: vi.fn(async (name: string) => {
			scopes = scopes.filter((s) => s.name !== name)
			return { path: '/repo.json', target: 'repo' as const }
		}),
	}
	return store
}

function setup(store: ScopeStore, tasks: Record<string, Array<{ gid: string }>> = {}) {
	return createScrumApi({
		store: () => store,
		gateways: {
			portfolios: {
				listPortfolioItems: vi.fn(async () => [{ gid: '9', name: 'P', resource_type: 'project' }] as never),
			},
			tasks: { listTasks: vi.fn(async (gid: string) => (tasks[gid] ?? []) as never) },
		},
		loadPolicy: async () => ({ ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05' }),
	})
}

const web: ScopeEntry = { name: 'web', kind: 'project', projects: ['1201'], default: true }

describe('scrum api: scopes', () => {
	it('lists scopes with where each came from', async () => {
		const api = setup(memoryStore([web]))
		expect(await api.listScopes()).toEqual({ scopes: [{ ...web, source: 'repo' }] })
	})

	it('lists the implicit scope, marked as such, when only a default project exists', async () => {
		const api = setup(memoryStore([], { gid: '1201', name: 'Web' }))
		expect(await api.listScopes()).toEqual({
			scopes: [],
			implicit: { name: 'Web', kind: 'project', projects: ['1201'] },
		})
	})

	it('adds a scope to the repo by default and to the global registry on request', async () => {
		const store = memoryStore()
		const api = setup(store)
		expect(await api.addScope(web)).toEqual({ scope: web, path: '/repo.json', target: 'repo' })
		await api.addScope({ name: 'mine', kind: 'project', projects: ['2'] }, { global: true })
		expect(store.add).toHaveBeenLastCalledWith({ name: 'mine', kind: 'project', projects: ['2'] }, 'global')
	})

	it('removes a scope', async () => {
		const store = memoryStore([web])
		expect(await setup(store).removeScope('web')).toEqual({ removed: 'web', path: '/repo.json', target: 'repo' })
	})
})

describe('scrum api: resolveScope', () => {
	it('resolves the default scope to its projects with the sprint settings the scope overrides', async () => {
		const api = setup(memoryStore([{ ...web, sprint_length_days: 7 }]))
		expect(await api.resolveScope({})).toEqual({
			scope: { ...web, sprint_length_days: 7 },
			implicit: false,
			projects: [{ gid: '1201' }],
			sprint: { sprint_model: 'sections', sprint_length_days: 7, sprint_anchor_date: '2026-01-05' },
		})
	})

	it('selects by name', async () => {
		const api = setup(memoryStore([web, { name: 'platform', kind: 'projects', projects: ['1', '2'] }]))
		const resolved = await api.resolveScope({ scope: 'platform' })
		expect(resolved.projects).toEqual([{ gid: '1' }, { gid: '2' }])
	})

	it('resolves the implicit scope from the default project', async () => {
		const api = setup(memoryStore([], { gid: '1201', name: 'Web' }))
		const resolved = await api.resolveScope({})
		expect(resolved).toMatchObject({
			implicit: true,
			scope: { name: 'Web', kind: 'project' },
			projects: [{ gid: '1201' }],
		})
	})

	it('follows a portfolio scope through the portfolio gateway', async () => {
		const api = setup(memoryStore([{ name: 'growth', kind: 'portfolio', portfolio: '1300' }]))
		expect((await api.resolveScope({ scope: 'growth' })).projects).toEqual([{ gid: '9', name: 'P' }])
	})

	it('adds the scope tasks, each counted once, only when asked', async () => {
		const api = setup(memoryStore([{ name: 'p', kind: 'projects', projects: ['1', '2'] }]), {
			'1': [{ gid: 't1' }, { gid: 't2' }],
			'2': [{ gid: 't2' }, { gid: 't3' }],
		})
		expect(await api.resolveScope({ scope: 'p' })).not.toHaveProperty('tasks')
		const withTasks = await api.resolveScope({ scope: 'p', tasks: true })
		expect(withTasks.tasks?.map((t) => t.gid)).toEqual(['t1', 't2', 't3'])
	})

	it('stops with scope-unknown for a scope that does not exist', async () => {
		await expect(setup(memoryStore([web])).resolveScope({ scope: 'nope' })).rejects.toMatchObject({
			code: 'scope-unknown',
		})
	})

	it('stops with scope-missing when nothing selects a scope', async () => {
		await expect(setup(memoryStore()).resolveScope({})).rejects.toMatchObject({ code: 'scope-missing' })
	})
})
