import { type LoadReferenceMetadataOptions, loadReferenceMetadata } from '../../platform/reference-metadata.js'
import type { ScrumPolicy } from '../policy.js'
import type { Workload } from './workload.js'

/** The reference whose frontmatter holds the health report's thresholds (§ 5.4 of the design). */
const HEALTH_REFERENCE = 'cyber-asana.report.health'

export const HEALTH_CHECKS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'H11'] as const
type HealthCheckId = (typeof HEALTH_CHECKS)[number]

const CHECK_NAMES: Record<HealthCheckId, string> = {
	H1: 'a sprint task has no estimate',
	H2: 'a parent task carries points',
	H3: 'a sprint task is unassigned',
	H4: 'a sprint task is overdue',
	H5: 'an in-progress task has not changed for stale_days',
	H6: 'a person has more than wip_limit tasks in progress',
	H7: 'a sprint task is blocked',
	H8: 'the sprint is over capacity',
	H9: 'the sprint has no section or option',
	H10: 'a closed sprint still holds incomplete tasks',
	H11: 'a task is in two sprints',
}

export type HealthSettings = {
	checks: HealthCheckId[]
	stale_days: number
	wip_limit: number
	overdue_grace_days: number
}

export const DEFAULT_HEALTH_SETTINGS: Readonly<HealthSettings> = Object.freeze({
	checks: [...HEALTH_CHECKS],
	stale_days: 3,
	wip_limit: 3,
	overdue_grace_days: 0,
})

function fail(key: string, rule: string): never {
	throw new Error(`${HEALTH_REFERENCE}: ${key} must be ${rule}`)
}

const integerAtLeast = (key: string, value: unknown, min: number): number => {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
		fail(key, min === 0 ? 'a non-negative integer' : 'a positive integer')
	}
	return value
}

/** The health settings from a reference's frontmatter; a bad value throws so a typo reports itself. */
export function parseHealthSettings(metadata: Record<string, unknown>): HealthSettings {
	const settings: HealthSettings = structuredClone({ ...DEFAULT_HEALTH_SETTINGS }) as HealthSettings
	const { checks, stale_days, wip_limit, overdue_grace_days } = metadata
	if (checks !== undefined && checks !== null) {
		const rule = `a non-empty list of distinct check IDs (${HEALTH_CHECKS.join(', ')})`
		if (
			!Array.isArray(checks) ||
			checks.length === 0 ||
			new Set(checks).size !== checks.length ||
			!checks.every((c) => (HEALTH_CHECKS as readonly unknown[]).includes(c))
		) {
			fail('checks', rule)
		}
		settings.checks = checks as HealthCheckId[]
	}
	if (stale_days !== undefined && stale_days !== null) settings.stale_days = integerAtLeast('stale_days', stale_days, 1)
	if (wip_limit !== undefined && wip_limit !== null) settings.wip_limit = integerAtLeast('wip_limit', wip_limit, 1)
	if (overdue_grace_days !== undefined && overdue_grace_days !== null) {
		settings.overdue_grace_days = integerAtLeast('overdue_grace_days', overdue_grace_days, 0)
	}
	return settings
}

/** The health settings from the resolved `cyber-asana.report.health` reference, or the defaults. */
export async function loadHealthSettings(opts: LoadReferenceMetadataOptions = {}): Promise<HealthSettings> {
	return (await loadReferenceMetadata(HEALTH_REFERENCE, parseHealthSettings, opts)) ?? parseHealthSettings({})
}

/** The task fields the health report reads. */
export type HealthTask = {
	gid: string
	name?: string
	completed?: boolean | null
	due_on?: string | null
	modified_at?: string | null
	permalink_url?: string | null
	num_subtasks?: number | null
	assignee?: { gid?: string; name?: string } | null
	tags?: Array<{ name?: string }> | null
	custom_fields?: Array<{
		gid?: string
		number_value?: number | null
		enum_value?: { name?: string } | null
	}> | null
}

type TaskRef = { gid: string; name: string; url?: string }
type Dependency = { gid: string; name?: string; completed?: boolean }

