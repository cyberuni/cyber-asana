import { Command, Option } from 'commander'
import { output, printFields, printTable } from '../output.js'
import { createGoal, deleteGoal, getGoal, listGoals, updateGoal } from './api.js'

const workspaceOpt = () =>
	new Option('--workspace <gid>', 'Workspace GID (or set ASANA_WORKSPACE)').env('ASANA_WORKSPACE').makeOptionMandatory()

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

export function goalCommand() {
	const cmd = new Command('goal').description('Manage Asana goals')

	cmd
		.command('list')
		.description('List goals in a workspace')
		.addOption(workspaceOpt())
		.action(async (opts: { workspace: string }) => {
			const data = await listGoals(opts.workspace)
			output(data, () =>
				printTable(data, [
					{ label: 'Name', get: (g: Goal) => g.name },
					{ label: 'ID', get: (g: Goal) => g.gid },
					{ label: 'Due', get: (g: Goal) => g.due_on ?? '' },
				]),
			)
		})

	cmd
		.command('get <gid>')
		.description('Get a goal by GID')
		.action(async (gid: string) => {
			const data = await getGoal(gid)
			output(data, () => fmtGoal(data))
		})

	cmd
		.command('create <name>')
		.description('Create a goal')
		.addOption(workspaceOpt())
		.option('--notes <text>', 'Goal notes')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.action(async (name: string, opts: { workspace: string; notes?: string; dueOn?: string }) => {
			const data = await createGoal(opts.workspace, name, { notes: opts.notes, due_on: opts.dueOn })
			output(data, () => fmtGoal(data))
		})

	cmd
		.command('update <gid>')
		.description('Update a goal')
		.option('--name <name>', 'New name')
		.option('--notes <text>', 'New notes')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.action(async (gid: string, opts: { name?: string; notes?: string; dueOn?: string }) => {
			const data = await updateGoal(gid, { name: opts.name, notes: opts.notes, due_on: opts.dueOn })
			output(data, () => fmtGoal(data))
		})

	cmd
		.command('delete <gid>')
		.description('Delete a goal')
		.action(async (gid: string) => {
			await deleteGoal(gid)
			console.log(`Deleted goal ${gid}`)
		})

	return cmd
}
