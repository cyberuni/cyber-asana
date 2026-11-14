import { describe, expect, it } from 'vitest'
import { DEFAULT_SCRUM_POLICY, type ScrumPolicy } from '../policy.js'
import { buildHealth, HEALTH_CHECKS, type HealthInput, type HealthTask, parseHealthSettings } from './health.js'

const STORY = 'f-story'
const STATUS = 'f-status'

const NOW = '2026-01-21T12:00:00.000Z'
const DAY = 86_400_000
const ago = (days: number) => new Date(Date.parse(NOW) - days * DAY).toISOString()

function task(gid: string, extra: Partial<HealthTask> = {}): HealthTask {
	return {
		gid,
		name: `Task ${gid}`,
		completed: false,
		assignee: { gid: 'u1', name: 'Ann' },
		modified_at: ago(0),
		num_subtasks: 0,
		custom_fields: [{ gid: STORY, number_value: 2 }],
		...extra,
	}
}

const settings = parseHealthSettings({})

function input(over: Partial<HealthInput> = {}): HealthInput {
	return {
		scope: 'web',
		settings,
		policy: { ...DEFAULT_SCRUM_POLICY },
		today: '2026-01-21',
		now: NOW,
		sprint: { n: 2, name: 'Sprint 2' },
		sprintTasks: [],
		missingProjects: [],
		allSprints: [],
		currentN: 2,
		fields: { story: new Set([STORY]), task: new Set(), status: new Set() },
		dependenciesOf: async () => [],
		...over,
	}
}

const policy = (over: Partial<ScrumPolicy>): ScrumPolicy => ({ ...DEFAULT_SCRUM_POLICY, ...over })

describe('parseHealthSettings', () => {
	it('defaults to every check, stale_days 3, wip_limit 3, overdue_grace_days 0', () => {
		expect(parseHealthSettings({})).toEqual({
			checks: [...HEALTH_CHECKS],
			stale_days: 3,
			wip_limit: 3,
			overdue_grace_days: 0,
		})
	})

	it('reads the keys it is given', () => {
		const s = parseHealthSettings({ checks: ['H1', 'H4'], stale_days: 5, wip_limit: 2, overdue_grace_days: 1 })
		expect(s).toEqual({ checks: ['H1', 'H4'], stale_days: 5, wip_limit: 2, overdue_grace_days: 1 })
	})

	it.each([
		[{ checks: ['H12'] }, /checks/],
		[{ checks: [] }, /checks/],
		[{ checks: ['H1', 'H1'] }, /checks/],
		[{ stale_days: 0 }, /stale_days/],
		[{ wip_limit: 1.5 }, /wip_limit/],
		[{ overdue_grace_days: -1 }, /overdue_grace_days/],
	])('rejects %j', (metadata, message) => {
		expect(() => parseHealthSettings(metadata)).toThrow(message)
	})
})

