import { Command } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	addReadOptions,
	itemsForOutput,
	paginationOptionsFromCli,
	printNextPageHint,
	readOptionsFromCli,
	requiredGid,
} from '../cli-options.js'
import { deleteIdempotently, deleteMessage } from '../idempotent-delete.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../output.js'
import type { GoalApi } from './api.js'
import { createGoal, deleteGoal, getGoal, listGoals, updateGoal } from './api.js'
import { buildGoalCreateFields, buildGoalUpdateFields } from './write-options.js'

type Goal = { gid: string; name: string; permalink_url?: string; due_on?: string | null; status?: string | null }

function fmtGoal(g: Goal) {
	printFields({
		Name: g.name,
		ID: g.gid,
		URL: g.permalink_url ?? null,
		Due: g.due_on ?? null,
		Status: g.status ?? null,
	})
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
		addGidOption(cmd.command('list').description('List goals in a workspace'), 'workspace', 'Workspace GID', {
			env: 'ASANA_WORKSPACE',
		}),
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
						{ label: 'Name', get: (g: Goal) => g.name },
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
		{
			env: 'ASANA_WORKSPACE',
		},
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

	return cmd
}
