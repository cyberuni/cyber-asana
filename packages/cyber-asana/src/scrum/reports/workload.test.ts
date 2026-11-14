import { describe, expect, it } from 'vitest'
import { DEFAULT_SCRUM_POLICY } from '../policy.js'
import {
	buildWorkload,
	countWorkingDays,
	parseWorkloadSettings,
	type WorkloadAllocation,
	type WorkloadInput,
	type WorkloadTask,
} from './workload.js'

const STORY = 'f-story'
const TASK = 'f-task'
const ann = { gid: 'u1', name: 'Ann' }
const bob = { gid: 'u2', name: 'Bob' }

function task(gid: string, assignee: WorkloadTask['assignee'], story = 0, taskPts = 0): WorkloadTask {
	return {
		gid,
		name: `Task ${gid}`,
		completed: false,
		assignee,
		custom_fields: [
			{ gid: STORY, number_value: story },
			{ gid: TASK, number_value: taskPts },
		],
	}
}

const alloc = (
	assignee: { gid: string; name?: string },
	effort: { type: 'hours' | 'percent'; value: number },
	start = '2026-01-05',
	end = '2026-01-18',
): WorkloadAllocation => ({
	gid: `al-${assignee.gid}-${effort.value}`,
	assignee,
	parent: { gid: 'p1' },
	start_date: start,
	end_date: end,
	effort,
})

// Sprint 1: 2026-01-05 (Mon) to 2026-01-18 (Sun) is ten working days.
function input(over: Partial<WorkloadInput> = {}): WorkloadInput {
	return {
		scope: 'web',
		window: { from: '2026-01-05', to: '2026-01-18' },
		policy: { ...DEFAULT_SCRUM_POLICY },
		settings: parseWorkloadSettings({}),
		tasks: [],
		fields: { story: new Set([STORY]), task: new Set([TASK]) },
		capacity: { status: 'ok', allocations: [] },
		...over,
	}
}

describe('countWorkingDays', () => {
	it('counts only the working weekdays, both ends included', () => {
		expect(countWorkingDays('2026-01-05', '2026-01-18', DEFAULT_SCRUM_POLICY.working_days)).toBe(10)
		expect(countWorkingDays('2026-01-10', '2026-01-11', DEFAULT_SCRUM_POLICY.working_days)).toBe(0)
		expect(countWorkingDays('2026-01-05', '2026-01-05', ['mon'])).toBe(1)
		expect(countWorkingDays('2026-01-06', '2026-01-05', ['mon'])).toBe(0)
	})
})

describe('parseWorkloadSettings', () => {
	it('defaults to 100 and 60', () => {
		expect(parseWorkloadSettings({})).toEqual({ over_allocation_pct: 100, under_allocation_pct: 60 })
	})

	it('rejects a non-positive value, or an under threshold above the over one', () => {
		expect(() => parseWorkloadSettings({ over_allocation_pct: 0 })).toThrow(/over_allocation_pct/)
		expect(() => parseWorkloadSettings({ under_allocation_pct: 'x' })).toThrow(/under_allocation_pct/)
		expect(() => parseWorkloadSettings({ over_allocation_pct: 50, under_allocation_pct: 60 })).toThrow(
			/under_allocation_pct/,
		)
	})
})

