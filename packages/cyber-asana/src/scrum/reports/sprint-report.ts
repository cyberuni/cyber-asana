import type { Sprint } from '../sprint.js'
import type { CommitmentTask } from './commitment.js'
import { pointsOf, type StandupTask, startOfDayIn } from './standup.js'
import { blockedHours, type TaskStory } from './stories.js'

export type Points = { story: number; task: number }

export type ReportItem = {
	gid: string
	name: string
	url?: string
	assignee?: string
	due_on?: string
	completed_at?: string
	story_points?: number
	task_points?: number
}

export type Committed = {
	/** Where the commitment came from: the posted snapshot, or rebuilt from task history. */
	source: 'snapshot' | 'rebuilt'
	tasks: CommitmentTask[]
}

type Fields = { story: Set<string>; task: Set<string> }
type Tracked = { story: boolean; task: boolean }

export type SprintFacts = {
	sprint: Sprint
	/** Today in the user's timezone, `YYYY-MM-DD`. */
	today: string
	timezone: string
	/** The tasks in the sprint now (each once), completed ones included. */
	tasks: StandupTask[]
	/** The commitment, or undefined when none could be found or rebuilt. */
	committed?: Committed | undefined
	fields: Fields
	points_tracked: Tracked
	/** What the caller could not read, in words; the report adds its own. */
	notes?: string[]
}

const DAY_MS = 86_400_000
const add = (a: Points, b: Points): Points => ({ story: a.story + b.story, task: a.task + b.task })
const zero = (): Points => ({ story: 0, task: 0 })
const pct = (done: number, total: number) => (total === 0 ? null : Math.round((done / total) * 1000) / 10)
const nextDay = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10)

function itemOf(t: StandupTask, fields: Fields, tracked: Tracked): ReportItem {
	const p = pointsOf(t, fields)
	return {
		gid: t.gid,
		name: t.name ?? '',
		...(t.permalink_url && { url: t.permalink_url }),
		...(t.assignee?.name && { assignee: t.assignee.name }),
		...(t.due_on && { due_on: t.due_on }),
		...(t.completed_at && { completed_at: t.completed_at }),
		...(tracked.story && { story_points: p.story }),
		...(tracked.task && { task_points: p.task }),
	}
}

function totals(tasks: StandupTask[], fields: Fields) {
	return { count: tasks.length, points: tasks.reduce((sum, t) => add(sum, pointsOf(t, fields)), zero()) }
}

/** R2: what the sprint committed to against what it delivered. Pure. */
export function buildSprintReport(input: SprintFacts) {
	const { tasks, fields, sprint } = input
	const notes = [...(input.notes ?? [])]
	const members = new Map(tasks.map((t) => [t.gid, t]))
	const completed = tasks.filter((t) => t.completed === true)
	const open = tasks.filter((t) => t.completed !== true)
	const item = (t: StandupTask) => itemOf(t, fields, input.points_tracked)
	const group = (list: StandupTask[]) => ({ ...totals(list, fields), tasks: list.map(item) })

	const committedGids = new Set(input.committed?.tasks.map((t) => t.gid))
	const added = input.committed ? tasks.filter((t) => !committedGids.has(t.gid)) : []
	const committed = input.committed
		? {
				source: input.committed.source,
				count: input.committed.tasks.length,
				points: input.committed.tasks.reduce((sum, t) => add(sum, { story: t.story, task: t.task }), zero()),
				tasks: input.committed.tasks,
			}
		: { source: 'unavailable' as const, count: 0, points: zero(), tasks: [] as CommitmentTask[] }

	let removed: {
		count: number
		points: Points
		tasks: Array<{ gid: string; name: string; story_points: number; task_points: number }>
	} | null = null
	if (input.committed?.source === 'snapshot') {
		const gone = input.committed.tasks.filter((t) => !members.has(t.gid))
		removed = {
			count: gone.length,
			points: gone.reduce((sum, t) => add(sum, { story: t.story, task: t.task }), zero()),
			tasks: gone.map((t) => ({ gid: t.gid, name: t.name, story_points: t.story, task_points: t.task })),
		}
	}
	if (!input.committed) {
		notes.push(
			'No commitment snapshot was posted and none could be rebuilt, so committed, added and removed are unavailable.',
		)
	} else if (input.committed.source === 'rebuilt') {
		notes.push(
			'No commitment snapshot was posted, so the commitment is rebuilt from task history. Tasks removed from the sprint cannot be found that way, so removed is unavailable; points are as they are now.',
		)
	}

	const all = totals(tasks, fields)
	const done = totals(completed, fields)
	const completion_rate = {
		count: pct(done.count, all.count),
		story: pct(done.points.story, all.points.story),
		task: pct(done.points.task, all.points.task),
	}

	const demoByStory = input.points_tracked.story
	const demoTasks = demoByStory ? completed.filter((t) => pointsOf(t, fields).story > 0) : completed

	const burndown = []
	const last = input.today < sprint.end ? input.today : sprint.end
	for (let day = sprint.start; day <= last; day = nextDay(day)) {
		const cutoff = Date.parse(startOfDayIn(nextDay(day), input.timezone))
		const finished = completed.filter((t) => t.completed_at != null && Date.parse(t.completed_at) < cutoff)
		const remaining = tasks.filter((t) => !finished.includes(t))
		burndown.push({
			date: day,
			completed: finished.filter(
				(t) => Date.parse(t.completed_at as string) >= Date.parse(startOfDayIn(day, input.timezone)),
			).length,
			remaining: { count: remaining.length, ...totals(remaining, fields).points },
		})
	}

	return {
		sprint,
		committed,
		completed: group(completed),
		added: group(added),
		removed,
		completion_rate,
		carry_over_candidates: open.map(item),
		burndown,
		demo: { basis: demoByStory ? ('story-points' as const) : ('completed' as const), tasks: demoTasks.map(item) },
		points_tracked: input.points_tracked,
		notes,
	}
}

