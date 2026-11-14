import { Command, InvalidArgumentError } from 'commander'
import { resolveProjectRef } from '../config/repo-config.js'
import { SCOPE_KINDS, SCOPE_OVERRIDE_KEYS, type ScopeEntry, type ScopeKind } from '../config/scopes.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../platform/cli/output.js'
import type { ScrumApi } from './api.js'
import { createDefaultScrumApi } from './default.js'

export type ResolveApi = ScrumApi | (() => ScrumApi)

export function resolveApi(api?: ResolveApi): ScrumApi {
	if (typeof api === 'function') return api()
	return api ?? createDefaultScrumApi()
}

type StoreFlags = { config?: string; repo?: string; global?: boolean }

export function storeOptions(opts: StoreFlags) {
	return { configPath: opts.config, repo: opts.repo }
}

function collect(value: string, previous: string[]) {
	return [
		...previous,
		...value
			.split(',')
			.map((piece) => piece.trim())
			.filter((piece) => piece.length > 0),
	]
}

function scopeKind(value: string): ScopeKind {
	if (!(SCOPE_KINDS as readonly string[]).includes(value)) {
		throw new InvalidArgumentError(`Unknown scope kind "${value}". Expected one of: ${SCOPE_KINDS.join(', ')}`)
	}
	return value as ScopeKind
}

function positiveInt(value: string) {
	if (!/^\d+$/.test(value) || Number(value) <= 0) throw new InvalidArgumentError('must be a positive integer')
	return Number(value)
}

function members(scope: ScopeEntry): string {
	if (scope.kind === 'portfolio') return scope.portfolio ?? ''
	if (scope.kind === 'team') return scope.team ?? ''
	return (scope.projects ?? []).join(', ')
}

function overrides(scope: ScopeEntry): string {
	return SCOPE_OVERRIDE_KEYS.filter((key) => scope[key] !== undefined)
		.map((key) => `${key}=${scope[key]}`)
		.join(' ')
}

type AddFlags = StoreFlags & {
	kind: ScopeKind
	project: string[]
	portfolio?: string
	team?: string
	backlogProject?: string
	sprintPortfolio?: string
	sprintTemplate?: string
	default?: boolean
	sprintModel?: string
	sprintLengthDays?: number
	sprintAnchorDate?: string
}

