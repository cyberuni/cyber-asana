import { describe, expect, it, vi } from 'vitest'
import type { LoadedScopes, ScopeStore } from '../config/scope-store.js'
import type { ScopeEntry } from '../config/scopes.js'
import { createSprintWorld, type WorldTask } from '../testing/sprint-world.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY } from './policy.js'
import { type DashboardSettings, parseDashboardSettings } from './reports/dashboard.js'

const web: ScopeEntry = { name: 'web', kind: 'project', projects: ['p1'], default: true }
const fields: LoadedScopes['fields'] = {
	p1: { story_points: { gid: 'S', name: 'Story' }, task_points: { gid: 'T', name: 'Task' } },
}
const me = { gid: 'u1', name: 'Me' }

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

function setup(
	opts: {
		sections?: Array<{ name: string; tasks?: WorldTask[] }>
		settings?: Partial<DashboardSettings> | Record<string, unknown>
		implementations?: Array<{ name: string; pin: string; description: string }>
		noListReports?: boolean
	} = {},
) {
	const world = createSprintWorld({
		p1: opts.sections ?? [{ name: 'Backlog' }, { name: 'Sprint 2', tasks: [open('a'), open('b', { assignee: null })] }],
	})
	const store: ScopeStore = {
		load: async (): Promise<LoadedScopes> => ({ scopes: [web], sources: {}, fields }),
		add: vi.fn(),
		remove: vi.fn(),
	}
	return createScrumApi({
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
		loadPolicy: async () => ({ ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05' }),
		loadDashboardSettings: async () => parseDashboardSettings(opts.settings ?? {}),
		...(!opts.noListReports && { listReports: async () => opts.implementations ?? [] }),
		now: () => new Date('2026-01-21T12:00:00Z'),
	})
}

const impl = (key: string) => ({
	name: `cyber-asana.report.${key}`,
	pin: `cyber-asana.report.${key}`,
	description: key,
})

describe('scrum api: report dashboard', () => {
	it('runs the listed reports in order into one result', async () => {
		const r = await setup({ settings: { reports: ['health', 'velocity', 'sprint'] } }).reportDashboard({})
		expect(r.reports.map((e) => [e.key, e.status])).toEqual([
			['health', 'ok'],
			['velocity', 'ok'],
			['sprint', 'ok'],
		])
		expect(r.scope).toBe('web')
		expect(r.counts).toEqual({ ok: 3, failed: 0, unsupported: 0 })
		const health = r.reports[0]
		expect(health?.status === 'ok' && health.data).toMatchObject({ scope: 'web', counts: { error: 0, warning: 1 } })
	})

	it('runs sprint, health, workload, and velocity by default', async () => {
		const r = await setup().reportDashboard({})
		expect(r.reports.map((e) => e.key)).toEqual(['sprint', 'health', 'workload', 'velocity'])
	})

	it('grades the dashboard from the health findings with status_rules', async () => {
		const r = await setup().reportDashboard({})
		expect(r.status_type).toBe('at_risk')
		expect(r.status_basis).toBe('health: 0 errors, 1 warning')
	})

	it('has no status_type when health is not among the reports, and says why', async () => {
		const r = await setup({ settings: { reports: ['velocity'] } }).reportDashboard({})
		expect(r.status_type).toBeNull()
		expect(r.status_basis).toBe('the health report did not run, so status_rules had nothing to grade')
	})

	it('names a report it does not compute as unsupported, with its reference', async () => {
		const r = await setup({
			settings: { reports: ['release-readiness', 'velocity'] },
			implementations: [impl('release-readiness')],
		}).reportDashboard({})
		expect(r.reports[0]).toMatchObject({
			key: 'release-readiness',
			status: 'unsupported',
			reference: 'cyber-asana.report.release-readiness',
		})
		expect(r.reports[1]?.status).toBe('ok')
		expect(r.counts).toEqual({ ok: 1, failed: 0, unsupported: 1 })
		expect(r.notes.join(' ')).toContain('release-readiness')
	})

	it('names a key no implementation ships as unsupported, never dropping it', async () => {
		const r = await setup({ settings: { reports: ['nope'] } }).reportDashboard({})
		expect(r.reports).toHaveLength(1)
		expect(r.reports[0]).toMatchObject({ key: 'nope', status: 'unsupported' })
		expect((r.reports[0] as { reason: string }).reason).toContain('no cyber-asana.report.nope')
	})

	it('records a report that fails with its code and still runs the rest', async () => {
		const r = await setup({ sections: [{ name: 'Backlog' }] }).reportDashboard({})
		const byKey = Object.fromEntries(r.reports.map((e) => [e.key, e]))
		expect(byKey.sprint).toMatchObject({ status: 'failed', error: { code: 'sprint-none' } })
		expect(byKey.workload).toMatchObject({ status: 'failed', error: { code: 'sprint-none' } })
		expect(byKey.health?.status).toBe('ok')
		expect(byKey.velocity?.status).toBe('ok')
		expect(r.counts).toEqual({ ok: 2, failed: 2, unsupported: 0 })
		expect(r.status_type).toBe('off_track')
	})

	it('passes the sprint to the reports that take one', async () => {
		const r = await setup({ settings: { reports: ['health'] } }).reportDashboard({ sprint: '1' })
		const health = r.reports[0]
		expect(health?.status === 'ok' && (health.data as { sprint: { n: number } }).sprint.n).toBe(1)
	})

	it('fails as a whole with scope-unknown for a scope that is not configured', async () => {
		await expect(setup().reportDashboard({ scope: 'nope' })).rejects.toMatchObject({ code: 'scope-unknown' })
	})

	it('reports the settings it used', async () => {
		const r = await setup({ settings: { reports: ['velocity'], forms: ['cli', 'page'] } }).reportDashboard({})
		expect(r.settings).toMatchObject({ reports: ['velocity'], forms: ['cli', 'page'] })
	})
})
