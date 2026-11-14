import type { ScrumPolicy } from '../policy.js'

/** The task fields the standup reads; Asana's compact task plus the ones `report standup` asks for. */
export type StandupTask = {
	gid: string
	name?: string
	completed?: boolean | null
	completed_at?: string | null
	due_on?: string | null
	permalink_url?: string | null
	assignee?: { gid?: string; name?: string } | null
	tags?: Array<{ name?: string }> | null
	custom_fields?: Array<{
		gid?: string
		number_value?: number | null
		enum_value?: { name?: string } | null
	}> | null
}

export type Member = { gid: string; name?: string }

type Dependency = { gid: string; name?: string; completed?: boolean }

export type Blocker = { signal: string; task?: { gid: string; name?: string } }

export type StandupItem = {
	gid: string
	name: string
	due_on?: string
	url?: string
	completed_at?: string
	story_points?: number
	task_points?: number
	reason?: string
	blockers?: Blocker[]
}

export type Points = { story: number; task: number }

export type StandupGroup = { count: number; points: Points; tasks: StandupItem[] }

export type Standup = {
	done: StandupGroup
	today: StandupGroup
	blocked: StandupGroup
	/** How Today was chosen: by workflow state, or the fallback when no state is carried. */
	today_basis: 'in-progress-or-due' | 'incomplete-and-assigned'
	/** Whether each points field is registered for the scope; a missing one shows no figure. */
	points_tracked: { story: boolean; task: boolean }
	/** What the report fell back on, or could not read, in words. */
	notes: string[]
}

export type StandupInput = {
	member: Member
	/** Today in the user's timezone, `YYYY-MM-DD`. */
	today: string
	/** ISO instant the Done window opens. */
	since: string
	/** Every incomplete task of the scope plus those completed since `since` (Asana's own list). */
	tasks: StandupTask[]
	/** The current sprint's open task GIDs; unset when there is no sprint, so no sprint filter applies. */
	sprintGids?: Set<string>
	policy: ScrumPolicy
	/** GIDs of the custom fields registered for each role across the scope's projects. */
	fields: { story: Set<string>; task: Set<string>; status: Set<string> }
	dependenciesOf: (taskGid: string) => Promise<Dependency[]>
}

const DAY_MS = 86_400_000
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

const toMs = (date: string) => Date.parse(`${date}T00:00:00Z`)
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10)

function offsetMs(instant: number, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(new Date(instant))
	const n = (type: string) => Number(parts.find((p) => p.type === type)?.value)
	const local = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'))
	return local - Math.floor(instant / 1000) * 1000
}

/** The instant a calendar date begins in a timezone. */
function startOfDayIn(date: string, timeZone: string): string {
	const utc = toMs(date)
	let instant = utc - offsetMs(utc, timeZone)
	instant = utc - offsetMs(instant, timeZone) // settle across a daylight-saving change
	return new Date(instant).toISOString()
}

/**
 * Where the Done window opens: midnight, in the user's timezone, of the previous working day or of
 * the day `<n>d` back. Everything completed from then until now counts as done.
 */
