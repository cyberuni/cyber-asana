import { type LoadReferenceMetadataOptions, loadReferenceMetadata } from '../../platform/reference-metadata.js'
import type { ScrumPolicy } from '../policy.js'

/** The reference whose frontmatter holds the workload report's thresholds (§ 5.4 of the design). */
const WORKLOAD_REFERENCE = 'cyber-asana.report.workload'

export type WorkloadSettings = {
	/** Utilization above this percentage flags a person `over`. */
	over_allocation_pct: number
	/** Utilization below this percentage flags a person `under`. */
	under_allocation_pct: number
}

export const DEFAULT_WORKLOAD_SETTINGS: Readonly<WorkloadSettings> = Object.freeze({
	over_allocation_pct: 100,
	under_allocation_pct: 60,
})

function fail(key: string, rule: string): never {
	throw new Error(`${WORKLOAD_REFERENCE}: ${key} must be ${rule}`)
}

const positive = (key: string, value: unknown): number => {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) fail(key, 'a positive number')
	return value
}

/** The workload settings from a reference's frontmatter; a bad value throws so a typo reports itself. */
export function parseWorkloadSettings(metadata: Record<string, unknown>): WorkloadSettings {
	const settings: WorkloadSettings = { ...DEFAULT_WORKLOAD_SETTINGS }
	const { over_allocation_pct, under_allocation_pct } = metadata
	if (over_allocation_pct !== undefined && over_allocation_pct !== null) {
		settings.over_allocation_pct = positive('over_allocation_pct', over_allocation_pct)
	}
	if (under_allocation_pct !== undefined && under_allocation_pct !== null) {
		settings.under_allocation_pct = positive('under_allocation_pct', under_allocation_pct)
	}
	if (settings.under_allocation_pct > settings.over_allocation_pct) {
		fail('under_allocation_pct', 'not above over_allocation_pct')
	}
	return settings
}

/** The workload settings from the resolved `cyber-asana.report.workload` reference, or the defaults. */
export async function loadWorkloadSettings(opts: LoadReferenceMetadataOptions = {}): Promise<WorkloadSettings> {
	return (await loadReferenceMetadata(WORKLOAD_REFERENCE, parseWorkloadSettings, opts)) ?? parseWorkloadSettings({})
}

type Person = { gid: string; name?: string }

/** The task fields the workload report reads. */
export type WorkloadTask = {
	gid: string
	name?: string
	completed?: boolean | null
	due_on?: string | null
	assignee?: Person | null
	custom_fields?: Array<{ gid?: string; number_value?: number | null }> | null
}

/** An allocation as the report reads it. */
export type WorkloadAllocation = {
	gid?: string
	assignee?: Person | null
	parent?: { gid?: string; name?: string } | null
	start_date?: string | null
	end_date?: string | null
	effort?: { type?: 'hours' | 'percent'; value?: number } | null
}

export type OooRange = { start_date: string; end_date: string }

type CapacityUnknownReason = 'plan' | 'no-allocation'

export type WorkloadInput = {
	scope: string
	/** The dates capacity is clipped to, `YYYY-MM-DD`, inclusive. */
	window: { from: string; to: string }
	policy: Pick<ScrumPolicy, 'hours_per_point' | 'working_hours_per_day' | 'working_days'>
	settings: WorkloadSettings
	/** The scope's tasks in the window; completed ones are ignored. */
	tasks: WorkloadTask[]
	fields: { story: Set<string>; task: Set<string> }
	/** Allocations on the scope's projects, or `unavailable` when Asana answered 402. */
	capacity: { status: 'ok'; allocations: WorkloadAllocation[] } | { status: 'unavailable'; reason: 'plan' }
	/** Out-of-office ranges by person GID, shown beside capacity and never subtracted from it (D9). */
	ooo?: Record<string, OooRange[]>
}

type Hours = { story: number; task: number; total: number }

type PersonCapacity =
	| {
			status: 'known'
			hours: number
			allocations: Array<{ gid?: string; project?: string; from: string; to: string; effort: string; hours: number }>
	  }
	| { status: 'unknown'; reason: CapacityUnknownReason }

