import { describe, expect, it } from 'vitest'
import { buildPlan, type PlanInput } from './plan.js'

const S = 'f-story'
const T = 'f-task'
const task = (gid: string, story = 0, taskPts = 0) => ({
	gid,
	name: `task ${gid}`,
	custom_fields: [
		{ gid: S, number_value: story },
		{ gid: T, number_value: taskPts },
	],
})

function input(over: Partial<PlanInput> = {}): PlanInput {
	return {
		tasks: [task('a', 3), task('b', 5), task('c', 2), task('d', 8)],
		fields: { story: new Set([S]), task: new Set([T]) },
		hoursPerPoint: 1,
		velocity: { sprints: 3, mean: { count: 4, story: 10, task: 0 } },
		capacity: { status: 'known', hours: 40 },
		...over,
	}
}

describe('buildPlan', () => {
	it('proposes the backlog top that fits velocity, stopping at the first task that does not', () => {
		const p = buildPlan(input())
		expect(p.proposal.tasks).toEqual(['a', 'b', 'c'])
		expect(p.proposal.totals).toEqual({ count: 3, story_points: 10, task_points: 0, effort_hours: 10 })
		expect(p.proposal.stopped_before).toEqual({ gid: 'd', reasons: ['story points 18 > 10 (velocity)'] })
	})

	it('shows cumulative totals and whether each backlog task fits', () => {
		const p = buildPlan(input())
		expect(p.backlog.map((t) => [t.gid, t.cumulative.story_points, t.within_limits])).toEqual([
			['a', 3, true],
			['b', 8, true],
			['c', 10, true],
			['d', 18, false],
		])
	})

	it('limits by capacity hours too, using hours_per_point, and the lower limit wins', () => {
		const p = buildPlan(input({ hoursPerPoint: 2, capacity: { status: 'known', hours: 16 } }))
		expect(p.limits.effort_hours).toBe(16)
		expect(p.proposal.tasks).toEqual(['a', 'b'])
		expect(p.proposal.stopped_before?.reasons).toEqual(['effort hours 20 > 16 (capacity)'])
	})

	it('keeps story and task points apart, each against its own mean', () => {
		const p = buildPlan(
			input({
				tasks: [task('a', 3, 4), task('b', 1, 5)],
				velocity: { sprints: 2, mean: { count: 2, story: 10, task: 8 } },
				capacity: { status: 'unknown', reason: 'no-allocation' },
			}),
		)
		expect(p.proposal.tasks).toEqual(['a'])
		expect(p.proposal.stopped_before?.reasons).toEqual(['task points 9 > 8 (velocity)'])
	})

	it('names unknown capacity and fits against velocity alone', () => {
		const p = buildPlan(input({ capacity: { status: 'unknown', reason: 'plan' } }))
		expect(p.capacity).toEqual({ status: 'unknown', hours: null, reason: 'plan' })
		expect(p.limits.effort_hours).toBeNull()
		expect(p.proposal.tasks).toEqual(['a', 'b', 'c'])
		expect(p.notes.join(' ')).toContain('capacity is unknown')
	})

	it('proposes nothing, and says why, when there is neither velocity nor capacity', () => {
		const p = buildPlan(
			input({ velocity: { sprints: 0, mean: null }, capacity: { status: 'unknown', reason: 'no-allocation' } }),
		)
		expect(p.proposal.tasks).toEqual([])
		expect(p.notes.join(' ')).toContain('nothing to fit the backlog against')
	})

	it('counts tasks with no estimate and carries them along', () => {
		const p = buildPlan(input({ tasks: [task('a', 3), task('z'), task('b', 5)] }))
		expect(p.proposal.tasks).toEqual(['a', 'z', 'b'])
		expect(p.proposal.unestimated).toEqual(['z'])
	})

	it('totals a selection the user edited and compares it with each limit', () => {
		const p = buildPlan(input({ selection: ['b', 'd', 'gone'] }))
		expect(p.selection).toEqual({
			tasks: ['b', 'd'],
			not_in_backlog: ['gone'],
			totals: { count: 2, story_points: 13, task_points: 0, effort_hours: 13 },
			against: {
				story_points: { total: 13, limit: 10, over: true },
				task_points: { total: 0, limit: 0, over: false },
				effort_hours: { total: 13, limit: 40, over: false },
			},
			fits: false,
		})
	})

	it('leaves out a points kind that is not tracked', () => {
		const p = buildPlan(input({ fields: { story: new Set([S]), task: new Set() } }))
		expect(p.points_tracked).toEqual({ story: true, task: false })
		expect(p.limits.task_points).toBeNull()
	})

	it('has no selection unless one was given', () => {
		expect(buildPlan(input()).selection).toBeUndefined()
	})
})