type HealthFinding = {
	check: HealthCheckId
	level: 'error' | 'warning'
	message: string
	task?: TaskRef
	/** H6 only: the person over the limit, with `tasks` their in-progress tasks. */
	person?: { gid: string; name?: string }
	tasks?: TaskRef[]
	/** The command that fixes it (or, for H6, that reassigns the first task). */
	fix: string
}

type HealthCheckResult = {
	id: HealthCheckId
	name: string
	status: 'passed' | 'failed' | 'skipped'
	findings: number
	/** Why a skipped check did not run. */
	reason?: string
}

export type Health = {
	checks: HealthCheckResult[]
	findings: HealthFinding[]
	counts: { error: number; warning: number }
	/** How in progress was decided for H5 and H6. */
	in_progress_basis: 'status-field' | 'incomplete-and-assigned'
	notes: string[]
}

export type HealthInput = {
	scope: string
	settings: HealthSettings
	policy: ScrumPolicy
	/** Today in the user's timezone, `YYYY-MM-DD`. */
	today: string
	/** ISO instant of now, for staleness. */
	now: string
	/** The sprint under check. */
	sprint: { n: number; name: string }
	/** The sprint's tasks, completed or not; unset when the sprint has no section anywhere. */
	sprintTasks?: HealthTask[]
	/** Projects of the scope that lack the sprint's section or option. */
	missingProjects: string[]
	/** Each existing sprint's incomplete tasks, for H10 and H11; unset when neither is enabled. */
	allSprints?: Array<{ n: number; name: string; tasks: HealthTask[] }>
	/** The index of today's sprint, for H10. */
	currentN: number
	/**
	 * What H8 reads: the sprint's workload against Allocations capacity, or why capacity could not be
	 * read (a 402). Unset when H8 is not enabled or no capacity read was made.
	 */
	capacity?: { workload: Workload } | { skipped: string }
	fields: { story: Set<string>; task: Set<string>; status: Set<string> }
	dependenciesOf: (taskGid: string) => Promise<Dependency[]>
}

