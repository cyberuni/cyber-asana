import { describe, expect, it, vi } from 'vitest'
import type { LoadedScopes, ScopeStore } from '../config/scope-store.js'
import type { ScopeEntry } from '../config/scopes.js'
import { createSprintWorld, type WorldTask } from '../testing/sprint-world.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY } from './policy.js'
import { parseDashboardSettings } from './reports/dashboard.js'

const me = { gid: 'u1', name: 'Me' }
const fields: LoadedScopes['fields'] = {
	p1: { story_points: { gid: 'S', name: 'Story' }, task_points: { gid: 'T', name: 'Task' } },
}
const open = (gid: string, extra: Record<string, unknown> = {}): WorldTask =>
	({
		gid,
		name: `task ${gid}`,
		completed: false,
		created_at: '2026-01-01T00:00:00Z',
		assignee: me,
		custom_fields: [{ gid: 'S', number_value: 2 }],
		...extra,
	}) as WorldTask

const TEMPLATE = {
	title: '{sprint} — {status}',
	body: '<body><h2>Health</h2>\n<ul>\n<li><strong>{errors} errors</strong>, {warnings} warnings</li>\n</ul>\n</body>',
}

function setup(
	opts: {
		scope?: ScopeEntry
		settings?: Record<string, unknown>
		template?: typeof TEMPLATE
		noHistory?: boolean
	} = {},
) {
	const scope = opts.scope ?? { name: 'web', kind: 'project', projects: ['p1'], default: true }
	const world = createSprintWorld({
		p1: [{ name: 'Backlog' }, { name: 'Sprint 2', tasks: [open('a'), open('b', { assignee: null })] }],
	})
	const store: ScopeStore = {
		load: async (): Promise<LoadedScopes> => ({ scopes: [scope], sources: {}, fields }),
		add: vi.fn(),
		remove: vi.fn(),
	}
	const createStatus = vi.fn(async (_parent: string, f: Record<string, unknown>) => ({ gid: 'st1', ...f }))
	const api = createScrumApi({
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
		...(!opts.noHistory && {
			history: {
				statuses: { listStatuses: vi.fn(async () => []), createStatus },
				stories: { listStories: vi.fn(async () => []) },
			},
		}),
		loadPolicy: async () => ({ ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05' }),
		loadDashboardSettings: async () => parseDashboardSettings(opts.settings ?? {}),
		loadStatusTemplate: async () => opts.template ?? TEMPLATE,
		now: () => new Date('2026-01-21T12:00:00Z'),
	} as never)
	return { api, createStatus }
}

describe('scrum api: report dashboard --post-status', () => {
	it('posts the rendered update on the scope project with the graded status_type', async () => {
		const { api, createStatus } = setup()
		const r = await api.postDashboardStatus({})
		expect(createStatus).toHaveBeenCalledWith('p1', {
			status_type: 'at_risk',
			title: 'Sprint 2 — At risk',
			html_text: '<body><h2>Health</h2>\n<ul>\n<li><strong>0 errors</strong>, 1 warnings</li>\n</ul>\n</body>',
		})
		expect(r).toMatchObject({
			posted: true,
			dry_run: false,
			parent: { gid: 'p1', type: 'project' },
			status_type: 'at_risk',
			status_update: { gid: 'st1' },
		})
		expect(r.notes.join(' ')).toMatch(/cannot be edited/)
	})

	it('with dryRun returns what would be posted and posts nothing', async () => {
		const { api, createStatus } = setup()
		const r = await api.postDashboardStatus({}, undefined, { dryRun: true })
		expect(createStatus).not.toHaveBeenCalled()
		expect(r).toMatchObject({ posted: false, dry_run: true, title: 'Sprint 2 — At risk' })
		expect(r.html_text).toContain('<h2>Health</h2>')
	})

	it('does not post when health did not run: coded health-required', async () => {
		const { api, createStatus } = setup({ settings: { reports: ['sprint'] } })
		await expect(api.postDashboardStatus({})).rejects.toMatchObject({ code: 'health-required' })
		expect(createStatus).not.toHaveBeenCalled()
	})

	it('refuses a body outside the HTML subset before any post', async () => {
		const { api, createStatus } = setup({ template: { title: 'x', body: '<body><p>{errors}</p></body>' } })
		await expect(api.postDashboardStatus({})).rejects.toMatchObject({ code: 'status-body-invalid' })
		expect(createStatus).not.toHaveBeenCalled()
	})

	it('posts on the portfolio of a portfolio scope', async () => {
		const { api, createStatus } = setup({
			scope: { name: 'web', kind: 'project', projects: ['p1'], sprint_portfolio: 'pf1', default: true },
			settings: { status_parent: 'portfolio' },
		})
		await expect(api.postDashboardStatus({}, undefined, { dryRun: true })).resolves.toMatchObject({
			parent: { gid: 'pf1', type: 'portfolio' },
		})
		expect(createStatus).not.toHaveBeenCalled()
	})

	it('names history-unavailable when the build has no status gateway', async () => {
		const { api } = setup({ noHistory: true })
		await expect(api.postDashboardStatus({})).rejects.toMatchObject({ code: 'history-unavailable' })
	})
})
