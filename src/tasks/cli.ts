import { Command } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	itemsForOutput,
	normalizedGid,
	paginationOptionsFromCli,
	printNextPageHint,
	requiredGid,
} from '../cli-options.js'
import { output, printFields, printTable } from '../output.js'
import {
	createTask,
	deleteTask,
	getTask,
	listTasks,
	scanTodos,
	searchTasks,
	type SearchTasksOptions,
	type TodoMatch,
	updateTask,
} from './api.js'

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

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List tasks in a project'), 'project', 'Project GID').option(
			'--completed-since <date>',
			'Only include tasks completed on or after this date (ISO 8601 or "now" for incomplete only)',
		),
	).action(
		async (opts: {
			project?: string
			projectGid?: string
			completedSince?: string
			limit?: number
			offset?: string
			optFields?: string
		}) => {
			const data = await listTasks(requiredGid(opts, 'project', 'Project GID'), {
				completedSince: opts.completedSince,
				...paginationOptionsFromCli(opts),
			})
			output(data, () => {
				fmtTaskList(itemsForOutput(data))
				printNextPageHint(data)
			})
		},
	)

	cmd
		.command('get <gid>')
		.description('Get a task by GID')
		.action(async (gid: string) => {
			const data = await getTask(gid)
			output(data, () => fmtTask(data))
		})

	addGidOption(
		addGidOption(
			addGidOption(
				cmd.command('create <name>').description('Create a new task'),
				'workspace',
				'Workspace GID',
				{ env: 'ASANA_WORKSPACE' },
			),
			'project',
			'Project GID',
		),
		'assignee',
		'Assignee user GID',
	)
		.option('--notes <text>', 'Task notes')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.action(
			async (
				name: string,
				opts: {
					workspace?: string
					workspaceGid?: string
					project?: string
					projectGid?: string
					assignee?: string
					assigneeGid?: string
					notes?: string
					dueOn?: string
				},
			) => {
				const data = await createTask(requiredGid(opts, 'workspace', 'Workspace GID'), name, {
					notes: opts.notes,
					assignee: normalizedGid(opts, 'assignee'),
					projects: opts.projectGid || opts.project ? [requiredGid(opts, 'project', 'Project GID')] : undefined,
					due_on: opts.dueOn,
				})
				output(data, () => fmtTask(data))
			},
		)

	addGidOption(
		cmd
			.command('update <gid>')
			.description('Update a task')
			.option('--name <name>', 'New name')
			.option('--notes <text>', 'New notes')
			.option('--completed', 'Mark as completed')
			.option('--due-on <date>', 'Due date (YYYY-MM-DD)'),
		'assignee',
		'Assignee user GID',
	).action(
			async (
				gid: string,
				opts: {
					name?: string
					notes?: string
					completed?: boolean
					dueOn?: string
					assignee?: string
					assigneeGid?: string
				},
			) => {
				const data = await updateTask(gid, {
					name: opts.name,
					notes: opts.notes,
					completed: opts.completed,
					due_on: opts.dueOn,
					assignee: normalizedGid(opts, 'assignee'),
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

	addGidOption(
		cmd.command('search [text]').description('Search tasks in a workspace'),
		'workspace',
		'Workspace GID',
		{ env: 'ASANA_WORKSPACE' },
	)
		.option('--completed', 'Only completed tasks')
		.option('--no-completed', 'Only incomplete tasks')
		.option('--subtask', 'Only subtasks')
		.option('--no-subtask', 'Exclude subtasks')
		.option('--has-attachment', 'Only tasks with attachments')
		.option('--is-blocking', 'Only tasks blocking others')
		.option('--is-blocked', 'Only tasks blocked by others')
		.option('--assignee <gids>', 'Comma-separated assignee GIDs (any match)')
		.option('--project <gids>', 'Comma-separated project GIDs (any match)')
		.option('--section <gids>', 'Comma-separated section GIDs (any match)')
		.option('--tag <gids>', 'Comma-separated tag GIDs (any match)')
		.option('--team <gids>', 'Comma-separated team GIDs (any match)')
		.option('--subtype <subtype>', 'Resource subtype filter (e.g. milestone)')
		.option('--sort-by <field>', 'Sort field: due_date, created_at, completed_at, likes, modified_at')
		.option('--sort-asc', 'Sort ascending (default: descending)')
		.option('--opt-fields <fields>', 'Comma-separated optional Asana fields to include')
		.action(
			async (
				text: string | undefined,
				opts: {
					workspace?: string
					workspaceGid?: string
					completed?: boolean
					subtask?: boolean
					hasAttachment?: boolean
					isBlocking?: boolean
					isBlocked?: boolean
					assignee?: string
					project?: string
					section?: string
					tag?: string
					team?: string
					subtype?: string
					sortBy?: string
					sortAsc?: boolean
					optFields?: string
				},
			) => {
				const searchOpts: SearchTasksOptions = {
					text,
					completed: opts.completed,
					isSubtask: opts.subtask,
					hasAttachment: opts.hasAttachment,
					isBlocking: opts.isBlocking,
					isBlocked: opts.isBlocked,
					assigneeAny: opts.assignee,
					projectsAny: opts.project,
					sectionsAny: opts.section,
					tagsAny: opts.tag,
					teamsAny: opts.team,
					resourceSubtype: opts.subtype,
					sortBy: opts.sortBy,
					sortAscending: opts.sortAsc,
					optFields: opts.optFields,
				}
				const data = await searchTasks(requiredGid(opts, 'workspace', 'Workspace GID'), searchOpts)
				output(data, () => fmtTaskList(data))
			},
		)

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
