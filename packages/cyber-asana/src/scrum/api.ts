import type { ScopeSource, ScopeStore, ScopeStoreOptions } from '../config/scope-store.js'
import type { ScopeEntry } from '../config/scopes.js'
import { CodedConfigError } from '../platform/coded-error.js'
import { listItems } from '../platform/pagination.js'
import type { TaskGateway } from '../tasks/gateway.js'
import type { UserGateway } from '../users/gateway.js'
import type { ScrumPolicy } from './policy.js'
import { buildStandup, type StandupTask, standupWindowStart } from './reports/standup.js'
import {
	applyScopeOverrides,
	collectScopeTasks,
	resolveScopeProjects,
	type ScopeGateways,
	selectScope,
} from './scope.js'
import { parseSprintRef, type Sprint, sprintNumber, sprintWindow, todayIn } from './sprint.js'
import { createSectionsModel, type SectionsModelGateways } from './sprint-model/sections.js'
import type { CarryOver, SprintModel, SprintTarget } from './sprint-model/types.js'

/** The Asana reads and writes the sprint commands need, beside the scope's own. */
export type SprintGateways = SectionsModelGateways & { users: Pick<UserGateway, 'getMe' | 'getUser'> }

export type ScrumApiDeps = {
	/** Opens the scope configuration; each call may name its own config file or repo key. */
	store: (opts?: ScopeStoreOptions) => ScopeStore
	gateways: ScopeGateways
	sprint: SprintGateways
	/** Reads a task's dependencies, for the standup's blockers. */
	dependencies: Pick<TaskGateway, 'getDependencies'>
	loadPolicy: () => Promise<ScrumPolicy>
	/** The clock, so a test can say what day it is. */
	now?: () => Date
}

/** Inputs every sprint command takes. */
export type SprintInput = { scope?: string; sprint?: string }

const STANDUP_FIELDS =
	'gid,name,completed,completed_at,due_on,permalink_url,assignee.gid,assignee.name,tags.name,custom_fields.gid,custom_fields.number_value,custom_fields.enum_value.name'

/** Inputs of `report standup`. */
export type StandupInput = SprintInput & {
	/** Another person, by GID or email; the user when unset. */
	member?: string
	/** The whole team; not built yet. */
	team?: boolean
}

const BUILT_IN_MODELS = ['sections']

export type ScrumApi = ReturnType<typeof createScrumApi>

export type ScopeListing = {
	scopes: Array<ScopeEntry & { source: ScopeSource }>
	/** The scope a command would use when none is configured: the repo's default project. */
	implicit?: ScopeEntry
}

export function createScrumApi(deps: ScrumApiDeps) {
	const models: Record<string, SprintModel> = { sections: createSectionsModel(deps.sprint) }

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
		if (!BUILT_IN_MODELS.includes(settings.sprint_model) || !model) {
			throw new CodedConfigError(
				'model-unsupported',
				`The sprint model "${settings.sprint_model}" is not built into the CLI`,
				{
					options: BUILT_IN_MODELS,
					hint: `Follow the cyber-asana.sprint-model.${settings.sprint_model} reference with its primitive commands, or set sprint_model to one of the options.`,
				},
			)
		}
		if (scope.kind !== 'project' && scope.kind !== 'projects') {
			throw new CodedConfigError(
				'model-unsupported',
				`The sections sprint model supports project and projects scopes, not ${scope.kind}`,
				{ hint: 'Use a project or projects scope, or a sprint model that supports this scope kind.' },
			)
		}
		const projects = await resolveScopeProjects(scope, deps.gateways)
		const target: SprintTarget = { projects, settings, backlogSection: policy.backlog_section }
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
					`${sprint.name} has no section in any project of scope ${scope.name}`,
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
			const sprint = applyScopeOverrides(await deps.loadPolicy(), scope)
			const tasks = input.tasks
				? await collectScopeTasks(
						projects.map((project) => project.gid),
						deps.gateways,
						input.taskFields ? { optFields: input.taskFields } : undefined,
					)
				: undefined
			return { scope, implicit, projects, sprint, ...(tasks && { tasks }) }
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

		async startSprint(input: SprintInput, opts?: ScopeStoreOptions) {
			const ctx = await prepare(input, opts)
			const sprint = ctx.resolve(input.sprint)
			const { created, existing } = await ctx.model.start(ctx.target, sprint)
			return {
				scope: ctx.scope.name,
				sprint,
				created: created.map(projectRef),
				existing: existing.map(projectRef),
				already_started: created.length === 0,
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
			if (input.team) {
				throw new CodedConfigError('team-unsupported', 'The team standup is not built yet', {
					hint: 'Use --me (the default) or --member <user>.',
				})
			}
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
			const standup = await buildStandup({
				member,
				today: ctx.clock.today,
				since: window.since,
				tasks: [...listed.values()],
				...(sprintGids && { sprintGids }),
				policy: ctx.policy,
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
				member,
				today_date: ctx.clock.today,
				timezone: ctx.clock.timezone,
				timezone_source: ctx.clock.timezone_source,
				window: { setting: ctx.policy.standup_window, from: window.from, since: window.since },
				sprint,
				...(sprintNote && { sprint_note: sprintNote }),
				...standup,
			}
		},

		async listBacklog(input: { scope?: string; optFields?: string }, opts?: ScopeStoreOptions) {
			const ctx = await prepare(input, opts)
			const tasks = await ctx.model.backlog(ctx.target, input.optFields ? { optFields: input.optFields } : {})
			const { missing } = await ctx.model.sections(ctx.target, { name: ctx.target.backlogSection })
			return {
				scope: ctx.scope.name,
				backlog_section: ctx.target.backlogSection,
				backlog_section_missing: missing.map(projectRef),
				tasks,
				count: tasks.length,
			}
		},
	}
}