export type RetroInput = SprintFacts & {
	/** `blocked_signals` of the policy. */
	signals: readonly string[]
	/** System stories by task GID, for the tasks that have them. */
	storiesOf: Record<string, TaskStory[]>
	/** The instant the report runs; an open block counts up to it. */
	now: string
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** R3: carry-over, scope change, blocked time, cycle time, and estimate against actual. Pure. */
export function buildRetro(input: RetroInput) {
	const report = buildSprintReport(input)
	const notes = [...report.notes]
	const { fields, tasks } = input

	const blockedTasks = []
	for (const t of tasks) {
		const found = blockedHours(input.storiesOf[t.gid] ?? [], input.signals, t.completed_at ?? input.now)
		if (found) {
			blockedTasks.push({
				gid: t.gid,
				name: t.name ?? '',
				hours: found.hours,
				open: found.intervals.some((i) => i.to === null),
			})
		}
	}
	if (blockedTasks.length === 0) {
		notes.push(
			'No system story showed a block (a dependency or a tag from blocked_signals), so no blocked time is reported. Blocked time is best effort from task history.',
		)
	}
	if (input.signals.some((s) => s.startsWith('state:'))) {
		notes.push('A state:<state> blocked signal leaves no history this report reads, so it adds no blocked time.')
	}

	const days = tasks
		.filter((t) => t.completed === true && t.completed_at && t.created_at)
		.map((t) => (Date.parse(t.completed_at as string) - Date.parse(t.created_at as string)) / DAY_MS)
		.sort((a, b) => a - b)
	const middle = Math.floor(days.length / 2)
	const median =
		days.length === 0
			? null
			: days.length % 2
				? days[middle]
				: ((days[middle - 1] as number) + (days[middle] as number)) / 2
	const cycle_time = {
		basis: 'created_at' as const,
		count: days.length,
		mean_days: days.length ? round1(days.reduce((a, b) => a + b, 0) / days.length) : null,
		median_days: median === null ? null : round1(median as number),
	}

	let estimate_vs_actual: {
		tasks: Array<{ gid: string; name: string; estimate: Points; actual: Points }>
		totals: { estimate: Points; actual: Points }
	} | null = null
	if (input.committed?.source === 'snapshot') {
		const estimates = new Map(input.committed.tasks.map((t) => [t.gid, { story: t.story, task: t.task }]))
		const rows = tasks
			.filter((t) => t.completed === true && estimates.has(t.gid))
			.map((t) => ({
				gid: t.gid,
				name: t.name ?? '',
				estimate: estimates.get(t.gid) as Points,
				actual: pointsOf(t, fields),
			}))
		estimate_vs_actual = {
			tasks: rows,
			totals: {
				estimate: rows.reduce((sum, r) => add(sum, r.estimate), zero()),
				actual: rows.reduce((sum, r) => add(sum, r.actual), zero()),
			},
		}
	} else {
		notes.push(
			'Estimate against actual needs the commitment snapshot: it holds the points each task was committed with, and the task now carries the actuals. None was posted, so it is unavailable.',
		)
	}

	return {
		sprint: input.sprint,
		carry_over: report.carry_over_candidates,
		scope_change: {
			source: report.committed.source,
			added: report.added,
			removed: report.removed,
		},
		blocked: {
			tasks: blockedTasks,
			total_hours: round1(blockedTasks.reduce((sum, t) => sum + t.hours, 0)),
		},
		cycle_time,
		estimate_vs_actual,
		points_tracked: input.points_tracked,
		notes,
	}
}

export type ClosedSprint = { n: number; name: string; completed: { count: number; points: Points } }

/** R4: the last `window` closed sprints and the mean of each figure. Pure. */
export function velocityOf(closed: ClosedSprint[], window: number) {
	const sprints = [...closed].sort((a, b) => a.n - b.n).slice(-window)
	const mean =
		sprints.length === 0
			? null
			: {
					count: round1(sprints.reduce((s, c) => s + c.completed.count, 0) / sprints.length),
					story: round1(sprints.reduce((s, c) => s + c.completed.points.story, 0) / sprints.length),
					task: round1(sprints.reduce((s, c) => s + c.completed.points.task, 0) / sprints.length),
				}
	return { window, sprints, mean }
}

/** Completed work of one sprint: its completed tasks finished by the end of its last day. */
export function completedBy(
	tasks: StandupTask[],
	sprint: Sprint,
	timezone: string,
	fields: Fields,
): ClosedSprint['completed'] {
	const cutoff = Date.parse(startOfDayIn(nextDay(sprint.end), timezone))
	const done = tasks.filter(
		(t) => t.completed === true && t.completed_at != null && Date.parse(t.completed_at) < cutoff,
	)
	return totals(done, fields)
}
