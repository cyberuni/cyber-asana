import { Command } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	itemsForOutput,
	paginationOptionsFromCli,
	printNextPageHint,
	requiredGid,
} from '../cli-options.js'
import { output, printFields, printTable } from '../output.js'
import type { GoalApi } from './api.js'
import { createGoal, deleteGoal, getGoal, listGoals, updateGoal } from './api.js'

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

export function goalCommand(api?: GoalApi | (() => GoalApi)) {
	const cmd = new Command('goal').description('Manage Asana goals')

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
			const data = await resolveGoalApi(api).listGoals(
				requiredGid(opts, 'workspace', 'Workspace GID'),
				paginationOptionsFromCli(opts),
			)
			output(data, () => {
				printTable(itemsForOutput(data), [
					{ label: 'Name', get: (g: Goal) => g.name },
					{ label: 'ID', get: (g: Goal) => g.gid },
					{ label: 'Due', get: (g: Goal) => g.due_on ?? '' },
				])
				printNextPageHint(data)
			})
		},
	)

	cmd
		.command('get <gid>')
		.description('Get a goal by GID')
		.action(async (gid: string) => {
			const data = await resolveGoalApi(api).getGoal(gid)
			output(data, () => fmtGoal(data))
		})

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
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.action(
			async (name: string, opts: { workspace?: string; workspaceGid?: string; notes?: string; dueOn?: string }) => {
				const data = await resolveGoalApi(api).createGoal(requiredGid(opts, 'workspace', 'Workspace GID'), name, {
					notes: opts.notes,
					due_on: opts.dueOn,
				})
				output(data, () => fmtGoal(data))
			},
		)

	cmd
		.command('update <gid>')
		.description('Update a goal')
		.option('--name <name>', 'New name')
		.option('--notes <text>', 'New notes')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.action(async (gid: string, opts: { name?: string; notes?: string; dueOn?: string }) => {
			const data = await resolveGoalApi(api).updateGoal(gid, { name: opts.name, notes: opts.notes, due_on: opts.dueOn })
			output(data, () => fmtGoal(data))
		})

	cmd
		.command('delete <gid>')
		.description('Delete a goal')
		.action(async (gid: string) => {
			await resolveGoalApi(api).deleteGoal(gid)
			console.log(`Deleted goal ${gid}`)
		})

	return cmd
}
