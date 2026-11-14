import { pointsOf } from './reports/standup.js'

type PlanTask = { gid: string; name?: string; custom_fields?: Array<{ gid?: string; number_value?: number | null }> }

export type PlanInput = {
	/** The backlog in priority order. */
	tasks: PlanTask[]
	fields: { story: Set<string>; task: Set<string> }
	hoursPerPoint: number
	velocity: { sprints: number; mean: { count: number; story: number; task: number } | null }
	capacity: { status: 'known'; hours: number } | { status: 'unknown'; reason: 'plan' | 'no-allocation' }
	/** The tasks the user settled on, to total against the limits. */
	selection?: string[]
}

type Totals = { count: number; story_points: number; task_points: number; effort_hours: number }
type Limits = { story_points: number | null; task_points: number | null; effort_hours: number | null }

const round = (n: number) => Math.round(n * 100) / 100

const empty = (): Totals => ({ count: 0, story_points: 0, task_points: 0, effort_hours: 0 })

function add(totals: Totals, row: { story_points: number; task_points: number; effort_hours: number }): Totals {
	return {
		count: totals.count + 1,
		story_points: round(totals.story_points + row.story_points),
		task_points: round(totals.task_points + row.task_points),
		effort_hours: round(totals.effort_hours + row.effort_hours),
	}
}

const LABELS = { story_points: 'story points', task_points: 'task points', effort_hours: 'effort hours' } as const
const SOURCE = { story_points: 'velocity', task_points: 'velocity', effort_hours: 'capacity' } as const

/** The reasons a cumulative total goes past a limit; empty when it fits (or no limit applies). */
function overruns(total: Totals, limits: Limits): string[] {
	return (Object.keys(LABELS) as Array<keyof Limits>).flatMap((key) => {
		const limit = limits[key]
		return limit !== null && total[key] > limit ? [`${LABELS[key]} ${total[key]} > ${limit} (${SOURCE[key]})`] : []
	})
}

/**
 * The planning arithmetic (C2, P2): the backlog top that fits the recent velocity and the capacity, and the
 * totals of a selection the user edited. Story and task points stay apart, each against its own mean; the
 * effort hours are both kinds times `hours_per_point`, against Allocations capacity. The proposal walks the
 * backlog in its priority order and stops at the first task that overruns a limit, so it never skips ahead.
 */
export function buildPlan(input: PlanInput) {
	const tracked = { story: input.fields.story.size > 0, task: input.fields.task.size > 0 }
	const mean = input.velocity.mean
	const limits: Limits = {
		story_points: tracked.story && mean ? mean.story : null,
		task_points: tracked.task && mean ? mean.task : null,
		effort_hours: input.capacity.status === 'known' ? input.capacity.hours : null,
	}
	const notes: string[] = []
	if (input.capacity.status === 'unknown') {
		notes.push(
			`Team capacity is unknown (${input.capacity.reason === 'plan' ? 'the plan does not include allocations' : 'no allocation overlaps the sprint dates'}), so the proposal fits against velocity alone.`,
		)
	}
	if (mean === null) notes.push('There is no closed sprint, so there is no velocity to fit against.')
	const hasLimit = Object.values(limits).some((l) => l !== null)
	if (!hasLimit) notes.push('There is neither velocity nor capacity, so there is nothing to fit the backlog against.')

	const rows = input.tasks.map((t) => {
		const p = pointsOf(t, input.fields)
		return {
			gid: t.gid,
			name: t.name ?? '',
			story_points: p.story,
			task_points: p.task,
			effort_hours: round((p.story + p.task) * input.hoursPerPoint),
		}
	})

	let running = empty()
	let stopped = false
	let stoppedBefore: { gid: string; reasons: string[] } | undefined
	const proposed: string[] = []
	let proposalTotals = empty()
	const unestimated: string[] = []
	const backlog = rows.map((row) => {
		running = add(running, row)
		const reasons = hasLimit ? overruns(running, limits) : ['no limit to fit against']
		const within = reasons.length === 0
		if (!stopped && within) {
			proposed.push(row.gid)
			proposalTotals = running
			if (row.story_points + row.task_points === 0) unestimated.push(row.gid)
		} else if (!stopped) {
			stopped = true
			if (hasLimit) stoppedBefore = { gid: row.gid, reasons }
		}
		return {
			...row,
			cumulative: {
				story_points: running.story_points,
				task_points: running.task_points,
				effort_hours: running.effort_hours,
			},
			within_limits: within,
		}
	})

	let selection:
		| {
				tasks: string[]
				not_in_backlog: string[]
				totals: Totals
				against: Partial<Record<keyof Limits, { total: number; limit: number | null; over: boolean }>>
				fits: boolean
		  }
		| undefined
	if (input.selection) {
		const byGid = new Map(rows.map((r) => [r.gid, r]))
		const picked = input.selection.filter((g) => byGid.has(g))
		const totals = picked.reduce((t, g) => add(t, byGid.get(g) as (typeof rows)[number]), empty())
		const against: NonNullable<typeof selection>['against'] = {}
		for (const key of Object.keys(LABELS) as Array<keyof Limits>) {
			if (key === 'story_points' && !tracked.story) continue
			if (key === 'task_points' && !tracked.task) continue
			const limit = limits[key]
			against[key] = { total: totals[key], limit, over: limit !== null && totals[key] > limit }
		}
		selection = {
			tasks: picked,
			not_in_backlog: input.selection.filter((g) => !byGid.has(g)),
			totals,
			against,
			fits: Object.values(against).every((a) => !a.over),
		}
	}

	return {
		hours_per_point: input.hoursPerPoint,
		velocity: input.velocity,
		capacity:
			input.capacity.status === 'known'
				? { status: 'known' as const, hours: input.capacity.hours }
				: { status: 'unknown' as const, hours: null, reason: input.capacity.reason },
		limits,
		points_tracked: tracked,
		backlog,
		proposal: {
			tasks: hasLimit ? proposed : [],
			totals: hasLimit ? proposalTotals : empty(),
			...(stoppedBefore && { stopped_before: stoppedBefore }),
			unestimated: hasLimit ? unestimated : [],
		},
		...(selection && { selection }),
		notes,
	}
}
