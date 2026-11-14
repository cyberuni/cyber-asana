import { describe, expect, it, vi } from 'vitest'
import type { LoadedScopes, ScopeStore } from '../config/scope-store.js'
import type { ScopeEntry } from '../config/scopes.js'
import { createFieldSprintWorld } from '../testing/field-sprint-world.js'
import { createSprintWorld } from '../testing/sprint-world.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY } from './policy.js'

const platform: ScopeEntry = { name: 'platform', kind: 'projects', projects: ['p1', 'p2'], default: true }
const growth: ScopeEntry = { name: 'growth', kind: 'portfolio', portfolio: '9', default: true }

function setup(
	opts: { scope?: ScopeEntry; premium?: boolean; attached?: string[]; fields?: LoadedScopes['fields'] } = {},
) {
	const field = createFieldSprintWorld({
		options: ['Sprint 1', 'Sprint 2'],
		attached: opts.attached ?? ['p1', 'p2'],
		premium: opts.premium ?? true,
		tasks: [
			{ gid: 't1', projects: ['p1'] },
			{ gid: 't2', projects: ['p1'], sprint: 'Sprint 2' },
			{ gid: 't3', projects: ['p2'], sprint: 'Sprint 2', completed: true },
		],
	})
	const sections = createSprintWorld({ p1: [], p2: [] })
	const store: ScopeStore = {
		load: async (): Promise<LoadedScopes> => ({
			scopes: [opts.scope ?? platform],
			sources: {},
			...(opts.fields && { fields: opts.fields }),
		}),
		add: vi.fn(),
		remove: vi.fn(),
	}
	const api = createScrumApi({
		store: () => store,
		gateways: {
			portfolios: {
				listPortfolioItems: vi.fn(async () => [
					{ gid: 'p1', resource_type: 'project' },
					{ gid: 'p2', resource_type: 'project' },
				]) as never,
			},
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
	return { api, field }
}

describe('scrum api: custom-field sprint model', () => {
	it('reports the current sprint as an option of the Sprint field', async () => {
		const { api, field } = setup()
		const current = await api.currentSprint({})
		expect(current.sprint.name).toBe('Sprint 2')
		expect(current.projects).toEqual([
			{ gid: 'p1', section_gid: field.optionNamed('Sprint 2')?.gid },
			{ gid: 'p2', section_gid: field.optionNamed('Sprint 2')?.gid },
		])
	})

	it('works for a portfolio scope, which the sections model does not support', async () => {
		const { api } = setup({ scope: growth })
		expect((await api.sprintTasks({})).tasks.map((t) => t.gid)).toEqual(['t2', 't3'])
	})

	it('hands the registered Sprint field to the model without discovering it', async () => {
		const { api, field } = setup({
			fields: { p1: { sprint: { gid: 'f1', name: 'Sprint' } }, p2: { sprint: { gid: 'f1', name: 'Sprint' } } },
		})
		await api.currentSprint({})
		expect(field.gateways.customFields.listCustomFieldSettingsForProject).not.toHaveBeenCalled()
	})

	it('starts, fills, and closes a sprint through the field, and a repeat start is a no-op', async () => {
		const { api, field } = setup()
		const started = await api.startSprint({ sprint: 'next' })
		expect(started.sprint.name).toBe('Sprint 3')
		expect(started.already_started).toBe(false)
		expect((await api.startSprint({ sprint: 'next' })).already_started).toBe(true)

		const added = await api.addToSprint({ tasks: ['t1'], sprint: 'next' })
		expect(added.added).toEqual([{ task: 't1', project: 'p1' }])
		expect(field.taskNamed('t1')?.sprint).toBe('Sprint 3')

		const closed = await api.closeSprint({})
		expect(closed.moved.map((m) => m.task)).toEqual(['t2'])
		expect(field.taskNamed('t2')?.sprint).toBe('Sprint 3')
	})

	it('lists the backlog as tasks with no Sprint value, without a backlog section', async () => {
		const { api } = setup()
		const backlog = await api.listBacklog({})
		expect(backlog.tasks.map((t) => t.gid)).toEqual(['t1'])
		expect(backlog.backlog_section_missing).toEqual([])
	})

	it('says an option, not a section, is missing when a sprint has not started', async () => {
		const { api } = setup()
		await expect(api.sprintTasks({ sprint: 'next' })).rejects.toMatchObject({
			code: 'sprint-none',
			message: expect.stringContaining('option'),
		})
	})

	it('fails with premium-required on a free workspace', async () => {
		const { api } = setup({ premium: false })
		await expect(api.sprintTasks({})).rejects.toMatchObject({ code: 'premium-required' })
	})

	it('fails with sprint-field-missing when no project has the field', async () => {
		const { api } = setup({ attached: [] })
		await expect(api.currentSprint({})).rejects.toMatchObject({ code: 'sprint-field-missing' })
	})
})