const DAY_MS = 86_400_000
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
const daysBetween = (from: string, to: string) =>
	(Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS

const ref = (t: HealthTask): TaskRef => ({
	gid: t.gid,
	name: t.name ?? '',
	...(t.permalink_url && { url: t.permalink_url }),
})

/** Run the enabled checks over the sprint's tasks. Pure but for the dependency lookups. */
export async function buildHealth(input: HealthInput): Promise<Health> {
	const { settings, policy, fields, sprint, scope } = input
	const notes: string[] = []
	const findings: HealthFinding[] = []
	const checks: HealthCheckResult[] = []

	const pointFields = new Set([...fields.story, ...fields.task])
	const fixField = [...fields.story, ...fields.task][0]
	const statusOf = (t: HealthTask) =>
		t.custom_fields?.find((f) => f.gid !== undefined && fields.status.has(f.gid))?.enum_value?.name
	const points = (t: HealthTask) =>
		(t.custom_fields ?? []).reduce(
			(sum, f) => sum + (f.gid !== undefined && pointFields.has(f.gid) ? (f.number_value ?? 0) : 0),
			0,
		)

	const byState = policy.state_carrier === 'field' && fields.status.size > 0
	const basis = byState ? ('status-field' as const) : ('incomplete-and-assigned' as const)

	const open = (input.sprintTasks ?? []).filter((t) => t.completed !== true)
	const inProgress = open.filter((t) =>
		byState
			? statusOf(t) !== undefined && same(statusOf(t) as string, policy.workflow_states.in_progress)
			: t.assignee?.gid !== undefined,
	)

	const run = async (id: HealthCheckId, body: () => Promise<HealthFinding[] | string>) => {
		if (!settings.checks.includes(id)) return
		const result = await body()
		if (typeof result === 'string') {
			checks.push({ id, name: CHECK_NAMES[id], status: 'skipped', findings: 0, reason: result })
			return
		}
		findings.push(...result)
		checks.push({ id, name: CHECK_NAMES[id], status: result.length > 0 ? 'failed' : 'passed', findings: result.length })
	}
	const NO_SECTION = `${sprint.name} has no section in any project of scope ${scope}`
	const needSprint = (id: HealthCheckId, fn: () => Promise<HealthFinding[] | string> | HealthFinding[] | string) =>
		run(id, async () => (input.sprintTasks === undefined ? NO_SECTION : fn()))
	const finding = (
		check: HealthCheckId,
		level: HealthFinding['level'],
		t: HealthTask,
		message: string,
		fix: string,
	): HealthFinding => ({ check, level, message, task: ref(t), fix })

	await needSprint('H1', () => {
		if (pointFields.size === 0) return 'no points field is registered for the scope'
		return open
			.filter((t) => (t.num_subtasks ?? 0) === 0 && points(t) === 0)
			.map((t) =>
				finding(
					'H1',
					'warning',
					t,
					`${t.name} has no estimate`,
					`cyber-asana task update ${t.gid} --custom-field ${fixField}=<points>`,
				),
			)
	})
	await needSprint('H2', () =>
		open
			.filter((t) => (t.num_subtasks ?? 0) > 0 && points(t) > 0)
			.map((t) =>
				finding(
					'H2',
					'warning',
					t,
					`${t.name} has subtasks and carries points; parents carry none`,
					`cyber-asana task update ${t.gid} --custom-field ${fixField}=0`,
				),
			),
	)
	await needSprint('H3', () =>
		open
			.filter((t) => !t.assignee?.gid)
			.map((t) =>
				finding('H3', 'warning', t, `${t.name} is unassigned`, `cyber-asana task update ${t.gid} --assignee me`),
			),
	)
	await needSprint('H4', () =>
		open
			.filter((t) => t.due_on && daysBetween(t.due_on, input.today) > settings.overdue_grace_days)
			.map((t) =>
				finding('H4', 'error', t, `${t.name} was due ${t.due_on}`, `cyber-asana task update ${t.gid} --due-on <date>`),
			),
	)
	if (!byState) {
		notes.push(
			policy.state_carrier === 'field'
				? 'state_carrier is field but no status field is registered for the scope, so in progress means incomplete and assigned.'
				: `state_carrier is ${policy.state_carrier}: completion is the only state, so in progress means incomplete and assigned.`,
		)
	}
	await needSprint('H5', () =>
		inProgress
			.filter((t) => t.modified_at && Date.parse(t.modified_at) <= Date.parse(input.now) - settings.stale_days * DAY_MS)
			.map((t) =>
				finding(
					'H5',
					'warning',
					t,
					`${t.name} has not changed since ${t.modified_at}`,
					`cyber-asana story create "<update>" --task-gid ${t.gid}`,
				),
			),
	)
	await needSprint('H6', () => {
		const byPerson = new Map<string, HealthTask[]>()
		for (const t of inProgress)
			byPerson.set(t.assignee?.gid as string, [...(byPerson.get(t.assignee?.gid as string) ?? []), t])
		return [...byPerson.values()]
			.filter((tasks) => tasks.length > settings.wip_limit)
			.map((tasks) => {
				const a = tasks[0]?.assignee as { gid: string; name?: string }
				return {
					check: 'H6' as const,
					level: 'warning' as const,
					message: `${a.name ?? a.gid} has ${tasks.length} tasks in progress (limit ${settings.wip_limit})`,
					person: { gid: a.gid, ...(a.name !== undefined && { name: a.name }) },
					tasks: tasks.map(ref),
					fix: `cyber-asana task update ${tasks[0]?.gid} --assignee <user>`,
				}
			})
	})
	await run('H7', async () => {
		if (input.sprintTasks === undefined) return NO_SECTION
		const found: HealthFinding[] = []
		for (const t of open) {
			const why: string[] = []
			for (const signal of policy.blocked_signals) {
				if (signal === 'dependency') {
					for (const d of await input.dependenciesOf(t.gid)) {
						if (d.completed !== true) why.push(`blocked by ${d.gid}${d.name ? ` ${d.name}` : ''}`)
					}
				} else if (signal.startsWith('tag:')) {
					const tag = signal.slice(4)
					if ((t.tags ?? []).some((x) => x.name !== undefined && same(x.name, tag))) why.push(`tagged ${tag}`)
				} else if (signal.startsWith('state:') && byState) {
					const state = signal.slice(6) as keyof ScrumPolicy['workflow_states']
					const status = statusOf(t)
					if (status !== undefined && same(status, policy.workflow_states[state])) why.push(`in state ${state}`)
				}
			}
			if (why.length > 0) {
				found.push(
					finding('H7', 'warning', t, `${t.name} is ${why.join('; ')}`, `cyber-asana task dependency list ${t.gid}`),
				)
			}
		}
		return found
	})
	await needSprint('H8', () => {
		const capacity = input.capacity
		if (capacity === undefined) return 'capacity unknown: allocations were not read'
		if ('skipped' in capacity) return `capacity unknown: ${capacity.skipped}`
		const people = capacity.workload.people
		const known = people.filter((p) => p.capacity.status === 'known')
		if (known.length === 0) return 'capacity unknown: no allocation overlaps the sprint dates'
		const unknown = people.filter((p) => p.capacity.status === 'unknown')
		if (unknown.length > 0) {
			notes.push(
				`H8 could not check ${unknown.map((p) => p.person.name ?? p.person.gid).join(', ')}: capacity is unknown, so they are neither flagged nor counted as fine.`,
			)
		}
		return known
			.filter((p) => p.flag === 'over')
			.map((p) => {
				const hours = p.capacity.status === 'known' ? p.capacity.hours : 0
				return {
					check: 'H8' as const,
					level: 'error' as const,
					message: `${p.person.name ?? p.person.gid} has ${p.effort_hours.total} h of work for ${hours} h of capacity${p.utilization_pct === null ? '' : ` (${p.utilization_pct}%)`}`,
					person: { gid: p.person.gid, ...(p.person.name !== undefined && { name: p.person.name }) },
					fix: `cyber-asana report workload --scope ${scope} --sprint ${sprint.n}`,
				}
			})
	})
	await run('H9', async () =>
		input.missingProjects.map((project) => ({
			check: 'H9' as const,
			level: 'error' as const,
			message: `${sprint.name} has no section in project ${project}`,
			fix: `cyber-asana sprint start --sprint ${sprint.n} --scope ${scope}`,
		})),
	)
	await run('H10', async () => {
		if (!input.allSprints) return 'no sprint listing was read'
		return input.allSprints
			.filter((s) => s.n < input.currentN)
			.flatMap((s) =>
				s.tasks
					.filter((t) => t.completed !== true)
					.map((t) =>
						finding(
							'H10',
							'warning',
							t,
							`${t.name} is incomplete in closed ${s.name}`,
							`cyber-asana sprint close --sprint ${s.n} --scope ${scope}`,
						),
					),
			)
	})
	await run('H11', async () => {
		if (!input.allSprints) return 'no sprint listing was read'
		const homes = new Map<string, { task: HealthTask; sprints: Array<{ n: number; name: string }> }>()
		for (const s of input.allSprints) {
			for (const t of s.tasks) {
				if (t.completed === true) continue
				const entry = homes.get(t.gid) ?? { task: t, sprints: [] }
				entry.sprints.push({ n: s.n, name: s.name })
				homes.set(t.gid, entry)
			}
		}
		return [...homes.values()]
			.filter((e) => e.sprints.length > 1)
			.map((e) => {
				const latest = e.sprints.reduce((a, b) => (b.n > a.n ? b : a))
				return finding(
					'H11',
					'error',
					e.task,
					`${e.task.name} is in ${e.sprints.map((s) => s.name).join(' and ')}`,
					`cyber-asana sprint add ${e.task.gid} --sprint ${latest.n} --scope ${scope}`,
				)
			})
	})

	const order = new Map(HEALTH_CHECKS.map((id, i) => [id, i]))
	checks.sort((a, b) => (order.get(a.id) as number) - (order.get(b.id) as number))
	return {
		checks,
		findings,
		counts: {
			error: findings.filter((f) => f.level === 'error').length,
			warning: findings.filter((f) => f.level === 'warning').length,
		},
		in_progress_basis: basis,
		notes,
	}
}
