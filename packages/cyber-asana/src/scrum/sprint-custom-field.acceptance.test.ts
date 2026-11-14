import { describe, vi } from 'vitest'
import type { LoadedScopes, ScopeStore } from '../config/scope-store.js'
import { createFieldSprintWorld } from '../testing/field-sprint-world.js'
import { createSprintWorld } from '../testing/sprint-world.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY } from './policy.js'
import { defineSprintCustomFieldAcceptanceSpecs } from './sprint-custom-field.acceptance.js'

function setup() {
	const field = createFieldSprintWorld({ attached: ['p1'] })
	const sections = createSprintWorld({ p1: [] })
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
		sprint: {
			...sections.gateways,
			users: { getMe: vi.fn(async () => ({ gid: 'u' })) as never, getUser: vi.fn() as never },
			fieldModel: field.gateways as never,
		},
		dependencies: { getDependencies: vi.fn(async () => []) },
		loadPolicy: async () => ({
			...DEFAULT_SCRUM_POLICY,
			sprint_anchor_date: '2026-01-05',
			sprint_model: 'custom-field',
		}),
		now: () => new Date('2026-01-20T12:00:00Z'),
	})
	let next = 1
	return {
		api,
		createTask: async (name: string) => {
			const gid = `new${next++}`
			field.tasks.push({ gid, name, projects: ['p1'] })
			return gid
		},
		sprintOf: async (gid: string) => field.taskNamed(gid)?.sprint,
		deleteTask: async (gid: string) => {
			const at = field.tasks.findIndex((t) => t.gid === gid)
			if (at >= 0) field.tasks.splice(at, 1)
		},
		disableOptions: async (names: string[]) => {
			for (const o of field.options) if (names.includes(o.name)) o.enabled = false
		},
	}
}

const fixture = setup()

describe(
	'scrum/sprint custom-field acceptance',
	defineSprintCustomFieldAcceptanceSpecs({ getApi: () => fixture.api, ...fixture }),
)
