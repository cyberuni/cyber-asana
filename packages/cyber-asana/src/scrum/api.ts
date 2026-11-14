import type { AllocationGateway } from '../allocations/gateway.js'
import type { ScopeSource, ScopeStore, ScopeStoreOptions } from '../config/scope-store.js'
import type { ScopeEntry } from '../config/scopes.js'
import type { OooGateway } from '../ooo/gateway.js'
import { CodedConfigError } from '../platform/coded-error.js'
import { envValue } from '../platform/env.js'
import { buildErrorBody, PLAN_LIMITATION_STATUS } from '../platform/error-body.js'
import { listItems } from '../platform/pagination.js'
import type { StatusGateway } from '../status/gateway.js'
import type { StoryGateway } from '../stories/gateway.js'
import type { TaskGateway } from '../tasks/gateway.js'
import type { UserGateway } from '../users/gateway.js'
import type { ScrumPolicy } from './policy.js'
import { type CommitmentTask, findCommitment, formatCommitment } from './reports/commitment.js'
import { buildHealth, type HealthSettings, type HealthTask, parseHealthSettings } from './reports/health.js'
import {
	buildRetro,
	buildSprintReport,
	type Committed,
	completedBy,
	nextDay,
	velocityOf,
} from './reports/sprint-report.js'
import {
	buildStandup,
	buildTeamStandup,
	pointsOf,
	type StandupTask,
	standupWindowStart,
	startOfDayIn,
} from './reports/standup.js'
import { joinedAt, type TaskStory } from './reports/stories.js'
import {
	buildWorkload,
	type OooRange,
	parseWorkloadSettings,
	type WorkloadAllocation,
	type WorkloadInput,
	type WorkloadSettings,
	type WorkloadTask,
} from './reports/workload.js'
import {
	applyScopeOverrides,
	collectScopeTasks,
	resolveScopePeople,
	resolveScopeProjects,
	type ScopeGateways,
	selectScope,
} from './scope.js'
import { parseSprintRef, type Sprint, sprintNumber, sprintWindow, todayIn } from './sprint.js'
import { type CustomFieldModelGateways, createCustomFieldModel } from './sprint-model/custom-field.js'
import { createSectionsModel, type SectionsModelGateways } from './sprint-model/sections.js'
import type { CarryOver, SprintModel, SprintTarget } from './sprint-model/types.js'

/** The Asana reads and writes the sprint commands need, beside the scope's own. */
export type SprintGateways = SectionsModelGateways & {
	users: Pick<UserGateway, 'getMe' | 'getUser'>
	/** What the `custom-field` model needs; without it that model is reported as not built in. */
	fieldModel?: CustomFieldModelGateways
}

export type ScrumApiDeps = {
	/** Opens the scope configuration; each call may name its own config file or repo key. */
	store: (opts?: ScopeStoreOptions) => ScopeStore
	gateways: ScopeGateways
	sprint: SprintGateways
	/** Reads a task's dependencies, for the standup's blockers. */
	dependencies: Pick<TaskGateway, 'getDependencies'>
	/**
	 * Status updates and system stories: the commitment snapshot, and the history the retro reads. Without
	 * them the reports name what they could not read instead of failing.
	 */
	history?: {
		statuses: Pick<StatusGateway, 'listStatuses' | 'createStatus'>
		stories: Pick<StoryGateway, 'listStories'>
	}
	loadPolicy: () => Promise<ScrumPolicy>
	/** The `cyber-asana.report.health` thresholds; the defaults when unset. */
	loadHealthSettings?: () => Promise<HealthSettings>
	/** Reads allocations (the only capacity source, D4). Unset: capacity is unknown for the workload report. */
	allocations?: Pick<AllocationGateway, 'listAllocations'>
	/** Reads out-of-office entries for the note beside capacity (D9). */
	ooo?: Pick<OooGateway, 'listOooEntries'>
	/** The workspace GID out-of-office reads need; `ASANA_WORKSPACE_GID` when unset. */
	workspaceGid?: () => string | undefined
	/** The `cyber-asana.report.workload` thresholds; the defaults when unset. */
	loadWorkloadSettings?: () => Promise<WorkloadSettings>
	/** The clock, so a test can say what day it is. */
	now?: () => Date
}

/** Inputs every sprint command takes. */
export type SprintInput = { scope?: string; sprint?: string }

const STANDUP_FIELDS =
	'gid,name,completed,completed_at,due_on,permalink_url,assignee.gid,assignee.name,tags.name,custom_fields.gid,custom_fields.number_value,custom_fields.enum_value.name'

const HEALTH_FIELDS =
	'gid,name,completed,due_on,modified_at,permalink_url,num_subtasks,assignee.gid,assignee.name,tags.name,custom_fields.gid,custom_fields.number_value,custom_fields.enum_value.name'
