import { describe, vi } from 'vitest'
import type { LoadedScopes, ScopeStore } from '../config/scope-store.js'
import { createSprintProjectWorld } from '../testing/sprint-project-world.js'
import { createSprintWorld } from '../testing/sprint-world.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY } from './policy.js'
import { defineSprintProjectAcceptanceSpecs } from './sprint-project.acceptance.js'

function setup() {
	const world = createSprintProjectWorld({ backlog: [], tasks: [] })
	const sections = createSprintWorld({ backlog: [] })
	const store: ScopeStore = {
		load: async (): Promise<LoadedScopes> => ({
			scopes: [{ name: 'system', kind: 'project', projects: ['backlog'], sprint_portfolio: 'pf1', default: true }],
			sources: {},
		}),
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
			...sections.gateways,
			users: { getMe: vi.fn(async () => ({ gid: 'u' })) as never, getUser: vi.fn() as never },
			projectModel: { ...world.gateways, duplicateProject: world.raw.duplicateProject },
		},
		dependencies: { getDependencies: vi.fn(async () => []) },
		loadPolicy: async () => ({ ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05', sprint_model: 'project' }),
		now: () => new Date('2026-01-20T12:00:00Z'),
	})
	let next = 1
	return {
		api,
		createTask: async (name: string) => {
			const gid = `task${next++}`
			world.addTask({ gid, name }, ['backlog'])
			return gid
		},
		homesOf: async (gid: string) => world.homes(gid).map((g) => world.nameOf(g) ?? g),
		deleteTask: async (gid: string) => world.removeTask(gid),
		deleteSprintProjects: async () => {},
	}
}

const fixture = setup()

describe(
	'scrum/sprint project acceptance',
	defineSprintProjectAcceptanceSpecs({ getApi: () => fixture.api, ...fixture }),
)
