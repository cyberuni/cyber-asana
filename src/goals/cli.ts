import { Command } from 'commander'
import { createGoal, deleteGoal, getGoal, listGoals, updateGoal } from './api.js'

export function goalCommand() {
	const cmd = new Command('goal').description('Manage Asana goals')

	cmd
		.command('list')
		.description('List goals in a workspace')
		.requiredOption('--workspace <gid>', 'Workspace GID')
		.action(async (opts: { workspace: string }) => {
			console.log(JSON.stringify(await listGoals(opts.workspace), null, 2))
		})

	cmd
		.command('get <gid>')
		.description('Get a goal by GID')
		.action(async (gid: string) => {
			console.log(JSON.stringify(await getGoal(gid), null, 2))
		})

	cmd
		.command('create <name>')
		.description('Create a goal')
		.requiredOption('--workspace <gid>', 'Workspace GID')
		.option('--notes <text>', 'Goal notes')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.action(async (name: string, opts: { workspace: string; notes?: string; dueOn?: string }) => {
			console.log(
				JSON.stringify(await createGoal(opts.workspace, name, { notes: opts.notes, due_on: opts.dueOn }), null, 2),
			)
		})

	cmd
		.command('update <gid>')
		.description('Update a goal')
		.option('--name <name>', 'New name')
		.option('--notes <text>', 'New notes')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.action(async (gid: string, opts: { name?: string; notes?: string; dueOn?: string }) => {
			console.log(
				JSON.stringify(await updateGoal(gid, { name: opts.name, notes: opts.notes, due_on: opts.dueOn }), null, 2),
			)
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