/** `config scope add | remove | list`, mounted under the `config` command by the composition root. */
export function scopeConfigCommand(api?: ResolveApi) {
	const cmd = new Command('scope').description(
		'Manage scrum scopes: the Asana projects a scrum team works in (.agents/cyber-asana.json, schema 3)',
	)
	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana config scope add web --kind project --project <gid> --default',
			'  cyber-asana config scope add platform --kind projects --project <gid>,<gid> --sprint-length-days 7',
			'  cyber-asana config scope add growth --kind portfolio --portfolio <gid>',
			'  cyber-asana config scope add web-team --kind team --team <gid>',
			'  cyber-asana config scope add mine --kind projects --project <gid>,<gid> --global   # personal registry',
			'  cyber-asana config scope list',
			'  cyber-asana config scope remove platform',
		].join('\n'),
	)

	cmd
		.command('add <name>')
		.description('Add a scope, or replace the one with that name (the file becomes schema_version 3)')
		.requiredOption('--kind <kind>', `Scope kind: ${SCOPE_KINDS.join(', ')}`, scopeKind)
		.option('--project <gid-or-alias>', 'Project GID or registered alias, comma-separated or repeated', collect, [])
		.option('--portfolio <gid>', 'Portfolio GID, for kind portfolio')
		.option('--team <gid>', 'Team GID, for kind team')
		.option(
			'--backlog-project <gid-or-alias>',
			'Backlog project of the project sprint model (default: the scope project)',
		)
		.option('--sprint-portfolio <gid>', 'Portfolio that groups the sprint projects, for the project sprint model')
		.option('--sprint-template <gid-or-alias>', 'Project the project sprint model duplicates to start a sprint')
		.option('--default', 'Use this scope when a command is given no --scope')
		.option('--sprint-model <model>', 'Override the policy sprint_model for this scope')
		.option('--sprint-length-days <n>', 'Override the policy sprint_length_days for this scope', positiveInt)
		.option('--sprint-anchor-date <date>', 'Override the policy sprint_anchor_date (YYYY-MM-DD) for this scope')
		.option(
			'--global',
			"Save to the global registry (~/.config/cyber-asana) for this repo instead of the repo's config",
		)
		.option('--repo <key>', 'Repo key for --global (default: derived from the git remote)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.action(async (name: string, opts: AddFlags) => {
			const projects = opts.project.length
				? (await Promise.all(opts.project.map((ref) => resolveProjectRef(ref, { configPath: opts.config })))).flatMap(
						(gids) => (gids as string).split(','),
					)
				: undefined
			const scope: ScopeEntry = {
				name,
				kind: opts.kind,
				...(projects && { projects }),
				...(opts.portfolio !== undefined && { portfolio: opts.portfolio }),
				...(opts.team !== undefined && { team: opts.team }),
				...(opts.default && { default: true as const }),
				...(opts.backlogProject !== undefined && {
					backlog_project: (await resolveProjectRef(opts.backlogProject, { configPath: opts.config })) as string,
				}),
				...(opts.sprintPortfolio !== undefined && { sprint_portfolio: opts.sprintPortfolio }),
				...(opts.sprintTemplate !== undefined && {
					sprint_template: (await resolveProjectRef(opts.sprintTemplate, { configPath: opts.config })) as string,
				}),
				...(opts.sprintModel !== undefined && { sprint_model: opts.sprintModel }),
				...(opts.sprintLengthDays !== undefined && { sprint_length_days: opts.sprintLengthDays }),
				...(opts.sprintAnchorDate !== undefined && { sprint_anchor_date: opts.sprintAnchorDate }),
			}
			const saved = await resolveApi(api).addScope(scope, { ...storeOptions(opts), global: opts.global })
			output(saved, () => {
				console.log(`Added scope ${name} to ${saved.path}`)
				printNextSteps([`cyber-asana scrum scope resolve --scope ${name} — check what it covers`])
			})
		})

	cmd
		.command('remove <name>')
		.description('Remove a scope by name (from the repo config, else the global registry)')
		.option('--global', 'Remove from the global registry only')
		.option('--repo <key>', 'Repo key for --global (default: derived from the git remote)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.action(async (name: string, opts: StoreFlags) => {
			const result = await resolveApi(api).removeScope(name, { ...storeOptions(opts), global: opts.global })
			output(result, () =>
				console.log(
					result.already_absent ? `Scope ${name} was already absent` : `Removed scope ${name} from ${result.path}`,
				),
			)
		})

	cmd
		.command('list')
		.description('List scopes from the repo config and the global registry, and which is the default')
		.option('--repo <key>', 'Repo key for the global registry (default: derived from the git remote)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.action(async (opts: StoreFlags) => {
			const listing = await resolveApi(api).listScopes(storeOptions(opts))
			output(listing, () => {
				printTable(
					listing.scopes,
					[
						{ label: 'Name', get: (s) => s.name },
						{ label: 'Kind', get: (s) => s.kind },
						{ label: 'Members', get: members },
						{ label: 'Default', get: (s) => (s.default ? 'yes' : '') },
						{ label: 'Source', get: (s) => s.source },
						{ label: 'Overrides', get: overrides },
					],
					{ entity: 'scopes' },
				)
				printCountSummary(listing.scopes.length, 'scope(s)')
				printNextSteps(
					listing.scopes.length > 0
						? ['cyber-asana scrum scope resolve --scope <name> — see the projects a scope covers']
						: ['cyber-asana config scope add <name> --kind project --project <gid> — add a scope'],
				)
				if (listing.implicit) {
					console.log(
						`Commands use the implicit project scope "${listing.implicit.name}" (the repo's default project) until a scope is added`,
					)
				}
			})
		})

	return cmd
}

