import { describe, expect, it, vi } from 'vitest'
import type { LoadedScopes, ScopeStore } from '../config/scope-store.js'
import type { ScopeEntry } from '../config/scopes.js'
import { createSprintWorld, type WorldTask } from '../testing/sprint-world.js'
import { createScrumApi } from './api.js'
import { DEFAULT_SCRUM_POLICY, type ScrumPolicy } from './policy.js'
import { type HealthSettings, parseHealthSettings } from './reports/health.js'

const web: ScopeEntry = { name: 'web', kind: 'project', projects: ['p1'], default: true }
const mine = { gid: 'u1', name: 'Me' }

type Section = { name: string; tasks?: Array<WorldTask & Record<string, unknown>> }

function setup(
	opts: {
		policy?: Partial<ScrumPolicy>
		health?: Partial<HealthSettings>
		now?: string
		sections?: Section[]
		fields?: LoadedScopes['fields']
		dependencies?: Record<string, Array<{ gid: string; name?: string; completed?: boolean }>>
	} = {},
) {
	const world = createSprintWorld({
		p1: opts.sections ?? [
			{ name: 'Backlog', tasks: [{ gid: 'back', name: 'back', completed: false }] },
			{ name: 'Sprint 2', tasks: [{ gid: 'a', name: 'a', completed: false }] },
		],
	})
	const store: ScopeStore = {
		load: async (): Promise<LoadedScopes> => ({
			scopes: [web],
			sources: {},
			...(opts.fields && { fields: opts.fields }),
		}),
		add: vi.fn(),
		remove: vi.fn(),
	}
	const api = createScrumApi({
		store: () => store,
		gateways: { portfolios: { listPortfolioItems: vi.fn(async () => []) }, tasks: { listTasks: vi.fn() } as never },
		sprint: {
			...world.gateways,
			users: { getMe: vi.fn(async () => ({ ...mine, time_zone: 'UTC' })), getUser: vi.fn() } as never,
		},
		dependencies: { getDependencies: vi.fn(async (gid: string) => opts.dependencies?.[gid] ?? []) as never },
		loadPolicy: async () => ({ ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05', ...opts.policy }),
		loadHealthSettings: async () => parseHealthSettings({ ...opts.health }),
		now: () => new Date(opts.now ?? '2026-01-21T12:00:00Z'),
	})
	return { api, world }
}

const open = (gid: string, extra: Record<string, unknown> = {}) => ({
	gid,
	name: `task ${gid}`,
	completed: false,
	assignee: mine,
	modified_at: '2026-01-21T10:00:00Z',
	...extra,
})

describe('scrum api: report health', () => {
	it('checks the current sprint and returns findings with their fix commands', async () => {
		const { api } = setup({
			sections: [
				{ name: 'Sprint 2', tasks: [open('late', { due_on: '2026-01-10' }), open('nobody', { assignee: null })] },
			],
			health: { checks: ['H3', 'H4'] },
		})
		const report = await api.reportHealth({})
		expect(report.sprint?.name).toBe('Sprint 2')
		expect(report.sprint_started).toBe(true)
		expect(report.findings.map((f) => [f.check, f.task?.gid, f.level])).toEqual([
			['H3', 'nobody', 'warning'],
			['H4', 'late', 'error'],
		])
		expect(report.counts).toEqual({ error: 1, warning: 1 })
		expect(report.today_date).toBe('2026-01-21')
		expect(report.settings).toMatchObject({ stale_days: 3 })
	})

	it('reads the points and status fields the scope registers', async () => {
		const { api } = setup({
			sections: [{ name: 'Sprint 2', tasks: [open('a', { custom_fields: [] })] }],
			fields: { p1: { story_points: { gid: 'fs', name: 'Story Points' } } },
			health: { checks: ['H1'] },
		})
		const report = await api.reportHealth({})
		expect(report.findings[0]?.fix).toContain('--custom-field fs=')
	})

	it('H8 is skipped with its reason', async () => {
		const { api } = setup({ health: { checks: ['H8'] } })
		const report = await api.reportHealth({})
		expect(report.checks[0]).toMatchObject({
			id: 'H8',
			status: 'skipped',
			reason: 'capacity unknown: allocations not wired yet',
		})
	})

	it('a missing current-sprint section is the H9 finding, not sprint-none, when H9 is enabled', async () => {
		const { api } = setup({ sections: [{ name: 'Backlog' }] })
		const report = await api.reportHealth({})
		expect(report.sprint_started).toBe(false)
		expect(report.findings.filter((f) => f.check === 'H9')).toHaveLength(1)
		expect(report.findings[0]?.fix).toBe('cyber-asana sprint start --sprint 2 --scope web')
		expect(report.checks.find((c) => c.id === 'H3')?.status).toBe('skipped')
	})

	it('fails with sprint-none when the section is missing and H9 is not enabled', async () => {
		const { api } = setup({ sections: [{ name: 'Backlog' }], health: { checks: ['H3'] } })
		await expect(api.reportHealth({})).rejects.toMatchObject({ code: 'sprint-none' })
	})

	it('fails with sprint-none before the anchor date, even with H9 enabled', async () => {
		const { api } = setup({ now: '2026-01-01T12:00:00Z' })
		await expect(api.reportHealth({})).rejects.toMatchObject({ code: 'sprint-none' })
	})

	it('fails with policy-incomplete when there is no anchor date', async () => {
		const { api } = setup({ policy: { sprint_anchor_date: undefined } })
		await expect(api.reportHealth({})).rejects.toMatchObject({ code: 'policy-incomplete' })
	})

	it('H10 and H11 read every existing sprint', async () => {
		const { api } = setup({
			sections: [
				{ name: 'Sprint 1', tasks: [open('old'), open('dup')] },
				{ name: 'Sprint 2', tasks: [open('dup')] },
			],
			health: { checks: ['H10', 'H11'] },
		})
		const report = await api.reportHealth({})
		expect(report.findings.map((f) => [f.check, f.task?.gid])).toEqual([
			['H10', 'old'],
			['H10', 'dup'],
			['H11', 'dup'],
		])
	})

	it('checks a sprint named with --sprint', async () => {
		const { api } = setup({
			sections: [
				{ name: 'Sprint 1', tasks: [open('nobody', { assignee: null })] },
				{ name: 'Sprint 2', tasks: [] },
			],
			health: { checks: ['H3'] },
		})
		const report = await api.reportHealth({ sprint: 'previous' })
		expect(report.sprint?.name).toBe('Sprint 1')
		expect(report.findings.map((f) => f.task?.gid)).toEqual(['nobody'])
	})

	it('reads blockers through the dependency gateway', async () => {
		const { api } = setup({
			sections: [{ name: 'Sprint 2', tasks: [open('a')] }],
			dependencies: { a: [{ gid: 'x', name: 'upstream', completed: false }] },
			health: { checks: ['H7'] },
		})
		expect((await api.reportHealth({})).findings.map((f) => f.task?.gid)).toEqual(['a'])
	})
})
