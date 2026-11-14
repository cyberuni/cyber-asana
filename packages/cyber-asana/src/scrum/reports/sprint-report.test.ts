import { describe, expect, it } from 'vitest'
import { buildRetro, buildSprintReport, velocityOf } from './sprint-report.js'
import type { StandupTask } from './standup.js'

const sprint = { n: 2, name: 'Sprint 2', start: '2026-01-05', end: '2026-01-09', working_days: 5 }
const fields = { story: new Set(['S']), task: new Set(['T']) }
const task = (gid: string, o: Partial<StandupTask> & { story?: number; points?: number } = {}): StandupTask => ({
	gid,
	name: `task ${gid}`,
	completed: false,
	created_at: '2026-01-01T00:00:00Z',
	...(o.story !== undefined || o.points !== undefined
		? {
				custom_fields: [
					{ gid: 'S', number_value: o.story ?? 0 },
					{ gid: 'T', number_value: o.points ?? 0 },
				],
			}
		: {}),
	...o,
	...(o.story !== undefined || o.points !== undefined
		? {
				custom_fields: [
					{ gid: 'S', number_value: o.story ?? 0 },
					{ gid: 'T', number_value: o.points ?? 0 },
				],
			}
		: {}),
})
const done = (gid: string, at: string, o: Parameters<typeof task>[1] = {}) =>
	task(gid, { ...o, completed: true, completed_at: at })

const base = {
	sprint,
	today: '2026-01-09',
	timezone: 'UTC',
	fields,
	points_tracked: { story: true, task: true },
}

describe('sprint report (R2)', () => {
	const tasks = [
		done('a', '2026-01-06T10:00:00Z', { story: 3 }),
		done('b', '2026-01-08T10:00:00Z', { story: 2 }),
		task('c', { story: 5 }),
		done('d', '2026-01-07T10:00:00Z', { points: 1 }),
	]
	const committed = {
		source: 'snapshot' as const,
		tasks: [
			{ gid: 'a', name: 'a', story: 3, task: 0 },
			{ gid: 'b', name: 'b', story: 2, task: 0 },
			{ gid: 'c', name: 'c', story: 5, task: 0 },
			{ gid: 'gone', name: 'gone', story: 8, task: 0 },
		],
	}

	it('compares committed with completed, added and removed, points per kind', () => {
		const report = buildSprintReport({ ...base, tasks, committed })
		expect(report.committed).toMatchObject({ count: 4, points: { story: 18, task: 0 }, source: 'snapshot' })
		expect(report.completed).toMatchObject({ count: 3, points: { story: 5, task: 1 } })
		expect(report.added.tasks.map((t) => t.gid)).toEqual(['d'])
		expect(report.removed?.tasks.map((t) => t.gid)).toEqual(['gone'])
		expect(report.removed?.points).toEqual({ story: 8, task: 0 })
	})

	it('rates completion by count and by each kind of points, null where nothing was planned', () => {
		const report = buildSprintReport({ ...base, tasks, committed })
		expect(report.completion_rate).toEqual({ count: 75, story: 50, task: 100 })
		expect(buildSprintReport({ ...base, tasks: [], committed }).completion_rate).toEqual({
			count: null,
			story: null,
			task: null,
		})
	})

	it('lists the open tasks as carry-over candidates and completed stories for the demo', () => {
		const report = buildSprintReport({ ...base, tasks, committed })
		expect(report.carry_over_candidates.map((t) => t.gid)).toEqual(['c'])
		expect(report.demo.basis).toBe('story-points')
		expect(report.demo.tasks.map((t) => t.gid)).toEqual(['a', 'b'])
	})

	it('falls back to every completed task for the demo when no story points are tracked', () => {
		const report = buildSprintReport({ ...base, points_tracked: { story: false, task: false }, tasks, committed })
		expect(report.demo.basis).toBe('completed')
		expect(report.demo.tasks).toHaveLength(3)
	})

	it('draws a daily burndown from completed_at up to today', () => {
		const report = buildSprintReport({ ...base, today: '2026-01-07', tasks, committed })
		expect(report.burndown.map((d) => d.date)).toEqual(['2026-01-05', '2026-01-06', '2026-01-07'])
		expect(report.burndown.map((d) => d.remaining.count)).toEqual([4, 3, 2])
		expect(report.burndown[2]?.remaining).toEqual({ count: 2, story: 7, task: 0 })
		expect(report.burndown[0]?.completed).toBe(0)
	})

	it('names the gap when there is no commitment to compare', () => {
		const report = buildSprintReport({ ...base, tasks, committed: undefined })
		expect(report.committed.source).toBe('unavailable')
		expect(report.removed).toBeNull()
		expect(report.notes.join(' ')).toMatch(/no commitment snapshot/i)
	})
})