/** `scrum scope resolve`. Later units add sprint, backlog, and report commands under `scrum`. */
export function scrumCommand(api?: ResolveApi) {
	const cmd = new Command('scrum').description('Scrum on Asana: scopes, sprints, and reports')
	const scope = cmd.command('scope').description('Work with scrum scopes')

	scope
		.command('resolve')
		.description('Resolve a scope to the projects it covers and its effective sprint settings')
		.option('--scope <name>', 'Scope name (default: the scope marked default, else the repo default project)')
		.option('--tasks', "Also list the scope's tasks, each counted once however many of its projects it is in")
		.option('--repo <key>', 'Repo key for the global registry (default: derived from the git remote)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.action(async (opts: StoreFlags & { scope?: string; tasks?: boolean }) => {
			const resolved = await resolveApi(api).resolveScope(
				{ ...(opts.scope !== undefined && { scope: opts.scope }), ...(opts.tasks && { tasks: true }) },
				storeOptions(opts),
			)
			output(resolved, () => {
				printFields({
					Scope: resolved.implicit
						? `${resolved.scope.name} (implicit: the repo's default project)`
						: resolved.scope.name,
					Kind: resolved.scope.kind,
					...Object.fromEntries(Object.entries(resolved.sprint).map(([key, value]) => [key, String(value)])),
				})
				printTable(
					resolved.projects,
					[
						{ label: 'Project GID', get: (p) => p.gid },
						{ label: 'Name', get: (p) => p.name ?? '' },
					],
					{ entity: 'projects' },
				)
				printCountSummary(resolved.projects.length, 'project(s)')
				if (resolved.people) {
					printTable(
						resolved.people,
						[
							{ label: 'User GID', get: (p) => p.gid },
							{ label: 'Name', get: (p) => p.name ?? '' },
						],
						{ entity: 'people' },
					)
					printCountSummary(resolved.people.length, 'people')
				}
				if (resolved.tasks) console.log(`\n${resolved.tasks.length} task(s) across the scope`)
			})
		})

	return cmd
}

export type SprintFlags = StoreFlags & { scope?: string; sprint?: string }