export function standupWindowStart(
	setting: string,
	today: string,
	workingDays: readonly string[],
	timeZone: string,
): { from: string; since: string } {
	let from: string
	const back = /^(\d+)d$/.exec(setting)
	if (back) {
		from = fromMs(toMs(today) - Number(back[1]) * DAY_MS)
	} else {
		let day = toMs(today) - DAY_MS
		for (let i = 0; i < 7 && !workingDays.includes(WEEKDAYS[new Date(day).getUTCDay()] as string); i++) day -= DAY_MS
		from = fromMs(day)
	}
	return { from, since: startOfDayIn(from, timeZone) }
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Compute a member's standup from the scope's tasks. Pure but for the dependency lookups. */
export async function buildStandup(input: StandupInput): Promise<Standup> {
	const { policy, fields, today } = input
	const notes: string[] = []
	const mine = input.tasks.filter((t) => t.assignee?.gid === input.member.gid)

	const statusOf = (t: StandupTask) =>
		t.custom_fields?.find((f) => f.gid !== undefined && fields.status.has(f.gid))?.enum_value?.name
	const pointsOf = (t: StandupTask) => {
		const sum = (gids: Set<string>) =>
			(t.custom_fields ?? []).reduce(
				(total, f) => total + (f.gid !== undefined && gids.has(f.gid) ? (f.number_value ?? 0) : 0),
				0,
			)
		return { story: sum(fields.story), task: sum(fields.task) }
	}
	const item = (t: StandupTask, extra: Partial<StandupItem> = {}): StandupItem => {
		const points = pointsOf(t)
		return {
			gid: t.gid,
			name: t.name ?? '',
			...(t.due_on && { due_on: t.due_on }),
			...(t.permalink_url && { url: t.permalink_url }),
			...(t.completed_at && { completed_at: t.completed_at }),
			...(fields.story.size > 0 && { story_points: points.story }),
			...(fields.task.size > 0 && { task_points: points.task }),
			...extra,
		}
	}
	const group = (tasks: Array<{ task: StandupTask; extra?: Partial<StandupItem> }>): StandupGroup => {
		const points = tasks.reduce(
			(total, { task }) => {
				const p = pointsOf(task)
				return { story: total.story + p.story, task: total.task + p.task }
			},
			{ story: 0, task: 0 },
		)
		return { count: tasks.length, points, tasks: tasks.map(({ task, extra }) => item(task, extra)) }
	}

	const since = Date.parse(input.since)
	const done = mine.filter((t) => t.completed === true && t.completed_at != null && Date.parse(t.completed_at) >= since)
	const open = mine.filter((t) => t.completed !== true && (input.sprintGids?.has(t.gid) ?? true))

	const byState = policy.state_carrier === 'field' && fields.status.size > 0
	if (!byState) {
		notes.push(
			policy.state_carrier === 'field'
				? 'state_carrier is field but no status field is registered for the scope, so Today lists every incomplete assigned task.'
				: `state_carrier is ${policy.state_carrier}: completion is the only state, so Today lists every incomplete assigned task.`,
		)
	}
	const inProgress = policy.workflow_states.in_progress
	const todayTasks: Array<{ task: StandupTask; extra?: Partial<StandupItem> }> = []
	for (const task of open) {
		if (!byState) {
			todayTasks.push({ task })
			continue
		}
		const status = statusOf(task)
		if (status !== undefined && same(status, inProgress)) todayTasks.push({ task, extra: { reason: 'in progress' } })
		else if (task.due_on === today) todayTasks.push({ task, extra: { reason: 'due today' } })
		else if (task.due_on && task.due_on < today) todayTasks.push({ task, extra: { reason: 'overdue' } })
	}

	const blockedTasks: Array<{ task: StandupTask; extra: Partial<StandupItem> }> = []
	for (const task of open) {
		const blockers: Blocker[] = []
		for (const signal of policy.blocked_signals) {
			if (signal === 'dependency') {
				for (const dep of await input.dependenciesOf(task.gid)) {
					if (dep.completed !== true) {
						blockers.push({ signal, task: { gid: dep.gid, ...(dep.name !== undefined && { name: dep.name }) } })
					}
				}
			} else if (signal.startsWith('tag:')) {
				const tag = signal.slice('tag:'.length)
				if ((task.tags ?? []).some((t) => t.name !== undefined && same(t.name, tag))) blockers.push({ signal })
			} else if (signal.startsWith('state:')) {
				const state = signal.slice('state:'.length) as keyof ScrumPolicy['workflow_states']
				const status = statusOf(task)
				if (byState && status !== undefined && same(status, policy.workflow_states[state])) blockers.push({ signal })
			}
		}
		if (blockers.length > 0) blockedTasks.push({ task, extra: { blockers } })
	}
	if (!byState && policy.blocked_signals.some((s) => s.startsWith('state:'))) {
		notes.push('A state:<state> blocked signal needs a status field, so it was skipped.')
	}

	return {
		done: group(done.map((task) => ({ task }))),
		today: group(todayTasks),
		blocked: group(blockedTasks),
		today_basis: byState ? 'in-progress-or-due' : 'incomplete-and-assigned',
		points_tracked: { story: fields.story.size > 0, task: fields.task.size > 0 },
		notes,
	}
}
