import { Command, Option } from 'commander'
import { output, printFields, printTable } from '../output.js'
import {
	createTask,
	deleteTask,
	getTask,
	listTasks,
	scanTodos,
	searchTasks,
	type TodoMatch,
	updateTask,
} from './api.js'

const workspaceOpt = () =>
	new Option('--workspace <gid>', 'Workspace GID (or set ASANA_WORKSPACE)').env('ASANA_WORKSPACE').makeOptionMandatory()

type Task = {
	gid: string
	name: string
	permalink_url?: string
	completed?: boolean
	due_on?: string | null
	assignee?: { name: string } | null
	notes?: string
}

function fmtTask(t: Task) {
	printFields({
		Name: t.name,
		ID: t.gid,
		URL: t.permalink_url,
		Assignee: t.assignee?.name ?? null,
		Due: t.due_on ?? null,
		Done: t.completed != null ? String(t.completed) : null,
		Notes: t.notes || null,
	})
}

function fmtTaskList(tasks: Task[]) {
	printTable(tasks, [
		{ label: 'Name', get: (t) => t.name },
		{ label: 'ID', get: (t) => t.gid },
		{ label: 'Done', get: (t) => (t.completed ? 'yes' : 'no') },
		{ label: 'Due', get: (t) => t.due_on ?? '' },
	])
}

export function taskCommand() {
	const cmd = new Command('task').description('Manage Asana tasks')

	cmd
		.command('list')
		.description('List tasks in a project')
		.requiredOption('--project <gid>', 'Project GID')
		.option(
			'--completed-since <date>',
			'Only include tasks completed on or after this date (ISO 8601 or "now" for incomplete only)',
		)
		.action(async (opts: { project: string; completedSince?: string }) => {
			const data = await listTasks(opts.project, { completedSince: opts.completedSince })
			output(data, () => fmtTaskList(data))
		})

	cmd
		.command('get <gid>')
		.description('Get a task by GID')
		.action(async (gid: string) => {
			const data = await getTask(gid)
			output(data, () => fmtTask(data))
		})

	cmd
		.command('create <name>')
		.description('Create a new task')
		.addOption(workspaceOpt())
		.option('--project <gid>', 'Project GID')
		.option('--assignee <gid>', 'Assignee user GID')
		.option('--notes <text>', 'Task notes')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.action(
			async (
				name: string,
				opts: { workspace: string; project?: string; assignee?: string; notes?: string; dueOn?: string },
			) => {
				const data = await createTask(opts.workspace, name, {
					notes: opts.notes,
					assignee: opts.assignee,
					projects: opts.project ? [opts.project] : undefined,
					due_on: opts.dueOn,
				})
				output(data, () => fmtTask(data))
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
				const data = await updateTask(gid, {
					name: opts.name,
					notes: opts.notes,
					completed: opts.completed,
					due_on: opts.dueOn,
					assignee: opts.assignee,
				})
				output(data, () => fmtTask(data))
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
		.addOption(workspaceOpt())
		.action(async (text: string, opts: { workspace: string }) => {
			const data = await searchTasks(opts.workspace, text)
			output(data, () => fmtTaskList(data))
		})

	cmd
		.command('scan-todos [dir]')
		.description('Scan source files for TODO/FIXME/HACK comments and return structured results')
		.option(
			'--ext <extensions>',
			'Comma-separated file extensions to scan (e.g. .ts,.py)',
			'.ts,.tsx,.js,.jsx,.mjs,.py,.go,.rs,.java,.rb',
		)
		.option(
			'--exclude <dirs>',
			'Comma-separated directory names to skip',
			'node_modules,dist,.git,build,coverage,__pycache__',
		)
		.action(async (dir: string | undefined, opts: { ext: string; exclude: string }) => {
			const root = dir ?? process.cwd()
			const extensions = opts.ext.split(',').map((e) => e.trim())
			const exclude = opts.exclude.split(',').map((e) => e.trim())
			const data = await scanTodos(root, { extensions, exclude })
			output(data, () => {
				if (data.length === 0) {
					console.log('(none)')
					return
				}
				printTable(data, [
					{ label: 'File', get: (t: TodoMatch) => t.file },
					{ label: 'Line', get: (t: TodoMatch) => String(t.line) },
					{ label: 'Pattern', get: (t: TodoMatch) => t.pattern },
					{ label: 'Text', get: (t: TodoMatch) => t.text },
				])
			})
		})

	return cmd
}