export function addSprintOptions(cmd: Command, opts: { sprint?: boolean } = { sprint: true }) {
	cmd.option('--scope <name>', 'Scope name (default: the scope marked default, else the repo default project)')
	if (opts.sprint) {
		cmd.option('--sprint <ref>', 'Sprint: current (default), next, previous, a number, or a name', 'current')
	}
	return cmd
		.option('--repo <key>', 'Repo key for the global registry (default: derived from the git remote)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
}

export function sprintInput(opts: SprintFlags) {
	return {
		...(opts.scope !== undefined && { scope: opts.scope }),
		...(opts.sprint !== undefined && opts.sprint !== 'current' && { sprint: opts.sprint }),
	}
}

export function dates(sprint: { start: string; end: string }) {
	return `${sprint.start} to ${sprint.end}`
}

type TaskRow = { gid: string; name?: unknown; completed?: unknown; assignee?: { name?: string } | null }

const taskColumns = [
	{ label: 'GID', get: (t: TaskRow) => t.gid },
	{ label: 'Name', get: (t: TaskRow) => String(t.name ?? '') },
	{ label: 'Done', get: (t: TaskRow) => (t.completed ? 'yes' : '') },
	{ label: 'Assignee', get: (t: TaskRow) => t.assignee?.name ?? '' },
]

/** `sprint current | list | tasks | add | start | close`: computed sprints over the scope's sprint model. */
export function sprintCommand(api?: ResolveApi) {
	const cmd = new Command('sprint').description(
		'Sprints from the scrum policy: the name and dates are computed, the scope holds the projects',
	)
	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana sprint current',
			'  cyber-asana sprint tasks --sprint previous --incomplete',
			'  cyber-asana sprint start --sprint next',
			'  cyber-asana sprint add <task-gid> <task-gid>',
			'  cyber-asana sprint close',
			'',
			'Exit 2 with error.code sprint-none (no sprint started), sprint-unknown, model-unsupported, or policy-incomplete.',
		].join('\n'),
	)

	addSprintOptions(
		cmd.command('current').description("Today's sprint: index, name, dates, and the projects holding it"),
		{
			sprint: false,
		},
	).action(async (opts: SprintFlags) => {
		const current = await resolveApi(api).currentSprint(sprintInput(opts), storeOptions(opts))
		output(current, () => {
			printFields({
				Scope: current.scope,
				Sprint: `${current.sprint.name} (#${current.sprint.n})`,
				Dates: dates(current.sprint),
				'Working days': String(current.sprint.working_days),
				Today: `${current.today} (${current.timezone}, from ${current.timezone_source === 'asana' ? 'Asana' : 'this machine'})`,
				Projects: current.projects.map((p) => p.gid).join(', '),
				Missing: current.missing.length ? current.missing.join(', ') : undefined,
			})
			printNextSteps([
				'cyber-asana sprint tasks — list its tasks',
				...(current.missing.length
					? [`cyber-asana sprint start --scope ${current.scope} — create it where missing`]
					: []),
			])
		})
	})

	addSprintOptions(cmd.command('list').description('Sprints that have a section in the scope, with the current one'), {
		sprint: false,
	}).action(async (opts: SprintFlags) => {
		const listing = await resolveApi(api).listSprints(sprintInput(opts), storeOptions(opts))
		output(listing, () => {
			printTable(
				listing.sprints,
				[
					{ label: '#', get: (s) => String(s.n) },
					{ label: 'Name', get: (s) => s.name },
					{ label: 'Start', get: (s) => s.start },
					{ label: 'End', get: (s) => s.end },
					{ label: 'State', get: (s) => s.state },
					{ label: 'Exists', get: (s) => (s.exists ? 'yes' : 'no') },
				],
				{ entity: 'sprints' },
			)
			printCountSummary(listing.sprints.length, 'sprint(s)')
			printNextSteps(['cyber-asana sprint tasks --sprint <n> — list one sprint'])
		})
	})

	addSprintOptions(
		cmd.command('tasks').description("List a sprint's tasks, each counted once across the scope's projects"),
	)
		.option('--incomplete', 'Only tasks that are not completed')
		.option('--opt-fields <fields>', 'Comma-separated Asana fields (default: gid,name,completed,assignee.name)')
		.action(async (opts: SprintFlags & { incomplete?: boolean; optFields?: string }) => {
			const result = await resolveApi(api).sprintTasks(
				{
					...sprintInput(opts),
					...(opts.incomplete && { incomplete: true }),
					...(opts.optFields !== undefined && { optFields: opts.optFields }),
				},
				storeOptions(opts),
			)
			output(result, () => {
				console.log(`${result.sprint.name} (${dates(result.sprint)})`)
				printTable(result.tasks as TaskRow[], taskColumns, { entity: 'tasks' })
				printCountSummary(result.count.total, `task(s): ${result.count.completed} completed, ${result.count.open} open`)
				printNextSteps(['cyber-asana sprint close — carry the open tasks over'])
			})
		})

	addSprintOptions(
		cmd
			.command('add <task-gid...>')
			.description("Put tasks in a sprint: moves each into the sprint's section of its project in the scope"),
	).action(async (tasks: string[], opts: SprintFlags) => {
		const result = await resolveApi(api).addToSprint({ ...sprintInput(opts), tasks }, storeOptions(opts))
		output(result, () => {
			for (const a of result.added)
				console.log(
					`Added task ${a.task} to ${result.sprint.name} in project ${a.project}${a.from ? ` (from ${a.from})` : ''}`,
				)
			for (const t of result.already_in_sprint) console.log(`Task ${t} was already in ${result.sprint.name}`)
			for (const t of result.outside_scope) console.log(`Task ${t} is in none of the scope's projects; left alone`)
			printNextSteps(['cyber-asana sprint tasks — see the sprint'])
		})
	})

	addSprintOptions(
		cmd
			.command('start')
			.description("Create the sprint's section in each project that lacks one; a no-op when they exist"),
	)
		.option(
			'--snapshot',
			'Post the commitment (the sprint tasks and points) as a status update on each project; a no-op where one exists',
		)
		.action(async (opts: SprintFlags & { snapshot?: boolean }) => {
			const result = await resolveApi(api).startSprint(
				{ ...sprintInput(opts), ...(opts.snapshot && { snapshot: true }) },
				storeOptions(opts),
			)
			output(result, () => {
				console.log(
					result.already_started
						? `${result.sprint.name} already started (${result.existing.length} project(s)); nothing to do`
						: `Started ${result.sprint.name} (${dates(result.sprint)}): created its section in ${result.created.join(', ')}`,
				)
				if (result.snapshot) {
					if (result.snapshot.posted.length) {
						console.log(`Posted the commitment snapshot in project(s) ${result.snapshot.posted.join(', ')}`)
					}
					if (result.snapshot.existing.length) {
						console.log(
							`The commitment snapshot was already there; ${result.snapshot.existing.length} project(s) already had one in ${result.snapshot.existing.join(', ')}`,
						)
					}
				}
				printNextSteps(
					result.snapshot
						? ['cyber-asana report sprint — compare the sprint with its commitment']
						: [
								'cyber-asana backlog list — pick what to commit',
								'cyber-asana sprint add <task-gid> — commit a task',
								'cyber-asana sprint start --snapshot — post the commitment once the sprint is filled',
							],
				)
			})
		})

	addSprintOptions(
		cmd.command('close').description("Close a sprint: carry its incomplete tasks over as the policy's carry_over says"),
	).action(async (opts: SprintFlags) => {
		const result = await resolveApi(api).closeSprint(sprintInput(opts), storeOptions(opts))
		output(result, () => {
			if (result.carry_over === 'move') {
				console.log(
					result.moved.length === 0
						? `${result.sprint.name} has no incomplete tasks; nothing to carry over`
						: `${result.moved.length} task(s) moved from ${result.sprint.name} to ${result.next_sprint.name}`,
				)
			} else {
				console.log(`carry_over is leave: ${result.left.length} incomplete task(s) stay in ${result.sprint.name}`)
			}
			if (!result.ended) console.log(`Note: ${result.sprint.name} runs until ${result.sprint.end}`)
			printNextSteps([`cyber-asana sprint tasks --sprint ${result.next_sprint.n} — see the next sprint`])
		})
	})

	return cmd
}

