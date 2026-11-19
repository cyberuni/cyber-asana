import { Command, InvalidArgumentError } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	addReadOptions,
	itemsForOutput,
	normalizedGid,
	paginationOptionsFromCli,
	printNextPageHint,
	readOptionsFromCli,
	requiredGid,
} from '../platform/cli/options.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../platform/cli/output.js'
import { deleteIdempotently, deleteMessage } from '../platform/idempotent-delete.js'
import type { GoalApi, GoalListOptions, GoalMetricInput, TimePeriodListOptions } from './api.js'
import {
	addGoalFollowers,
	addSupportingRelationship,
	createGoal,
	deleteGoal,
	getGoal,
	getTimePeriod,
	listGoals,
	listTimePeriods,
	removeGoalFollowers,
	removeSupportingRelationship,
	setGoalMetric,
	setGoalMetricCurrentValue,
	updateGoal,
} from './default.js'
import { buildGoalCreateFields, buildGoalUpdateFields } from './write-options.js'

type Goal = { gid: string; name?: string; permalink_url?: string; due_on?: string | null; status?: string | null }

function fmtGoal(g: Goal) {
	printFields({
		Name: g.name ?? null,
		ID: g.gid,
		URL: g.permalink_url ?? null,
		Due: g.due_on ?? null,
		Status: g.status ?? null,
	})
}

function parseNumber(name: string) {
	return (value: string) => {
		const n = Number(value)
		if (value.trim() === '' || Number.isNaN(n)) throw new InvalidArgumentError(`${name} must be a number`)
		return n
	}
}

function collectOption(value: string, previous: string[] = []) {
	return [...previous, value]
}

function splitList(values?: string[]) {
	const items = (values ?? [])
		.flatMap((v) => v.split(','))
		.map((v) => v.trim())
		.filter(Boolean)
	return items.length > 0 ? items : undefined
}

const GOAL_STATUS_HELP =
	'Status: green, yellow, red while open; missed, achieved, partial, dropped when closed. Asana accepts it only when the goal has a metric'

type GoalWriteCliOptions = {
	timePeriod?: string
	owner?: string
	ownerGid?: string
	team?: string
	teamGid?: string
	workspaceLevel?: boolean
	liked?: boolean
}

function addGoalWriteOptions<T extends Command>(cmd: T) {
	addGidOption(cmd, 'owner', 'Owner user GID')
	addGidOption(cmd, 'team', 'Team GID; Asana honours it only in an organization')
	return cmd
		.option('--time-period <gid>', 'Time period GID (see goal time-period list)')
		.option('--workspace-level', 'Make it a workspace-level goal (organization only)')
		.option('--no-workspace-level', 'Make it a team goal (organization only)')
		.option('--liked', 'Like the goal')
		.option('--no-liked', 'Remove your like from the goal')
}

function goalWriteInputFromCli(opts: GoalWriteCliOptions) {
	return {
		timePeriod: opts.timePeriod,
		owner: normalizedGid(opts, 'owner'),
		team: normalizedGid(opts, 'team'),
		isWorkspaceLevel: opts.workspaceLevel,
		liked: opts.liked,
	}
}

function resolveGoalApi(api?: GoalApi | (() => GoalApi)): GoalApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listGoals,
			getGoal,
			createGoal,
			updateGoal,
			deleteGoal,
			listTimePeriods,
			getTimePeriod,
			setGoalMetric,
			setGoalMetricCurrentValue,
			addSupportingRelationship,
			removeSupportingRelationship,
			addGoalFollowers,
			removeGoalFollowers,
		}
	)
}

type TimePeriod = { gid: string; display_name?: string; start_on?: string; end_on?: string; period?: string }

const TIME_PERIOD_LIST_FIELDS = 'gid,display_name,start_on,end_on'

const TIME_PERIOD_LIST_NEXT_STEPS = [
	'cyber-asana goal time-period get <gid> — view a time period',
	'cyber-asana goal create <name> --workspace-gid <gid> — create a goal',
]

// Minimal default schema for goal lists — principle 2.
const GOAL_LIST_FIELDS = 'gid,name,due_on'

const GOAL_LIST_NEXT_STEPS = [
	'cyber-asana goal get <gid> — view a goal',
	'cyber-asana status list --parent-gid <gid> — status updates on a goal',
]