type WorkloadPerson = {
	person: Person
	tasks: number
	story_points: number
	task_points: number
	effort_hours: Hours
	capacity: PersonCapacity
	utilization_pct: number | null
	flag: 'over' | 'under' | 'ok' | 'unknown'
	ooo?: OooRange[]
}

export type Workload = {
	people: WorkloadPerson[]
	team: {
		people: number
		tasks: number
		story_points: number
		task_points: number
		effort_hours: Hours
		/** Allocated hours of the people whose capacity is known; null when nobody's is. */
		capacity_hours: number | null
		capacity_unknown: number
		/** Load over capacity for the people whose capacity is known, so unknown capacity never skews it. */
		utilization_pct: number | null
	}
	unassigned_tasks: number
	points_tracked: { story: boolean; task: boolean }
	notes: string[]
}

const DAY_MS = 86_400_000
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const toDay = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS)
const round = (n: number) => Math.round(n * 10) / 10

/** Days from `start` to `end`, both included, that fall on one of `workingDays`. */
export function countWorkingDays(start: string, end: string, workingDays: readonly string[]): number {
	let count = 0
	for (let day = toDay(start); day <= toDay(end); day++) {
		if (workingDays.includes(WEEKDAYS[new Date(day * DAY_MS).getUTCDay()] as string)) count++
	}
	return count
}

/**
 * Capacity for one allocation inside the window. Percent is `percent × working_hours_per_day ×
 * working days inside`; hours are as given, in proportion to the share of the allocation's own
 * working days that lie inside the window (all of them when it sits wholly inside).
 */
function allocationHours(
	a: WorkloadAllocation,
	input: WorkloadInput,
): { from: string; to: string; hours: number } | null {
	if (!a.start_date || !a.end_date || a.effort?.value === undefined || a.effort.value === null) return null
	const from = a.start_date > input.window.from ? a.start_date : input.window.from
	const to = a.end_date < input.window.to ? a.end_date : input.window.to
	if (from > to) return null
	const { working_days, working_hours_per_day } = input.policy
	const inside = countWorkingDays(from, to, working_days)
	if (a.effort.type === 'percent') return { from, to, hours: (a.effort.value / 100) * working_hours_per_day * inside }
	const whole = countWorkingDays(a.start_date, a.end_date, working_days)
	return { from, to, hours: whole === 0 ? 0 : a.effort.value * (inside / whole) }
}