/** `backlog list`: incomplete tasks that belong to no sprint. */
export function backlogCommand(api?: ResolveApi) {
	const cmd = new Command('backlog').description('The scrum backlog: incomplete tasks that belong to no sprint')
	addSprintOptions(cmd.command('list').description('List the backlog in each project order, each task once'), {
		sprint: false,
	})
		.option('--opt-fields <fields>', 'Comma-separated Asana fields (default: gid,name,completed,assignee.name)')
		.action(async (opts: SprintFlags & { optFields?: string }) => {
			const result = await resolveApi(api).listBacklog(
				{ ...sprintInput(opts), ...(opts.optFields !== undefined && { optFields: opts.optFields }) },
				storeOptions(opts),
			)
			output(result, () => {
				printTable(
					result.tasks as Array<TaskRow & { section?: string }>,
					[...taskColumns, { label: 'Section', get: (t: TaskRow & { section?: string }) => t.section ?? '' }],
					{ entity: 'tasks' },
				)
				printCountSummary(result.count, 'task(s) in the backlog')
				if (result.backlog_section_missing.length) {
					console.log(
						`\nNo "${result.backlog_section}" section in project(s) ${result.backlog_section_missing.join(', ')}. Create it with: cyber-asana section create "${result.backlog_section}" --project-gid <gid>`,
					)
				}
				printNextSteps(['cyber-asana sprint add <task-gid> — commit a task to the current sprint'])
			})
		})
	return cmd
}
