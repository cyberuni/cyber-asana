import { Command } from 'commander'
import { createTask, deleteTask, getTask, listTasks, searchTasks, updateTask } from './api.js'

export function taskCommand() {
	const cmd = new Command('task').description('Manage Asana tasks')

	cmd
		.command('list')
		.description('List tasks in a project')
		.requiredOption('--project <gid>', 'Project GID')
		.action(async (opts: { project: string }) => {
			console.log(JSON.stringify(await listTasks(opts.project), null, 2))
		})

	cmd
		.command('get <gid>')
		.description('Get a task by GID')
		.action(async (gid: string) => {
			console.log(JSON.stringify(await getTask(gid), null, 2))
		})

	cmd
		.command('create <name>')
		.description('Create a new task')
		.requiredOption('--workspace <gid>', 'Workspace GID')
		.option('--project <gid>', 'Project GID')
		.option('--assignee <gid>', 'Assignee user GID')
		.option('--notes <text>', 'Task notes')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.action(
			async (
				name: string,
				opts: { workspace: string; project?: string; assignee?: string; notes?: string; dueOn?: string },
			) => {
				console.log(
					JSON.stringify(
						await createTask(opts.workspace, name, {
							notes: opts.notes,
							assignee: opts.assignee,
							projects: opts.project ? [opts.project] : undefined,
							due_on: opts.dueOn,
						}),
						null,
						2,
					),
				)
			},
		)

	cmd
		.command('update <gid>')
		.description('Update a task')
		.option('--name <name>', 'New name')
		.option('--notes <text>', 'New notes')
		.option('--completed', 'Mark as completed')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.option('--assignee <gid>', 'Assignee user GID')
		.action(
			async (
				gid: string,
				opts: { name?: string; notes?: string; completed?: boolean; dueOn?: string; assignee?: string },
			) => {
				console.log(
					JSON.stringify(
						await updateTask(gid, {
							name: opts.name,
							notes: opts.notes,
							completed: opts.completed,
							due_on: opts.dueOn,
							assignee: opts.assignee,
						}),
						null,
						2,
					),
				)
			},
		)

	cmd
		.command('delete <gid>')
		.description('Delete a task')
		.action(async (gid: string) => {
			await deleteTask(gid)
			console.log(`Deleted task ${gid}`)
		})

	cmd
		.command('search <text>')
		.description('Search tasks in a workspace')
		.requiredOption('--workspace <gid>', 'Workspace GID')
		.action(async (text: string, opts: { workspace: string }) => {
			console.log(JSON.stringify(await searchTasks(opts.workspace, text), null, 2))
		})

	return cmd
}