describe('buildHealth', () => {
	const only = (check: string, over: Partial<HealthInput> = {}) =>
		input({ settings: { ...settings, checks: [check as never] }, ...over })

	it('reports every enabled check as passed when the sprint is clean', async () => {
		const h = await buildHealth(input({ sprintTasks: [task('a')] }))
		expect(h.findings.filter((f) => f.check !== 'H8')).toEqual([])
		expect(h.checks.map((c) => c.id)).toEqual([...HEALTH_CHECKS])
		expect(h.checks.find((c) => c.id === 'H1')?.status).toBe('passed')
	})

	it('H1 flags an incomplete sprint task with no estimate, with a fix command', async () => {
		const h = await buildHealth(only('H1', { sprintTasks: [task('a', { custom_fields: [] }), task('b')] }))
		expect(h.findings).toHaveLength(1)
		expect(h.findings[0]).toMatchObject({ check: 'H1', level: 'warning', task: { gid: 'a' } })
		expect(h.findings[0]?.fix).toContain('task update a --custom-field f-story=')
	})

	it('H1 is skipped, with a reason, when no points field is registered', async () => {
		const h = await buildHealth(
			only('H1', {
				sprintTasks: [task('a', { custom_fields: [] })],
				fields: { story: new Set(), task: new Set(), status: new Set() },
			}),
		)
		expect(h.findings).toEqual([])
		expect(h.checks[0]).toMatchObject({ id: 'H1', status: 'skipped' })
		expect(h.checks[0]?.reason).toMatch(/points field/)
	})

	it('H1 ignores completed tasks and parents (which carry no points)', async () => {
		const h = await buildHealth(
			only('H1', {
				sprintTasks: [
					task('done', { completed: true, custom_fields: [] }),
					task('p', { num_subtasks: 2, custom_fields: [] }),
				],
			}),
		)
		expect(h.findings).toEqual([])
	})

	it('H2 flags a parent task carrying points', async () => {
		const h = await buildHealth(only('H2', { sprintTasks: [task('p', { num_subtasks: 2 }), task('leaf')] }))
		expect(h.findings).toHaveLength(1)
		expect(h.findings[0]).toMatchObject({ check: 'H2', level: 'warning', task: { gid: 'p' } })
	})

	it('H3 flags an unassigned incomplete task', async () => {
		const h = await buildHealth(only('H3', { sprintTasks: [task('a', { assignee: null }), task('b')] }))
		expect(h.findings).toHaveLength(1)
		expect(h.findings[0]).toMatchObject({ check: 'H3', task: { gid: 'a' } })
		expect(h.findings[0]?.fix).toContain('task update a --assignee me')
	})

	it('H4 flags an overdue task as an error, honoring overdue_grace_days', async () => {
		const tasks = [task('late', { due_on: '2026-01-19' }), task('today', { due_on: '2026-01-21' })]
		const h = await buildHealth(only('H4', { sprintTasks: tasks }))
		expect(h.findings.map((f) => [f.task?.gid, f.level])).toEqual([['late', 'error']])
		const graced = await buildHealth(
			only('H4', { sprintTasks: tasks, settings: { ...settings, checks: ['H4'], overdue_grace_days: 2 } }),
		)
		expect(graced.findings).toEqual([])
	})

	it('H5 flags an in-progress task with no change for stale_days', async () => {
		const tasks = [
			task('stale', { modified_at: ago(4), custom_fields: [{ gid: STATUS, enum_value: { name: 'In Progress' } }] }),
			task('fresh', { modified_at: ago(1), custom_fields: [{ gid: STATUS, enum_value: { name: 'In Progress' } }] }),
			task('todo', { modified_at: ago(9), custom_fields: [{ gid: STATUS, enum_value: { name: 'Ready' } }] }),
		]
		const h = await buildHealth(
			only('H5', {
				sprintTasks: tasks,
				policy: policy({ state_carrier: 'field' }),
				fields: { story: new Set(), task: new Set(), status: new Set([STATUS]) },
			}),
		)
		expect(h.findings.map((f) => f.task?.gid)).toEqual(['stale'])
		expect(h.in_progress_basis).toBe('status-field')
	})

	it('with state_carrier none, in progress falls back to incomplete and assigned, and says so', async () => {
		const tasks = [task('a', { modified_at: ago(5) }), task('nobody', { modified_at: ago(5), assignee: null })]
		const h = await buildHealth(only('H5', { sprintTasks: tasks }))
		expect(h.findings.map((f) => f.task?.gid)).toEqual(['a'])
		expect(h.in_progress_basis).toBe('incomplete-and-assigned')
		expect(h.notes.join(' ')).toMatch(/incomplete and assigned/)
	})

	it('H6 flags a person over wip_limit, once, with their tasks', async () => {
		const tasks = ['a', 'b', 'c', 'd'].map((g) => task(g))
		const h = await buildHealth(
			only('H6', { sprintTasks: [...tasks, task('e', { assignee: { gid: 'u2', name: 'Bo' } })] }),
		)
		expect(h.findings).toHaveLength(1)
		expect(h.findings[0]).toMatchObject({ check: 'H6', person: { gid: 'u1' } })
		expect(h.findings[0]?.tasks?.map((t) => t.gid)).toEqual(['a', 'b', 'c', 'd'])
	})

	it('H7 flags a blocked task with its blocker', async () => {
		const h = await buildHealth(
			only('H7', {
				sprintTasks: [task('a'), task('b')],
				dependenciesOf: async (gid) =>
					gid === 'a' ? [{ gid: 'x', name: 'upstream', completed: false }] : [{ gid: 'y', completed: true }],
			}),
		)
		expect(h.findings).toHaveLength(1)
		expect(h.findings[0]).toMatchObject({ check: 'H7', task: { gid: 'a' } })
		expect(h.findings[0]?.message).toContain('x')
	})

	const person = (
		gid: string,
		name: string,
		flag: 'over' | 'under' | 'ok' | 'unknown',
		used: number | null,
		cap: number | null,
	) => ({
		person: { gid, name },
		tasks: 1,
		story_points: 1,
		task_points: 0,
		effort_hours: { story: 1, task: 0, total: used ?? 0 },
		capacity:
			cap === null
				? { status: 'unknown' as const, reason: 'no-allocation' as const }
				: { status: 'known' as const, hours: cap, allocations: [] },
		utilization_pct: cap ? Math.round(((used ?? 0) * 1000) / cap) / 10 : null,
		flag,
	})
	const workload = (people: ReturnType<typeof person>[]) => ({
		people,
		team: {} as never,
		unassigned_tasks: 0,
		points_tracked: { story: true, task: false },
		notes: [],
	})

	it('H8 is skipped, with the reason, when capacity was not read', async () => {
		const h = await buildHealth(only('H8', { sprintTasks: [task('a')] }))
		expect(h.checks[0]).toMatchObject({
			id: 'H8',
			status: 'skipped',
			reason: 'capacity unknown: allocations were not read',
		})
		expect(h.findings).toEqual([])
	})

	it('H8 is skipped with the plan reason when Asana answered 402', async () => {
		const h = await buildHealth(
			only('H8', {
				sprintTasks: [task('a')],
				capacity: { skipped: 'the workspace plan does not include allocations (402)' },
			}),
		)
		expect(h.checks[0]).toMatchObject({
			status: 'skipped',
			reason: 'capacity unknown: the workspace plan does not include allocations (402)',
		})
	})

	it('H8 is skipped when no one in the sprint has a known capacity', async () => {
		const h = await buildHealth(
			only('H8', {
				sprintTasks: [task('a')],
				capacity: { workload: workload([person('u1', 'Ann', 'unknown', 8, null)]) },
			}),
		)
		expect(h.checks[0]).toMatchObject({
			status: 'skipped',
			reason: 'capacity unknown: no allocation overlaps the sprint dates',
		})
	})

	it('H8 flags each person over capacity as an error, and passes when none is', async () => {
		const over = await buildHealth(
			only('H8', {
				sprintTasks: [task('a')],
				capacity: {
					workload: workload([person('u1', 'Ann', 'over', 50, 40), person('u2', 'Bob', 'ok', 30, 40)]),
				},
			}),
		)
		expect(over.checks[0]).toMatchObject({ id: 'H8', status: 'failed', findings: 1 })
		expect(over.findings[0]).toMatchObject({
			check: 'H8',
			level: 'error',
			person: { gid: 'u1', name: 'Ann' },
			fix: 'cyber-asana report workload --scope web --sprint 2',
		})
		expect(over.findings[0]?.message).toContain('Ann')
		expect(over.findings[0]?.message).toContain('50 h')
		expect(over.findings[0]?.message).toContain('40 h')

		const ok = await buildHealth(
			only('H8', {
				sprintTasks: [task('a')],
				capacity: { workload: workload([person('u2', 'Bob', 'under', 10, 40)]) },
			}),
		)
		expect(ok.checks[0]).toMatchObject({ status: 'passed', findings: 0 })
	})

	it('H8 notes the people whose capacity is unknown instead of passing them silently', async () => {
		const h = await buildHealth(
			only('H8', {
				sprintTasks: [task('a')],
				capacity: { workload: workload([person('u1', 'Ann', 'ok', 30, 40), person('u2', 'Bob', 'unknown', 5, null)]) },
			}),
		)
		expect(h.notes.join(' ')).toMatch(/H8.*Bob/)
	})

	it('H8 is skipped, naming the sprint, when it has no section', async () => {
		const h = await buildHealth(only('H8', { sprintTasks: undefined, capacity: { workload: workload([]) } }))
		expect(h.checks[0]).toMatchObject({ status: 'skipped', reason: expect.stringContaining('has no section') })
	})

	it('H9 flags each project that lacks the sprint section, as an error', async () => {
		const h = await buildHealth(only('H9', { sprintTasks: undefined, missingProjects: ['p1', 'p2'] }))
		expect(h.findings.map((f) => [f.check, f.level])).toEqual([
			['H9', 'error'],
			['H9', 'error'],
		])
		expect(h.findings[0]?.fix).toBe('cyber-asana sprint start --sprint 2 --scope web')
	})

	it('task checks are skipped when the sprint has no section', async () => {
		const h = await buildHealth(input({ sprintTasks: undefined, missingProjects: ['p1'] }))
		expect(h.checks.find((c) => c.id === 'H3')).toMatchObject({ status: 'skipped' })
		expect(h.checks.find((c) => c.id === 'H3')?.reason).toMatch(/no section/)
		expect(h.checks.find((c) => c.id === 'H9')?.status).toBe('failed')
	})

	it('H10 flags incomplete tasks left in a closed sprint', async () => {
		const h = await buildHealth(
			only('H10', {
				allSprints: [
					{ n: 1, name: 'Sprint 1', tasks: [task('old')] },
					{ n: 2, name: 'Sprint 2', tasks: [task('cur')] },
				],
			}),
		)
		expect(h.findings).toHaveLength(1)
		expect(h.findings[0]).toMatchObject({ check: 'H10', task: { gid: 'old' } })
		expect(h.findings[0]?.fix).toContain('sprint close --sprint 1')
	})

	it('H11 flags a task in two sprints', async () => {
		const h = await buildHealth(
			only('H11', {
				allSprints: [
					{ n: 2, name: 'Sprint 2', tasks: [task('dup'), task('one')] },
					{ n: 3, name: 'Sprint 3', tasks: [task('dup')] },
				],
			}),
		)
		expect(h.findings).toHaveLength(1)
		expect(h.findings[0]).toMatchObject({ check: 'H11', level: 'error', task: { gid: 'dup' } })
		expect(h.findings[0]?.message).toContain('Sprint 2')
		expect(h.findings[0]?.message).toContain('Sprint 3')
	})

	it('runs only the enabled checks and counts findings by level', async () => {
		const h = await buildHealth(
			input({
				settings: { ...settings, checks: ['H3', 'H4'] },
				sprintTasks: [task('a', { assignee: null, due_on: '2026-01-01' })],
			}),
		)
		expect(h.checks.map((c) => c.id)).toEqual(['H3', 'H4'])
		expect(h.counts).toEqual({ error: 1, warning: 1 })
	})
})