describe('retro (R3)', () => {
	const tasks = [
		done('a', '2026-01-03T00:00:00Z', { story: 4, created_at: '2026-01-01T00:00:00Z' }),
		done('b', '2026-01-05T00:00:00Z', { story: 1, created_at: '2026-01-01T00:00:00Z' }),
		task('c', { story: 2 }),
	]
	const committed = {
		source: 'snapshot' as const,
		tasks: [
			{ gid: 'a', name: 'a', story: 2, task: 0 },
			{ gid: 'b', name: 'b', story: 1, task: 0 },
			{ gid: 'c', name: 'c', story: 2, task: 0 },
		],
	}
	const input = {
		...base,
		tasks,
		committed,
		signals: ['tag:Blocked'],
		storiesOf: {} as Record<string, never[]>,
		now: '2026-01-09T12:00:00Z',
	}

	it('reports carry-over, scope change and cycle time', () => {
		const retro = buildRetro(input)
		expect(retro.carry_over.map((t) => t.gid)).toEqual(['c'])
		expect(retro.scope_change.source).toBe('snapshot')
		expect(retro.cycle_time).toMatchObject({ basis: 'created_at', count: 2, mean_days: 3, median_days: 3 })
	})

	it('compares the committed estimate with the points the finished task carries now', () => {
		const retro = buildRetro(input)
		expect(retro.estimate_vs_actual?.tasks).toEqual([
			{ gid: 'a', name: 'task a', estimate: { story: 2, task: 0 }, actual: { story: 4, task: 0 } },
			{ gid: 'b', name: 'task b', estimate: { story: 1, task: 0 }, actual: { story: 1, task: 0 } },
		])
		expect(retro.estimate_vs_actual?.totals).toEqual({ estimate: { story: 3, task: 0 }, actual: { story: 5, task: 0 } })
	})

	it('has no estimate comparison without a snapshot, and says so', () => {
		const retro = buildRetro({ ...input, committed: undefined })
		expect(retro.estimate_vs_actual).toBeNull()
		expect(retro.notes.join(' ')).toMatch(/estimate/i)
	})

	it('totals blocked time from stories and names the gap when none show a block', () => {
		const stories = {
			c: [{ resource_subtype: 'added_to_tag', created_at: '2026-01-08T00:00:00Z', text: 'added tag Blocked' }],
		}
		const withBlock = buildRetro({ ...input, storiesOf: stories })
		expect(withBlock.blocked.tasks).toEqual([{ gid: 'c', name: 'task c', hours: 36, open: true }])
		expect(withBlock.blocked.total_hours).toBe(36)
		const none = buildRetro(input)
		expect(none.blocked.tasks).toEqual([])
		expect(none.notes.join(' ')).toMatch(/no system story showed a block/i)
	})
})

describe('velocity (R4)', () => {
	const sprints = [1, 2, 3, 4].map((n) => ({
		n,
		name: `Sprint ${n}`,
		completed: { count: n, points: { story: n * 2, task: n } },
	}))
	it('takes the last window of closed sprints with the mean of each kind', () => {
		const v = velocityOf(sprints, 3)
		expect(v.sprints.map((s) => s.n)).toEqual([2, 3, 4])
		expect(v.mean).toEqual({ count: 3, story: 6, task: 3 })
		expect(v.window).toBe(3)
	})
	it('has no mean without closed sprints', () => {
		expect(velocityOf([], 3).mean).toBeNull()
	})
})
