import { Command, InvalidArgumentError } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	addReadOptions,
	itemsForOutput,
	paginationOptionsFromCli,
	printNextPageHint,
	readOptionsFromCli,
	requiredGid,
} from '../platform/cli/options.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../platform/cli/output.js'
import { deleteIdempotently, deleteMessage } from '../platform/idempotent-delete.js'
import type { GoalApi, GoalMetricInput } from './api.js'
import {
	addGoalFollowers,
	addSupportingRelationship,
	createGoal,
	deleteGoal,
	getGoal,
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
			setGoalMetric,
			setGoalMetricCurrentValue,
			addSupportingRelationship,
			removeSupportingRelationship,
			addGoalFollowers,
			removeGoalFollowers,
		}
	)
}

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

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List goals in a workspace'), 'workspace', 'Workspace GID'),
	).action(
		async (opts: {
			workspace?: string
			workspaceGid?: string
			limit?: number
			offset?: string
			optFields?: string
		}) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= GOAL_LIST_FIELDS
			const data = await resolveGoalApi(api).listGoals(requiredGid(opts, 'workspace', 'Workspace GID'), pagination)
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
	createCmd
		.option('--notes <text>', 'Goal notes')
		.option('--html-notes <html>', 'Goal notes as Asana rich text HTML')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.option('--start-on <date>', 'Start date (YYYY-MM-DD); Asana requires an accompanying due date')
		.action(
			async (
				name: string,
				opts: {
					workspace?: string
					workspaceGid?: string
					notes?: string
					htmlNotes?: string
					dueOn?: string
					startOn?: string
				},
			) => {
				const data = await resolveGoalApi(api).createGoal(
					requiredGid(opts, 'workspace', 'Workspace GID'),
					name,
					buildGoalCreateFields(opts),
				)
				output(data, () => fmtGoal(data))
			},
		)

	cmd
		.command('update <gid>')
		.description('Update a goal')
		.option('--name <name>', 'New name')
		.option('--notes <text>', 'New notes')
		.option('--html-notes <html>', 'New notes as Asana rich text HTML')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.option('--clear-due-on', 'Clear the due date')
		.option('--start-on <date>', 'Start date (YYYY-MM-DD); Asana requires an accompanying due date')
		.option('--clear-start-on', 'Clear the start date')
		.action(
			async (
				gid: string,
				opts: {
					name?: string
					notes?: string
					htmlNotes?: string
					dueOn?: string
					clearDueOn?: boolean
					startOn?: string
					clearStartOn?: boolean
				},
			) => {
				const data = await resolveGoalApi(api).updateGoal(gid, buildGoalUpdateFields(opts))
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

	metricCmd
		.command('set <goal-gid>')
		.description("Set a goal's metric: unit, precision, and initial, target, and current values")
		.option('--unit <unit>', 'none, currency, or percentage')
		.option('--precision <n>', 'Decimal places', parseNumber('--precision'))
		.option('--currency-code <code>', 'ISO 4217 code, for --unit currency')
		.option('--initial <n>', 'Initial value', parseNumber('--initial'))
		.option('--target <n>', 'Target value', parseNumber('--target'))
		.option('--current <n>', 'Current value', parseNumber('--current'))
		.option('--progress-source <source>', 'manual, subgoal_progress, project_task_completion, ...')
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
				},
			) => {
				const data = await resolveGoalApi(api).setGoalMetric(gid, {
					...(opts.unit !== undefined && { unit: opts.unit }),
					...(opts.precision !== undefined && { precision: opts.precision }),
					...(opts.currencyCode !== undefined && { currencyCode: opts.currencyCode }),
					...(opts.initial !== undefined && { initialNumberValue: opts.initial }),
					...(opts.target !== undefined && { targetNumberValue: opts.target }),
					...(opts.current !== undefined && { currentNumberValue: opts.current }),
					...(opts.progressSource !== undefined && { progressSource: opts.progressSource }),
				})
				output(data, () => console.log(`Set the metric of goal ${gid}`))
			},
		)

	metricCmd
		.command('set-current <goal-gid> <value>')
		.description("Record a goal metric's current value")
		.action(async (gid: string, value: string) => {
			const data = await resolveGoalApi(api).setGoalMetricCurrentValue(gid, parseNumber('<value>')(value))
			output(data, () => console.log(`Set the current value of goal ${gid} to ${value}`))
		})

	const supportingCmd = cmd
		.command('supporting')
		.description('Link goals, projects, or portfolios that support a goal (paid plan)')

	supportingCmd
		.command('add <goal-gid> <supporting-gid>')
		.description('Make a goal, project, or portfolio support a goal')
		.option('--weight <n>', "Contribution weight in the goal's progress, 0 to 1", parseNumber('--weight'))
		.option('--insert-before <gid>', 'Place it before this supporting resource')
		.option('--insert-after <gid>', 'Place it after this supporting resource')
		.action(
			async (
				goalGid: string,
				supportingGid: string,
				opts: { weight?: number; insertBefore?: string; insertAfter?: string },
			) => {
				const data = await resolveGoalApi(api).addSupportingRelationship(goalGid, supportingGid, {
					...(opts.weight !== undefined && { contributionWeight: opts.weight }),
					...(opts.insertBefore !== undefined && { insertBefore: opts.insertBefore }),
					...(opts.insertAfter !== undefined && { insertAfter: opts.insertAfter }),
				})
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