describe('buildWorkload', () => {
	it('sums story points, task points, and effort hours per person, showing both parts', () => {
		const result = buildWorkload(
			input({
				policy: { ...DEFAULT_SCRUM_POLICY, hours_per_point: 2 },
				tasks: [task('a', ann, 3, 1), task('b', ann, 2, 0), task('c', bob, 0, 4)],
			}),
		)
		const a = result.people.find((p) => p.person.gid === 'u1')
		expect(a).toMatchObject({
			tasks: 2,
			story_points: 5,
			task_points: 1,
			effort_hours: { story: 10, task: 2, total: 12 },
		})
		expect(result.people.find((p) => p.person.gid === 'u2')?.effort_hours).toEqual({ story: 0, task: 8, total: 8 })
		expect(result.team.effort_hours).toEqual({ story: 10, task: 10, total: 20 })
		expect(result.unassigned_tasks).toBe(0)
	})

	it('leaves completed tasks out and counts unassigned ones apart', () => {
		const done = { ...task('d', ann, 5), completed: true }
		const result = buildWorkload(input({ tasks: [done, task('u', null, 3), task('a', ann, 1)] }))
		expect(result.people).toHaveLength(1)
		expect(result.people[0]?.story_points).toBe(1)
		expect(result.unassigned_tasks).toBe(1)
	})

	it('turns a percent allocation into hours: percent x working_hours_per_day x working days', () => {
		const result = buildWorkload(
			input({
				tasks: [task('a', ann, 20)],
				capacity: { status: 'ok', allocations: [alloc(ann, { type: 'percent', value: 50 })] },
			}),
		)
		const a = result.people[0]
		// 50% x 8 h x 10 days = 40 h
		expect(a?.capacity).toMatchObject({ status: 'known', hours: 40 })
		expect(a?.utilization_pct).toBe(50)
		expect(a?.flag).toBe('under')
	})

	it('takes an hours allocation as given when it lies inside the window', () => {
		const result = buildWorkload(
			input({
				tasks: [task('a', ann, 20)],
				capacity: { status: 'ok', allocations: [alloc(ann, { type: 'hours', value: 20 })] },
			}),
		)
		expect(result.people[0]?.capacity).toMatchObject({ status: 'known', hours: 20 })
		expect(result.people[0]?.utilization_pct).toBe(100)
		expect(result.people[0]?.flag).toBe('ok')
	})

	it('clips an allocation to the window: percent by the days inside, hours in proportion to them', () => {
		const wide = { start: '2026-01-05', end: '2026-02-01' } // 20 working days
		const window = { from: '2026-01-12', to: '2026-01-18' } // 5 of them
		const result = buildWorkload(
			input({
				window,
				tasks: [task('a', ann, 1)],
				capacity: {
					status: 'ok',
					allocations: [
						alloc(ann, { type: 'percent', value: 100 }, wide.start, wide.end),
						alloc(ann, { type: 'hours', value: 80 }, wide.start, wide.end),
					],
				},
			}),
		)
		// 100% x 8 x 5 = 40, plus 80 x 5/20 = 20
		expect(result.people[0]?.capacity).toMatchObject({ status: 'known', hours: 60 })
	})

	it('ignores an allocation that does not overlap the window, and names the person unknown', () => {
		const result = buildWorkload(
			input({
				tasks: [task('a', ann, 4)],
				capacity: {
					status: 'ok',
					allocations: [alloc(ann, { type: 'percent', value: 100 }, '2026-03-02', '2026-03-13')],
				},
			}),
		)
		expect(result.people[0]).toMatchObject({
			capacity: { status: 'unknown', reason: 'no-allocation' },
			utilization_pct: null,
			flag: 'unknown',
			effort_hours: { total: 4 },
		})
	})

	it('flags over and under by the thresholds', () => {
		const result = buildWorkload(
			input({
				tasks: [task('a', ann, 50), task('b', bob, 10)],
				capacity: {
					status: 'ok',
					allocations: [alloc(ann, { type: 'percent', value: 50 }), alloc(bob, { type: 'percent', value: 100 })],
				},
			}),
		)
		expect(result.people.find((p) => p.person.gid === 'u1')).toMatchObject({ utilization_pct: 125, flag: 'over' })
		expect(result.people.find((p) => p.person.gid === 'u2')).toMatchObject({ utilization_pct: 12.5, flag: 'under' })
	})

	it('shows a person with capacity and no tasks as under-allocated', () => {
		const result = buildWorkload(
			input({
				tasks: [task('a', ann, 1)],
				capacity: { status: 'ok', allocations: [alloc(bob, { type: 'hours', value: 30 })] },
			}),
		)
		expect(result.people.find((p) => p.person.gid === 'u2')).toMatchObject({
			tasks: 0,
			utilization_pct: 0,
			flag: 'under',
		})
	})

	it('names a 402 as the reason for every person and still shows the load', () => {
		const result = buildWorkload(
			input({ tasks: [task('a', ann, 3)], capacity: { status: 'unavailable', reason: 'plan' } }),
		)
		expect(result.people[0]).toMatchObject({
			effort_hours: { total: 3 },
			capacity: { status: 'unknown', reason: 'plan' },
			flag: 'unknown',
		})
		expect(result.team.capacity_hours).toBeNull()
		expect(result.notes.join(' ')).toMatch(/plan/)
	})

	it('totals the team over people with known capacity only, and counts the unknown', () => {
		const result = buildWorkload(
			input({
				tasks: [task('a', ann, 20), task('b', bob, 8)],
				capacity: { status: 'ok', allocations: [alloc(ann, { type: 'hours', value: 40 })] },
			}),
		)
		expect(result.team).toMatchObject({
			people: 2,
			effort_hours: { total: 28 },
			capacity_hours: 40,
			capacity_unknown: 1,
			utilization_pct: 50,
		})
	})

	it('puts out-of-office entries beside capacity and never subtracts them (D9)', () => {
		const withoutOoo = buildWorkload(
			input({
				tasks: [task('a', ann, 20)],
				capacity: { status: 'ok', allocations: [alloc(ann, { type: 'hours', value: 40 })] },
			}),
		)
		const withOoo = buildWorkload(
			input({
				tasks: [task('a', ann, 20)],
				capacity: { status: 'ok', allocations: [alloc(ann, { type: 'hours', value: 40 })] },
				ooo: { u1: [{ start_date: '2026-01-12', end_date: '2026-01-14' }] },
			}),
		)
		expect(withOoo.people[0]?.ooo).toEqual([{ start_date: '2026-01-12', end_date: '2026-01-14' }])
		expect(withOoo.people[0]?.capacity).toEqual(withoutOoo.people[0]?.capacity)
		expect(withOoo.people[0]?.utilization_pct).toBe(withoutOoo.people[0]?.utilization_pct)
	})

	it('says which points fields are tracked', () => {
		const result = buildWorkload(input({ fields: { story: new Set([STORY]), task: new Set() } }))
		expect(result.points_tracked).toEqual({ story: true, task: false })
	})

	it('orders people by name', () => {
		const result = buildWorkload(input({ tasks: [task('a', bob, 1), task('b', ann, 1)] }))
		expect(result.people.map((p) => p.person.name)).toEqual(['Ann', 'Bob'])
	})
})