/** Per person load, capacity, and utilization. Pure: every Asana read has already happened. */
export function buildWorkload(input: WorkloadInput): Workload {
	const { policy, fields, settings } = input
	const notes: string[] = []
	const pointOf = (t: WorkloadTask, ids: Set<string>) =>
		(t.custom_fields ?? []).reduce(
			(sum, f) => sum + (f.gid !== undefined && ids.has(f.gid) ? (f.number_value ?? 0) : 0),
			0,
		)

	const people = new Map<string, { person: Person; tasks: number; story: number; task: number }>()
	const entry = (p: Person) => {
		const existing = people.get(p.gid)
		if (existing) {
			if (existing.person.name === undefined && p.name !== undefined) existing.person.name = p.name
			return existing
		}
		const created = {
			person: { gid: p.gid, ...(p.name !== undefined && { name: p.name }) },
			tasks: 0,
			story: 0,
			task: 0,
		}
		people.set(p.gid, created)
		return created
	}

	let unassigned = 0
	for (const t of input.tasks) {
		if (t.completed === true) continue
		if (!t.assignee?.gid) {
			unassigned++
			continue
		}
		const e = entry({ gid: t.assignee.gid, ...(t.assignee.name !== undefined && { name: t.assignee.name }) })
		e.tasks++
		e.story += pointOf(t, fields.story)
		e.task += pointOf(t, fields.task)
	}

	const byPerson = new Map<string, NonNullable<PersonCapacity & { status: 'known' }>>()
	if (input.capacity.status === 'ok') {
		let undated = 0
		for (const a of input.capacity.allocations) {
			const gid = a.assignee?.gid
			const clipped = allocationHours(a, input)
			if (!gid) continue
			if (!a.start_date || !a.end_date || a.effort?.value === undefined) undated++
			if (!clipped) continue
			entry({ gid, ...(a.assignee?.name !== undefined && { name: a.assignee.name }) })
			const known = byPerson.get(gid) ?? { status: 'known' as const, hours: 0, allocations: [] }
			known.hours += clipped.hours
			known.allocations.push({
				...(a.gid !== undefined && { gid: a.gid }),
				...(a.parent?.gid !== undefined && { project: a.parent.gid }),
				from: clipped.from,
				to: clipped.to,
				effort: `${a.effort?.value}${a.effort?.type === 'percent' ? '%' : ' h'}`,
				hours: round(clipped.hours),
			})
			byPerson.set(gid, known)
		}
		if (undated > 0) notes.push(`${undated} allocation(s) with no dates or no effort were ignored.`)
	} else {
		notes.push(
			'Capacity is unknown: Asana answered 402, so the workspace plan does not include allocations. The load is still shown.',
		)
	}

	const hoursOf = (story: number, task: number): Hours => ({
		story: round(story * policy.hours_per_point),
		task: round(task * policy.hours_per_point),
		total: round((story + task) * policy.hours_per_point),
	})

	const rows: WorkloadPerson[] = [...people.values()]
		.map((p) => {
			const effort = hoursOf(p.story, p.task)
			const known = byPerson.get(p.person.gid)
			const capacity: PersonCapacity = known
				? { ...known, hours: round(known.hours) }
				: { status: 'unknown', reason: input.capacity.status === 'unavailable' ? 'plan' : 'no-allocation' }
			const utilization =
				known && known.hours > 0 ? round(((p.story + p.task) * policy.hours_per_point * 100) / known.hours) : null
			const flag: WorkloadPerson['flag'] = !known
				? 'unknown'
				: known.hours === 0
					? effort.total > 0
						? 'over'
						: 'ok'
					: (utilization as number) > settings.over_allocation_pct
						? 'over'
						: (utilization as number) < settings.under_allocation_pct
							? 'under'
							: 'ok'
			const ooo = input.ooo?.[p.person.gid]
			return {
				person: p.person,
				tasks: p.tasks,
				story_points: p.story,
				task_points: p.task,
				effort_hours: effort,
				capacity,
				utilization_pct: utilization,
				flag,
				...(ooo && ooo.length > 0 && { ooo }),
			}
		})
		.sort((a, b) => (a.person.name ?? a.person.gid).localeCompare(b.person.name ?? b.person.gid))

	const sum = (pick: (r: WorkloadPerson) => number) => rows.reduce((s, r) => s + pick(r), 0)
	const knownRows = rows.filter((r) => r.capacity.status === 'known')
	const capacityHours = knownRows.reduce((s, r) => s + (r.capacity.status === 'known' ? r.capacity.hours : 0), 0)
	const knownLoad = knownRows.reduce((s, r) => s + r.effort_hours.total, 0)
	return {
		people: rows,
		team: {
			people: rows.length,
			tasks: sum((r) => r.tasks),
			story_points: sum((r) => r.story_points),
			task_points: sum((r) => r.task_points),
			effort_hours: {
				story: round(sum((r) => r.effort_hours.story)),
				task: round(sum((r) => r.effort_hours.task)),
				total: round(sum((r) => r.effort_hours.total)),
			},
			capacity_hours: knownRows.length > 0 ? round(capacityHours) : null,
			capacity_unknown: rows.length - knownRows.length,
			utilization_pct: knownRows.length > 0 && capacityHours > 0 ? round((knownLoad * 100) / capacityHours) : null,
		},
		unassigned_tasks: unassigned,
		points_tracked: { story: fields.story.size > 0, task: fields.task.size > 0 },
		notes,
	}
}