const REPORT_FIELDS =
	'gid,name,completed,completed_at,created_at,due_on,permalink_url,assignee.gid,assignee.name,tags.name,custom_fields.gid,custom_fields.number_value,custom_fields.enum_value.name'

/** Inputs of `report standup`. */
export type StandupInput = SprintInput & {
	/** Another person, by GID or email; the user when unset. */
	member?: string
}

/** Inputs of `report workload`: a sprint, or else a `from`/`to` window. */
export type WorkloadReportInput = SprintInput & { from?: string; to?: string; workspace?: string }

const WORKLOAD_FIELDS =
	'gid,name,completed,due_on,assignee.gid,assignee.name,custom_fields.gid,custom_fields.number_value'

const ALLOCATION_FIELDS = 'gid,assignee.gid,assignee.name,parent.gid,start_date,end_date,effort.type,effort.value'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

export type ScrumApi = ReturnType<typeof createScrumApi>

export type ScopeListing = {
	scopes: Array<ScopeEntry & { source: ScopeSource }>
	/** The scope a command would use when none is configured: the repo's default project. */
	implicit?: ScopeEntry
}

export function createScrumApi(deps: ScrumApiDeps) {
	const models: Record<string, SprintModel> = {
		sections: createSectionsModel(deps.sprint),
		...(deps.sprint.fieldModel && { 'custom-field': createCustomFieldModel(deps.sprint.fieldModel) }),
	}
	const BUILT_IN_MODELS = Object.keys(models)

	/** Today in the user's Asana timezone when `user me` reports one, else the machine's. */
	function clockFor(me: { time_zone?: string }) {
		const now = (deps.now ?? (() => new Date()))()
		if (me.time_zone) {
			try {
				return { today: todayIn(me.time_zone, now), timezone: me.time_zone, timezone_source: 'asana' as const }
			} catch {
				// An unknown zone name falls through to the machine's.
			}
		}
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
		return { today: todayIn(timezone, now), timezone, timezone_source: 'machine' as const }
	}

	/** Pick the scope, check the CLI builds its model in, and compute the sprint the command names. */
	async function prepare(input: SprintInput, opts?: ScopeStoreOptions, lenient = false) {
		const loaded = await deps.store(opts).load()
		const { scope } = selectScope(loaded.scopes, {
			...(input.scope !== undefined && { name: input.scope }),
			...(loaded.defaultProject && { defaultProject: loaded.defaultProject }),
		})
		const policy = await deps.loadPolicy()
		const settings = { ...policy, ...applyScopeOverrides(policy, scope) }
		const model = models[settings.sprint_model]
		if (!model) {
			throw new CodedConfigError(
				'model-unsupported',
				`The sprint model "${settings.sprint_model}" is not built into the CLI`,
				{
					options: BUILT_IN_MODELS,
					hint: `Follow the cyber-asana.sprint-model.${settings.sprint_model} reference with its primitive commands, or set sprint_model to one of the options.`,
				},
			)
		}
		if (model.kind === 'section' && scope.kind !== 'project' && scope.kind !== 'projects') {
			throw new CodedConfigError(
				'model-unsupported',
				`The sections sprint model supports project and projects scopes, not ${scope.kind}`,
				{ hint: 'Use a project or projects scope, or the custom-field sprint model, which supports every scope kind.' },
			)
		}
		const projects = await resolveScopeProjects(scope, deps.gateways)
		const sprintFields = Object.fromEntries(
			projects.flatMap((p) => {
				const gid = loaded.fields?.[p.gid]?.sprint?.gid
				return gid ? [[p.gid, gid] as const] : []
			}),
		)
		const target: SprintTarget = {
			projects,
			settings,
			backlogSection: policy.backlog_section,
			...(Object.keys(sprintFields).length > 0 && { sprintFields }),
		}
		const me = (await deps.sprint.users.getMe()) as { gid?: string; name?: string; time_zone?: string }
		const clock = clockFor(me)
		// A report that carries on without a sprint (D12) must still run when the anchor is unset.
		const current =
			lenient && settings.sprint_anchor_date === undefined ? undefined : sprintNumber(clock.today, settings)
		const startHint = (ref: string) => `Start it with: cyber-asana sprint start --sprint ${ref} --scope ${scope.name}`
		const resolve = (ref = 'current'): Sprint => {
			const n = parseSprintRef(ref, current ?? 0, settings)
			if (n < 1) {
				throw new CodedConfigError(
					'sprint-none',
					`Today (${clock.today}) is before sprint_anchor_date ${settings.sprint_anchor_date}, so no sprint has begun`,
					{
						hint: `Sprint 1 starts on ${settings.sprint_anchor_date}. Start it with: cyber-asana sprint start --sprint 1 --scope ${scope.name}`,
					},
				)
			}
			return sprintWindow(n, settings)
		}
		const requireStarted = async (sprint: Sprint) => {
			const sections = await model.sections(target, sprint)
			if (sections.found.length === 0) {
				throw new CodedConfigError(
					'sprint-none',
					`${sprint.name} has no ${model.kind} in any project of scope ${scope.name}`,
					{
						hint: startHint(String(sprint.n)),
					},
				)
			}
			return sections
		}
		return { scope, target, model, clock, current, resolve, requireStarted, settings, policy, me, loaded }
	}

	const projectRef = (p: { gid: string; name?: string }) => p.gid

	/**
	 * Allocations on each project of the scope, for capacity (D4). A 402 means the plan has no
	 * allocations: capacity is unknown, not a failure. Any other error is real.
	 */
	async function readAllocations(projectGids: string[]): Promise<WorkloadInput['capacity']> {
		if (!deps.allocations) return { status: 'ok', allocations: [] }
		const seen = new Map<string, WorkloadAllocation>()
		try {
			for (const parent of projectGids) {
				const found = listItems(
					await deps.allocations.listAllocations({ parent, fetchAll: true, optFields: ALLOCATION_FIELDS }),
				) as WorkloadAllocation[]
				for (const a of found) seen.set(a.gid ?? `${parent}:${seen.size}`, a)
			}
		} catch (error) {
			if (buildErrorBody(error).error.status === PLAN_LIMITATION_STATUS)
				return { status: 'unavailable', reason: 'plan' }
			throw error
		}
		return { status: 'ok', allocations: [...seen.values()] }
	}

	/** Out-of-office ranges per person, as a note beside capacity. Never an error: the note says why it is missing. */
	async function readOoo(
		gids: string[],
		window: { from: string; to: string },
		workspace: string | undefined,
	): Promise<{ ooo?: Record<string, OooRange[]>; note?: string }> {
		if (!deps.ooo || gids.length === 0) return {}
		const workspaceGid = workspace ?? (deps.workspaceGid ?? (() => envValue('ASANA_WORKSPACE_GID')))()
		if (!workspaceGid) {
			return {
				note: 'Out-of-office was not read: no workspace is set (ASANA_WORKSPACE_GID or --workspace).',
			}
		}
		const ooo: Record<string, OooRange[]> = {}
		try {
			for (const gid of gids) {
				const entries = listItems(
					await deps.ooo.listOooEntries(gid, workspaceGid, {
						startDate: window.from,
						endDate: window.to,
						fetchAll: true,
						optFields: 'start_date,end_date',
					}),
				) as Array<{ start_date?: string; end_date?: string }>
				const ranges = entries.flatMap((e) =>
					e.start_date && e.end_date ? [{ start_date: e.start_date, end_date: e.end_date }] : [],
				)
				if (ranges.length > 0) ooo[gid] = ranges
			}
		} catch (error) {
			return { note: `Out-of-office was not read: ${buildErrorBody(error).error.message}` }
		}
		return { ooo }
	}

	type Ctx = Awaited<ReturnType<typeof prepare>>

	/** GIDs of the custom fields registered for each points role across the scope's projects. */
	function pointFields(ctx: Ctx) {
		const gids = (role: 'story_points' | 'task_points') =>
			new Set(
				ctx.target.projects.flatMap((p) => {
					const field = ctx.loaded.fields?.[p.gid]?.[role]
					return field ? [field.gid] : []
				}),
			)
		const fields = { story: gids('story_points'), task: gids('task_points') }
		return { fields, tracked: { story: fields.story.size > 0, task: fields.task.size > 0 } }
	}

	/** The commitment snapshots a project holds, by sprint: its status updates carry them (D6). */
	async function projectStatuses(projectGid: string) {
		return listItems(
			await (deps.history as NonNullable<ScrumApiDeps['history']>).statuses.listStatuses(projectGid, {
				fetchAll: true,
				optFields: 'created_at,title,text',
			}),
		) as Array<{ created_at?: string; text?: string }>
	}

	/**
	 * What a sprint committed to: the snapshots posted when it started, else a rebuild from each task's
	 * "moved to" stories (a task that joined by the end of the first day counts), else nothing.
	 */
	async function commitmentOf(ctx: Ctx, sprint: Sprint, members: StandupTask[]) {
		const notes: string[] = []
		if (!deps.history) return { committed: undefined as Committed | undefined, notes }
		const { found } = await ctx.model.sections(ctx.target, sprint)
		const snapshots: CommitmentTask[] = []
		let any = false
		for (const { project } of found) {
			const snapshot = findCommitment(await projectStatuses(project.gid), sprint.n)
			if (!snapshot) continue
			any = true
			for (const task of snapshot.commitment.tasks) {
				if (!snapshots.some((x) => x.gid === task.gid)) snapshots.push(task)
			}
		}
		if (any) return { committed: { source: 'snapshot' as const, tasks: snapshots }, notes }

		const { fields } = pointFields(ctx)
		const cutoff = Date.parse(startOfDayIn(nextDay(sprint.start), ctx.clock.timezone))
		const tasks: CommitmentTask[] = []
		let unknown = 0
		for (const task of members) {
			const stories = listItems(await deps.history.stories.listStories(task.gid, { fetchAll: true })) as TaskStory[]
			const at = joinedAt(stories, sprint.name)
			if (at === undefined) unknown++
			if (at === undefined || Date.parse(at) < cutoff) {
				const points = pointsOf(task, fields)
				tasks.push({ gid: task.gid, name: task.name ?? '', ...points })
			}
		}
		if (unknown > 0) {
			notes.push(`${unknown} task(s) show no "moved to ${sprint.name}" story, so they count as committed.`)
		}
		return { committed: { source: 'rebuilt' as const, tasks }, notes }
	}

	/** The pieces R2 and R3 share: the sprint's tasks, its commitment, and the points fields. */
	async function sprintFacts(input: SprintInput, opts?: ScopeStoreOptions) {
		const ctx = await prepare(input, opts)
		const sprint = ctx.resolve(input.sprint)
		await ctx.requireStarted(sprint)
		const tasks = (await ctx.model.tasks(ctx.target, sprint, { optFields: REPORT_FIELDS })) as StandupTask[]
		const { committed, notes } = await commitmentOf(ctx, sprint, tasks)
		const { fields, tracked } = pointFields(ctx)
		const facts = {
			sprint,
			today: ctx.clock.today,
			timezone: ctx.clock.timezone,
			tasks,
			committed,
			fields,
			points_tracked: tracked,
			notes,
		}
		return { ctx, facts }
	}

	return {
		async listScopes(opts?: ScopeStoreOptions): Promise<ScopeListing> {
			const loaded = await deps.store(opts).load()
			const scopes = loaded.scopes.map((scope) => ({
				...scope,
				source: loaded.sources[scope.name.trim().toLowerCase()] ?? 'repo',
			}))
			if (scopes.length > 0 || !loaded.defaultProject) return { scopes }
			return { scopes, implicit: selectScope([], { defaultProject: loaded.defaultProject }).scope }
		},

		async addScope(scope: ScopeEntry, opts?: ScopeStoreOptions & { global?: boolean }) {
			const { path, target } = await deps.store(opts).add(scope, opts?.global ? 'global' : 'repo')
			return { scope, path, target }
		},

		/** Removing a scope that is not configured succeeds with `already_absent: true` and writes nothing. */
		async removeScope(name: string, opts?: ScopeStoreOptions & { global?: boolean }) {
			const store = deps.store(opts)
			const key = name.trim().toLowerCase()
			if (!(await store.load()).scopes.some((scope) => scope.name.trim().toLowerCase() === key)) {
				return { removed: name, already_absent: true as const }
			}
			const { path, target } = await store.remove(name, opts?.global ? 'global' : undefined)
			return { removed: name, already_absent: false as const, path, target }
		},

		/**
		 * Pick a scope (`--scope`, else the default, else the repo's default project), list the projects
		 * it covers, and lay its sprint overrides over the policy. `tasks` also returns the scope's tasks,
		 * each counted once however many of its projects it is in.
		 */
		async resolveScope(input: { scope?: string; tasks?: boolean; taskFields?: string }, opts?: ScopeStoreOptions) {
			const loaded = await deps.store(opts).load()
			const { scope, implicit } = selectScope(loaded.scopes, {
				...(input.scope !== undefined && { name: input.scope }),
				...(loaded.defaultProject && { defaultProject: loaded.defaultProject }),
			})
			const projects = await resolveScopeProjects(scope, deps.gateways)
			const people = await resolveScopePeople(scope, deps.gateways)
			const sprint = applyScopeOverrides(await deps.loadPolicy(), scope)
			const tasks = input.tasks
				? await collectScopeTasks(
						projects.map((project) => project.gid),
						deps.gateways,
						input.taskFields ? { optFields: input.taskFields } : undefined,
					)
				: undefined
			return { scope, implicit, projects, ...(people && { people }), sprint, ...(tasks && { tasks }) }
		},

		async currentSprint(input: SprintInput, opts?: ScopeStoreOptions) {
			const ctx = await prepare({ ...input, sprint: 'current' }, opts)
			const sprint = ctx.resolve('current')
			const { found, missing } = await ctx.requireStarted(sprint)
			return {
				scope: ctx.scope.name,
				...ctx.clock,
				sprint,
				projects: found.map((f) => ({ gid: f.project.gid, section_gid: f.section.gid })),
				missing: missing.map(projectRef),
			}
		},

		async listSprints(input: SprintInput, opts?: ScopeStoreOptions) {
			const ctx = await prepare(input, opts)
			const existing = await ctx.model.listSprints(ctx.target)
			const current = ctx.current
			const ns = new Set(existing.map((e) => e.n))
			if (current !== undefined) ns.add(current)
			const sprints = [...ns]
				.sort((a, b) => a - b)
				.map((n) => {
					const found = existing.find((e) => e.n === n)
					return {
						...sprintWindow(n, ctx.settings),
						state:
							current === undefined || n > current
								? ('future' as const)
								: n === current
									? ('current' as const)
									: ('past' as const),
						exists: found !== undefined,
						projects: (found?.sections ?? []).map((f) => f.project.gid),
					}
				})
			return { scope: ctx.scope.name, today: ctx.clock.today, sprints }
		},

		async sprintTasks(input: SprintInput & { incomplete?: boolean; optFields?: string }, opts?: ScopeStoreOptions) {
			const ctx = await prepare(input, opts)
			const sprint = ctx.resolve(input.sprint)
			await ctx.requireStarted(sprint)
			const tasks = await ctx.model.tasks(ctx.target, sprint, {
				...(input.incomplete && { incomplete: true }),
				...(input.optFields && { optFields: input.optFields }),
			})
			const completed = tasks.filter((t) => t.completed === true).length
			return {
				scope: ctx.scope.name,
				sprint,
				tasks,
				count: { total: tasks.length, completed, open: tasks.length - completed },
			}
		},

		async addToSprint(input: SprintInput & { tasks: string[] }, opts?: ScopeStoreOptions) {
			const ctx = await prepare(input, opts)
			const sprint = ctx.resolve(input.sprint)
			await ctx.requireStarted(sprint)
			const result = await ctx.model.add(ctx.target, sprint, input.tasks)
			return {
				scope: ctx.scope.name,
				sprint,
				added: result.added,
				already_in_sprint: result.already,
				outside_scope: result.outside_scope,
				missing: result.missing.map(projectRef),
			}
		},

		async startSprint(input: SprintInput & { snapshot?: boolean }, opts?: ScopeStoreOptions) {
			const ctx = await prepare(input, opts)
			const sprint = ctx.resolve(input.sprint)
			const { created, existing } = await ctx.model.start(ctx.target, sprint)
			let snapshot: { posted: string[]; existing: string[] } | undefined
			if (input.snapshot) {
				if (!deps.history) {
					throw new CodedConfigError(
						'history-unavailable',
						'This build has no status-update gateway to post a snapshot',
					)
				}
				const { fields } = pointFields(ctx)
				snapshot = { posted: [], existing: [] }
				const { found } = await ctx.model.sections(ctx.target, sprint)
				for (const { project } of found) {
					if (findCommitment(await projectStatuses(project.gid), sprint.n)) {
						snapshot.existing.push(project.gid)
						continue
					}
					const tasks = (await ctx.model.tasks({ ...ctx.target, projects: [project] }, sprint, {
						optFields: REPORT_FIELDS,
					})) as StandupTask[]
					const posted = formatCommitment(
						sprint,
						tasks.map((t) => ({ gid: t.gid, name: t.name ?? '', ...pointsOf(t, fields) })),
					)
					await deps.history.statuses.createStatus(project.gid, { status_type: 'on_track', ...posted })
					snapshot.posted.push(project.gid)
				}
			}
			return {
				scope: ctx.scope.name,
				sprint,
				created: created.map(projectRef),
				existing: existing.map(projectRef),
				already_started: created.length === 0,
				...(snapshot && { snapshot }),
			}
		},

		async closeSprint(input: SprintInput, opts?: ScopeStoreOptions) {
			const ctx = await prepare(input, opts)
			const sprint = ctx.resolve(input.sprint)
			await ctx.requireStarted(sprint)
			const next = sprintWindow(sprint.n + 1, ctx.settings)
			const carryOver: CarryOver = ctx.policy.carry_over
			const result = await ctx.model.close(ctx.target, sprint, next, carryOver)
			return {
				scope: ctx.scope.name,
				sprint,
				next_sprint: next,
				carry_over: carryOver,
				ended: ctx.clock.today > sprint.end,
				moved: result.moved,
				left: result.left,
				created_next: result.created_next.map(projectRef),
			}
		},

		/**
		 * A member's standup (R1): what they completed within `standup_window`, what is on their plate in the
		 * current sprint, and what is blocked. With no current sprint it carries on without sprint filters
		 * and says why (D12); an explicitly named sprint that has not started is `sprint-none`.
		 */
		async reportStandup(input: StandupInput, opts?: ScopeStoreOptions) {
			const ctx = await prepare(input, opts, true)
			const mine = input.member === undefined || input.member === 'me'
			const user = mine
				? ctx.me
				: ((await deps.sprint.users.getUser(input.member as string, { optFields: 'gid,name' })) as {
						gid?: string
						name?: string
					})
			const member = {
				gid: user.gid as string,
				...(user.name !== undefined && { name: user.name }),
				source: mine ? ('me' as const) : ('member' as const),
			}
			const base = await standupBase(ctx, input)
			const standup = await buildStandup({ ...base.input, member })
			return { ...base.header, member, ...standup }
		},

		/**
		 * The team's standup (R1, `--team`): the same report for every person of the scope, grouped by person.
		 * The people are a `team` scope's members, including those with no task yet, or else the assignees
		 * seen in the scope's tasks.
		 */
		async reportTeamStandup(input: SprintInput, opts?: ScopeStoreOptions) {
			const ctx = await prepare(input, opts, true)
			const people = await resolveScopePeople(ctx.scope, deps.gateways)
			const base = await standupBase(ctx, input)
			const team = await buildTeamStandup({ ...base.input, ...(people && { people }) })
			return {
				...base.header,
				...team,
				count: { members: team.members.length },
			}
		},

		/**
		 * The health check report (R5): one result per enabled check over the sprint's tasks. When the
		 * sprint has no section and H9 is enabled, H9 reports it and the task checks are skipped; with H9
		 * disabled the report fails with `sprint-none` (D12). A sprint that has not begun, or no anchor
		 * date, always fails: there is no sprint to be missing.
		 */
		async reportHealth(input: SprintInput, opts?: ScopeStoreOptions) {
			const ctx = await prepare(input, opts)
			const settings = await (deps.loadHealthSettings ?? (async () => parseHealthSettings({})))()
			const sprint = ctx.resolve(input.sprint)
			const { found, missing } = settings.checks.includes('H9')
				? await ctx.model.sections(ctx.target, sprint)
				: await ctx.requireStarted(sprint)
			const started = found.length > 0

			const sprintTasks = started
				? ((await ctx.model.tasks(ctx.target, sprint, { optFields: HEALTH_FIELDS })) as HealthTask[])
				: undefined
			let allSprints: Array<{ n: number; name: string; tasks: HealthTask[] }> | undefined
			if (settings.checks.includes('H10') || settings.checks.includes('H11')) {
				allSprints = []
				for (const { n } of await ctx.model.listSprints(ctx.target)) {
					const window = sprintWindow(n, ctx.settings)
					allSprints.push({
						n,
						name: window.name,
						tasks: (await ctx.model.tasks(ctx.target, window, {
							incomplete: true,
							optFields: HEALTH_FIELDS,
						})) as HealthTask[],
					})
				}
			}

			const gids = (role: 'story_points' | 'task_points' | 'status') =>
				new Set(
					ctx.target.projects.flatMap((p) => {
						const field = ctx.loaded.fields?.[p.gid]?.[role]
						return field ? [field.gid] : []
					}),
				)
			// H8: the sprint's open tasks against Allocations capacity for its dates. Read only when enabled.
			let capacity: { workload: ReturnType<typeof buildWorkload> } | { skipped: string } | undefined
			if (settings.checks.includes('H8') && sprintTasks) {
				const allocations = await readAllocations(ctx.target.projects.map((p) => p.gid))
				capacity =
					allocations.status === 'unavailable'
						? { skipped: 'the workspace plan does not include allocations (402)' }
						: {
								workload: buildWorkload({
									scope: ctx.scope.name,
									window: { from: sprint.start, to: sprint.end },
									policy: ctx.policy,
									settings: await (deps.loadWorkloadSettings ?? (async () => parseWorkloadSettings({})))(),
									tasks: sprintTasks as WorkloadTask[],
									fields: { story: gids('story_points'), task: gids('task_points') },
									capacity: allocations,
								}),
							}
			}
			const health = await buildHealth({
				scope: ctx.scope.name,
				settings,
				policy: ctx.policy,
				today: ctx.clock.today,
				now: (deps.now ?? (() => new Date()))().toISOString(),
				sprint,
				...(sprintTasks && { sprintTasks }),
				missingProjects: missing.map(projectRef),
				...(allSprints && { allSprints }),
				...(capacity && { capacity }),
				currentN: ctx.current ?? 0,
				fields: { story: gids('story_points'), task: gids('task_points'), status: gids('status') },
				dependenciesOf: async (taskGid) =>
					(await deps.dependencies.getDependencies(taskGid, { optFields: 'gid,name,completed' })) as Array<{
						gid: string
						name?: string
						completed?: boolean
					}>,
			})
			return {
				scope: ctx.scope.name,
				today_date: ctx.clock.today,
				timezone: ctx.clock.timezone,
				timezone_source: ctx.clock.timezone_source,
				sprint,
				sprint_started: started,
				settings,
				...health,
			}
		},

		/**
		 * The workload report (R6): per person, the load of their incomplete assigned tasks against the
		 * capacity Allocations give for the window. The window is the sprint's dates, or `from`/`to` (then
		 * the scope's incomplete assigned tasks due inside it). Capacity that cannot be read is named and
		 * the load still shows; out-of-office is a note, never subtracted (D9).
		 */
		async reportWorkload(input: WorkloadReportInput, opts?: ScopeStoreOptions) {
			const hasWindow = input.from !== undefined || input.to !== undefined
			if (hasWindow) {
				const bad = (why: string) =>
					new CodedConfigError('window-invalid', why, {
						hint: 'Pass both --from and --to as YYYY-MM-DD days, from not after to, or neither for the current sprint.',
					})
				if (input.from === undefined || input.to === undefined) throw bad('--from and --to go together')
				if (
					!ISO_DAY.test(input.from) ||
					!ISO_DAY.test(input.to) ||
					Number.isNaN(Date.parse(input.from)) ||
					Number.isNaN(Date.parse(input.to))
				) {
					throw bad(`"${input.from}" to "${input.to}" is not a YYYY-MM-DD window`)
				}
				if (input.from > input.to) throw bad(`${input.from} is after ${input.to}`)
			}
			const ctx = await prepare(input, opts, hasWindow)
			const settings = await (deps.loadWorkloadSettings ?? (async () => parseWorkloadSettings({})))()
			const notes: string[] = []

			let sprint: Sprint | null = null
			let window: { from: string; to: string }
			let tasks: WorkloadTask[]
			if (!hasWindow) {
				sprint = ctx.resolve(input.sprint)
				await ctx.requireStarted(sprint)
				window = { from: sprint.start, to: sprint.end }
				tasks = (await ctx.model.tasks(ctx.target, sprint, {
					incomplete: true,
					optFields: WORKLOAD_FIELDS,
				})) as WorkloadTask[]
			} else {
				window = { from: input.from as string, to: input.to as string }
				const all = (await collectScopeTasks(
					ctx.target.projects.map((p) => p.gid),
					deps.gateways,
					{ optFields: WORKLOAD_FIELDS },
				)) as WorkloadTask[]
				const incomplete = all.filter((t) => t.completed !== true)
				const undated = incomplete.filter((t) => !t.due_on).length
				tasks = incomplete.filter((t) => t.due_on && t.due_on >= window.from && t.due_on <= window.to)
				if (undated > 0) {
					notes.push(
						`${undated} task(s) with no due date are left out: a ${window.from} to ${window.to} window counts tasks due inside it.`,
					)
				}
			}

			const gids = (role: 'story_points' | 'task_points') =>
				new Set(
					ctx.target.projects.flatMap((p) => {
						const field = ctx.loaded.fields?.[p.gid]?.[role]
						return field ? [field.gid] : []
					}),
				)
			const capacity = await readAllocations(ctx.target.projects.map((p) => p.gid))
			const people = new Set<string>()
			for (const t of tasks) if (t.assignee?.gid) people.add(t.assignee.gid)
			if (capacity.status === 'ok') {
				for (const a of capacity.allocations) if (a.assignee?.gid) people.add(a.assignee.gid)
			}
			const { ooo, note } = await readOoo([...people], window, input.workspace)
			if (note) notes.push(note)

			const workload = buildWorkload({
				scope: ctx.scope.name,
				window,
				policy: ctx.policy,
				settings,
				tasks,
				fields: { story: gids('story_points'), task: gids('task_points') },
				capacity,
				...(ooo && { ooo }),
			})
			return {
				scope: ctx.scope.name,
				today_date: ctx.clock.today,
				timezone: ctx.clock.timezone,
				timezone_source: ctx.clock.timezone_source,
				sprint,
				window,
				settings,
				hours_per_point: ctx.policy.hours_per_point,
				working_hours_per_day: ctx.policy.working_hours_per_day,
				...workload,
				notes: [...notes, ...workload.notes],
			}
		},

		/** R2, the sprint review: committed against completed, added and removed, with the burndown. */
		async reportSprint(input: SprintInput, opts?: ScopeStoreOptions) {
			const { ctx, facts } = await sprintFacts(input, opts)
			return { scope: ctx.scope.name, ...buildSprintReport(facts) }
		},

		/** R3, the retro: carry-over, scope change, blocked time from stories, cycle time, estimate against actual. */
		async reportRetro(input: SprintInput, opts?: ScopeStoreOptions) {
			const { ctx, facts } = await sprintFacts(input, opts)
			const storiesOf: Record<string, TaskStory[]> = {}
			if (deps.history) {
				for (const task of facts.tasks) {
					storiesOf[task.gid] = listItems(
						await deps.history.stories.listStories(task.gid, { fetchAll: true }),
					) as TaskStory[]
				}
			} else {
				facts.notes.push('Task history is not available in this build, so blocked time is not reported.')
			}
			const now = (deps.now ?? (() => new Date()))().toISOString()
			return {
				scope: ctx.scope.name,
				...buildRetro({ ...facts, signals: ctx.policy.blocked_signals, storiesOf, now }),
			}
		},

		/** R4, velocity: points completed per closed sprint over `velocity_window`, and the mean. */
		async reportVelocity(input: { scope?: string }, opts?: ScopeStoreOptions) {
			const ctx = await prepare(input, opts)
			const current = ctx.current ?? 0
			const window = ctx.policy.velocity_window
			const closed = (await ctx.model.listSprints(ctx.target)).filter((s) => s.n < current).slice(-window)
			const { fields, tracked } = pointFields(ctx)
			const sprints = []
			for (const { n } of closed) {
				const sprint = sprintWindow(n, ctx.settings)
				const tasks = (await ctx.model.tasks(ctx.target, sprint, { optFields: REPORT_FIELDS })) as StandupTask[]
				sprints.push({ n, name: sprint.name, completed: completedBy(tasks, sprint, ctx.clock.timezone, fields) })
			}
			const notes =
				sprints.length < window
					? [
							`${sprints.length} closed sprint(s) found, fewer than velocity_window ${window}; the mean covers only those.`,
						]
					: []
			return { scope: ctx.scope.name, ...velocityOf(sprints, window), points_tracked: tracked, notes }
		},

		async listBacklog(input: { scope?: string; optFields?: string }, opts?: ScopeStoreOptions) {
			const ctx = await prepare(input, opts)
			const tasks = await ctx.model.backlog(ctx.target, input.optFields ? { optFields: input.optFields } : {})
			// Only a section model keeps its backlog in a section; an option model's backlog is "no option".
			const { missing } =
				ctx.model.kind === 'section'
					? await ctx.model.sections(ctx.target, { name: ctx.target.backlogSection })
					: { missing: [] }
			return {
				scope: ctx.scope.name,
				backlog_section: ctx.target.backlogSection,
				backlog_section_missing: missing.map(projectRef),
				tasks,
				count: tasks.length,
			}
		},
	}

	/**
	 * What every standup shares: the sprint (or why there is none), the Done window, the scope's tasks
	 * from Asana, and the field GIDs. A person's standup and the team's differ only in who they pick out.
	 */
	async function standupBase(ctx: Awaited<ReturnType<typeof prepare>>, input: SprintInput) {
		let sprint: Sprint | null = null
		let sprintNote: string | undefined
		if (input.sprint !== undefined && input.sprint !== 'current') {
			sprint = ctx.resolve(input.sprint)
			await ctx.requireStarted(sprint)
		} else if (ctx.settings.sprint_anchor_date === undefined) {
			sprintNote = 'sprint_anchor_date is not set, so there is no current sprint.'
		} else if (ctx.current === undefined) {
			sprintNote = `Today (${ctx.clock.today}) is before sprint_anchor_date ${ctx.settings.sprint_anchor_date}, so no sprint has begun.`
		} else {
			const candidate = ctx.resolve('current')
			if ((await ctx.model.sections(ctx.target, candidate)).found.length === 0) {
				sprintNote = `${candidate.name} has no section in any project of scope ${ctx.scope.name}.`
			} else {
				sprint = candidate
			}
		}
		if (sprintNote) sprintNote += ' Showing every incomplete assigned task, with no sprint filter.'

		const window = standupWindowStart(
			ctx.policy.standup_window,
			ctx.clock.today,
			ctx.policy.working_days,
			ctx.clock.timezone,
		)
		const sprintGids = sprint
			? new Set((await ctx.model.tasks(ctx.target, sprint, { incomplete: true, optFields: 'gid' })).map((t) => t.gid))
			: undefined

		const listed = new Map<string, StandupTask>()
		for (const project of ctx.target.projects) {
			const tasks = listItems(
				await deps.gateways.tasks.listTasks(project.gid, {
					fetchAll: true,
					optFields: STANDUP_FIELDS,
					incompleteOrCompletedSince: window.since,
				}),
			) as StandupTask[]
			for (const task of tasks) if (!listed.has(task.gid)) listed.set(task.gid, task)
		}

		const gids = (role: 'story_points' | 'task_points' | 'status') =>
			new Set(
				ctx.target.projects.flatMap((p) => {
					const field = ctx.loaded.fields?.[p.gid]?.[role]
					return field ? [field.gid] : []
				}),
			)
		return {
			input: {
				today: ctx.clock.today,
				since: window.since,
				tasks: [...listed.values()],
				...(sprintGids && { sprintGids }),
				policy: ctx.policy,
				fields: { story: gids('story_points'), task: gids('task_points'), status: gids('status') },
				dependenciesOf: async (taskGid: string) =>
					(await deps.dependencies.getDependencies(taskGid, { optFields: 'gid,name,completed' })) as Array<{
						gid: string
						name?: string
						completed?: boolean
					}>,
			},
			header: {
				scope: ctx.scope.name,
				today_date: ctx.clock.today,
				timezone: ctx.clock.timezone,
				timezone_source: ctx.clock.timezone_source,
				window: { setting: ctx.policy.standup_window, from: window.from, since: window.since },
				sprint,
				...(sprintNote && { sprint_note: sprintNote }),
			},
		}
	}
}