export function goalCommand(api?: GoalApi | (() => GoalApi)) {
	const cmd = new Command('goal').description('Manage Asana goals')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana goal list --workspace-gid <gid>',
			'  cyber-asana goal get <gid> --toon',
			'  cyber-asana goal create "Ship v1" --workspace-gid <gid> --due-on 2026-12-31',
			'  cyber-asana goal update <gid> --name "Ship v2"',
			'  cyber-asana goal delete <gid>',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	const listCmd = addGidOption(
		cmd
			.command('list')
			.description(
				'List goals in a workspace, or by --portfolio, --project, --task or --team (a scope other than the workspace drops the ASANA_WORKSPACE_GID default)',
			),
		'workspace',
		'Workspace GID',
	)
	for (const [name, label] of [
		['portfolio', 'Supporting portfolio GID'],
		['project', 'Supporting project GID'],
		['task', 'Supporting task GID'],
		['team', 'Team GID'],
	] as const) {
		addGidOption(listCmd, name, label)
	}
	addPaginationOptions(listCmd)
		.option('--workspace-level', 'Only workspace-level goals; needs the workspace')
		.option('--no-workspace-level', 'Only goals that are not workspace-level; needs the workspace')
		.option('--time-period <gid[,gid...]>', 'Only goals in these time periods, repeatable', collectOption, [])
		.action(
			async (opts: {
				workspace?: string
				workspaceGid?: string
				portfolio?: string
				portfolioGid?: string
				project?: string
				projectGid?: string
				task?: string
				taskGid?: string
				team?: string
				teamGid?: string
				workspaceLevel?: boolean
				timePeriod?: string[]
				limit?: number
				offset?: string
				optFields?: string
			}) => {
				const pagination: GoalListOptions = paginationOptionsFromCli(opts)
				pagination.optFields ??= GOAL_LIST_FIELDS
				const filters = {
					portfolio: normalizedGid(opts, 'portfolio'),
					project: normalizedGid(opts, 'project'),
					task: normalizedGid(opts, 'task'),
					team: normalizedGid(opts, 'team'),
				}
				const scoped = Object.values(filters).some((v) => v !== undefined)
				if (filters.portfolio !== undefined) pagination.portfolio = filters.portfolio
				if (filters.project !== undefined) pagination.project = filters.project
				if (filters.task !== undefined) pagination.task = filters.task
				if (filters.team !== undefined) pagination.team = filters.team
				if (opts.workspaceLevel !== undefined) pagination.isWorkspaceLevel = opts.workspaceLevel
				const timePeriods = splitList(opts.timePeriod)
				if (timePeriods) pagination.timePeriods = timePeriods
				// Another scope filter replaces the environment workspace; only a workspace flag stays.
				const workspace = scoped
					? (opts.workspaceGid ?? opts.workspace)
					: requiredGid(opts, 'workspace', 'Workspace GID')
				const data = await resolveGoalApi(api).listGoals(workspace, pagination)
				output(data, () => {
					const items = itemsForOutput(data)
					printTable(
						items,
						[
							{ label: 'Name', get: (g: Goal) => g.name ?? '' },
							{ label: 'ID', get: (g: Goal) => g.gid },
							{ label: 'Due', get: (g: Goal) => g.due_on ?? '' },
						],
						{ entity: 'goals' },
					)
					printCountSummary(items.length, 'goal(s)')
					printNextPageHint(data)
					printNextSteps(GOAL_LIST_NEXT_STEPS)
				})
			},
		)

	addReadOptions(cmd.command('get <gid>').description('Get a goal by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveGoalApi(api).getGoal(gid, readOptionsFromCli(opts))
			output(data, () => fmtGoal(data))
		},
	)

	const createCmd = addGidOption(
		cmd.command('create <name>').description('Create a goal'),
		'workspace',
		'Workspace GID',
	)
	addGoalWriteOptions(addReadOptions(createCmd))
		.option('--notes <text>', 'Goal notes')
		.option('--html-notes <html>', 'Goal notes as Asana rich text HTML')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.option('--start-on <date>', 'Start date (YYYY-MM-DD); Asana requires an accompanying due date')
		.option('--follower <user[,user...]>', 'Followers to add: user GIDs, emails, or "me"; set on create only')
		.action(
			async (
				name: string,
				opts: GoalWriteCliOptions & {
					follower?: string
					workspace?: string
					workspaceGid?: string
					notes?: string
					htmlNotes?: string
					dueOn?: string
					startOn?: string
					optFields?: string
				},
			) => {
				const data = await resolveGoalApi(api).createGoal(
					requiredGid(opts, 'workspace', 'Workspace GID'),
					name,
					buildGoalCreateFields({ ...opts, ...goalWriteInputFromCli(opts), followerInput: opts.follower }),
					readOptionsFromCli(opts),
				)
				output(data, () => fmtGoal(data))
			},
		)

	addGoalWriteOptions(addReadOptions(cmd.command('update <gid>').description('Update a goal')))
		.option('--name <name>', 'New name')
		.option('--notes <text>', 'New notes')
		.option('--html-notes <html>', 'New notes as Asana rich text HTML')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.option('--clear-due-on', 'Clear the due date')
		.option('--start-on <date>', 'Start date (YYYY-MM-DD); Asana requires an accompanying due date')
		.option('--clear-start-on', 'Clear the start date')
		.option('--status <status>', GOAL_STATUS_HELP)
		.option('--custom-fields-json <json>', 'Custom field values as a JSON object of field GID to value')
		.option('--custom-field <gid=value>', 'Custom field value, repeatable', collectOption, [])
		.option(
			'--html-custom-fields-json <json>',
			'Text custom field values as a JSON object of field GID to HTML (Asana rich text subset)',
		)
		.option('--html-custom-field <gid=html>', 'Text custom field value as HTML, repeatable', collectOption, [])
		.action(
			async (
				gid: string,
				opts: GoalWriteCliOptions & {
					status?: string
					customFieldsJson?: string
					customField?: string[]
					htmlCustomFieldsJson?: string
					htmlCustomField?: string[]
					name?: string
					notes?: string
					htmlNotes?: string
					dueOn?: string
					clearDueOn?: boolean
					startOn?: string
					clearStartOn?: boolean
					optFields?: string
				},
			) => {
				const data = await resolveGoalApi(api).updateGoal(
					gid,
					buildGoalUpdateFields({
						...opts,
						...goalWriteInputFromCli(opts),
						customFieldEntries: opts.customField,
						htmlCustomFieldEntries: opts.htmlCustomField,
					}),
					readOptionsFromCli(opts),
				)
				output(data, () => fmtGoal(data))
			},
		)

	cmd
		.command('delete <gid>')
		.description('Delete a goal')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('goal', gid, () => resolveGoalApi(api).deleteGoal(gid))
			output(result, () => console.log(deleteMessage(result, 'Goal')))
		})

	const metricCmd = cmd.command('metric').description('Define a goal metric and record its progress (paid plan)')

	addReadOptions(
		metricCmd
			.command('set <goal-gid>')
			.description("Set a goal's metric: unit, precision, and initial, target, and current values"),
	)
		.option('--unit <unit>', 'none, currency, or percentage')
		.option('--precision <n>', 'Decimal places', parseNumber('--precision'))
		.option('--currency-code <code>', 'ISO 4217 code, for --unit currency')
		.option('--initial <n>', 'Initial value', parseNumber('--initial'))
		.option('--target <n>', 'Target value', parseNumber('--target'))
		.option('--current <n>', 'Current value', parseNumber('--current'))
		.option('--progress-source <source>', 'manual, subgoal_progress, project_task_completion, ...')
		.option(
			'--custom-weight',
			'Weight the supporting resources yourself; relevant only for the subgoal_progress, project_task_completion, project_milestone_completion and task_completion progress sources',
		)
		.option('--no-custom-weight', 'Weight the supporting resources equally')
		.action(
			async (
				gid: string,
				opts: {
					unit?: GoalMetricInput['unit']
					precision?: number
					currencyCode?: string
					initial?: number
					target?: number
					current?: number
					progressSource?: GoalMetricInput['progressSource']
					customWeight?: boolean
					optFields?: string
				},
			) => {
				const data = await resolveGoalApi(api).setGoalMetric(
					gid,
					{
						...(opts.unit !== undefined && { unit: opts.unit }),
						...(opts.precision !== undefined && { precision: opts.precision }),
						...(opts.currencyCode !== undefined && { currencyCode: opts.currencyCode }),
						...(opts.initial !== undefined && { initialNumberValue: opts.initial }),
						...(opts.target !== undefined && { targetNumberValue: opts.target }),
						...(opts.current !== undefined && { currentNumberValue: opts.current }),
						...(opts.progressSource !== undefined && { progressSource: opts.progressSource }),
						...(opts.customWeight !== undefined && { isCustomWeight: opts.customWeight }),
					},
					readOptionsFromCli(opts),
				)
				output(data, () => console.log(`Set the metric of goal ${gid}`))
			},
		)

	addReadOptions(
		metricCmd.command('set-current <goal-gid> <value>').description("Record a goal metric's current value"),
	).action(async (gid: string, value: string, opts: { optFields?: string }) => {
		const data = await resolveGoalApi(api).setGoalMetricCurrentValue(
			gid,
			parseNumber('<value>')(value),
			readOptionsFromCli(opts),
		)
		output(data, () => console.log(`Set the current value of goal ${gid} to ${value}`))
	})

	const supportingCmd = cmd
		.command('supporting')
		.description('Link goals, projects, or portfolios that support a goal (paid plan)')

	addReadOptions(
		supportingCmd
			.command('add <goal-gid> <supporting-gid>')
			.description('Make a goal, project, or portfolio support a goal'),
	)
		.option('--weight <n>', "Contribution weight in the goal's progress, 0 to 1", parseNumber('--weight'))
		.option('--insert-before <gid>', 'Place it before this supporting resource')
		.option('--insert-after <gid>', 'Place it after this supporting resource')
		.action(
			async (
				goalGid: string,
				supportingGid: string,
				opts: { weight?: number; insertBefore?: string; insertAfter?: string; optFields?: string },
			) => {
				const data = await resolveGoalApi(api).addSupportingRelationship(
					goalGid,
					supportingGid,
					{
						...(opts.weight !== undefined && { contributionWeight: opts.weight }),
						...(opts.insertBefore !== undefined && { insertBefore: opts.insertBefore }),
						...(opts.insertAfter !== undefined && { insertAfter: opts.insertAfter }),
					},
					readOptionsFromCli(opts),
				)
				output(data, () => console.log(`Added supporting resource ${supportingGid} to goal ${goalGid}`))
			},
		)

	supportingCmd
		.command('remove <goal-gid> <supporting-gid>')
		.description('Stop a goal, project, or portfolio supporting a goal')
		.action(async (goalGid: string, supportingGid: string) => {
			await resolveGoalApi(api).removeSupportingRelationship(goalGid, supportingGid)
			output({ goal: goalGid, supporting_resource: supportingGid, status: 'removed' }, () =>
				console.log(`Removed supporting resource ${supportingGid} from goal ${goalGid}`),
			)
		})

	const timePeriodCmd = cmd
		.command('time-period')
		.description('Find the time period GID a goal belongs to (paid plan; free-plan availability unverified)')

	addPaginationOptions(
		addGidOption(
			timePeriodCmd.command('list').description('List time periods in a workspace'),
			'workspace',
			'Workspace GID',
		),
	)
		.option('--start-on <date>', 'Only periods starting on or after this date (YYYY-MM-DD)')
		.option('--end-on <date>', 'Only periods ending on or before this date (YYYY-MM-DD)')
		.action(
			async (opts: {
				startOn?: string
				endOn?: string
				workspace?: string
				workspaceGid?: string
				limit?: number
				offset?: string
				optFields?: string
			}) => {
				const pagination: TimePeriodListOptions = paginationOptionsFromCli(opts)
				pagination.optFields ??= TIME_PERIOD_LIST_FIELDS
				if (opts.startOn !== undefined) pagination.startOn = opts.startOn
				if (opts.endOn !== undefined) pagination.endOn = opts.endOn
				const data = await resolveGoalApi(api).listTimePeriods(
					requiredGid(opts, 'workspace', 'Workspace GID'),
					pagination,
				)
				output(data, () => {
					const items = itemsForOutput(data)
					printTable(
						items,
						[
							{ label: 'Name', get: (p: TimePeriod) => p.display_name ?? '' },
							{ label: 'ID', get: (p: TimePeriod) => p.gid },
							{ label: 'Start', get: (p: TimePeriod) => p.start_on ?? '' },
							{ label: 'End', get: (p: TimePeriod) => p.end_on ?? '' },
						],
						{ entity: 'time periods' },
					)
					printCountSummary(items.length, 'time period(s)')
					printNextPageHint(data)
					printNextSteps(TIME_PERIOD_LIST_NEXT_STEPS)
				})
			},
		)

	addReadOptions(timePeriodCmd.command('get <gid>').description('Get a time period by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveGoalApi(api).getTimePeriod(gid, readOptionsFromCli(opts))
			output(data, () =>
				printFields({
					Name: data.display_name ?? null,
					ID: data.gid,
					Period: data.period ?? null,
					Start: data.start_on ?? null,
					End: data.end_on ?? null,
				}),
			)
		},
	)

	const followerCmd = cmd.command('follower').description('Manage the followers of a goal (paid plan)')

	followerCmd
		.command('add <goal-gid> <follower-gids...>')
		.description('Add followers to a goal')
		.action(async (goalGid: string, followerGids: string[]) => {
			await resolveGoalApi(api).addGoalFollowers(goalGid, followerGids)
			output({ goal: goalGid, followers: followerGids, status: 'added' }, () =>
				console.log(`Added ${followerGids.length} follower(s) to goal ${goalGid}`),
			)
		})

	followerCmd
		.command('remove <goal-gid> <follower-gids...>')
		.description('Remove followers from a goal')
		.action(async (goalGid: string, followerGids: string[]) => {
			await resolveGoalApi(api).removeGoalFollowers(goalGid, followerGids)
			output({ goal: goalGid, followers: followerGids, status: 'removed' }, () =>
				console.log(`Removed ${followerGids.length} follower(s) from goal ${goalGid}`),
			)
		})

	return cmd
}
