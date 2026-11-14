import { describe, vi } from 'vitest'
import type { LoadedScopes, ScopeStore } from '../config/scope-store.js'
import { createSprintWorld } from '../testing/sprint-world.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY } from './policy.js'
import { defineSprintSectionsAcceptanceSpecs } from './sprint-sections.acceptance.js'

function setup() {
	const w = createSprintWorld({ p1: [{ name: 'Untitled section' }] })
	const store: ScopeStore = {
		load: async (): Promise<LoadedScopes> => ({
			scopes: [{ name: 'system', kind: 'project', projects: ['p1'], default: true }],
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
		sprint: { ...w.gateways, users: { getMe: vi.fn(async () => ({ gid: 'u' })), getUser: vi.fn() } as never },
		dependencies: { getDependencies: vi.fn(async () => []) },
		loadPolicy: async () => ({ ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05' }),
		now: () => new Date('2026-01-20T12:00:00Z'),
	})
	let next = 1
	return {
		api,
		createTask: async (name: string) => {
			const gid = `new${next++}`
			w.world.p1?.[0]?.tasks.push({ gid, name })
			return gid
		},
		sectionNameOf: async (taskGid: string) => w.world.p1?.find((s) => s.tasks.some((t) => t.gid === taskGid))?.name,
		deleteTask: async (taskGid: string) => {
			for (const s of w.world.p1 ?? []) s.tasks = s.tasks.filter((t) => t.gid !== taskGid)
		},
		deleteSections: async (names: string[]) => {
			w.world.p1 = (w.world.p1 ?? []).filter((s) => !names.includes(s.name))
		},
	}
}

const fixture = setup()

describe(
	'scrum/sprint sections acceptance',
	defineSprintSectionsAcceptanceSpecs({ getApi: () => fixture.api, ...fixture }),
)
