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
	addDependencies,
	addDependents,
	addFollowersToTask,
	addTaskToProject,
	createSubtask,
	createTask,
	deleteTask,
	getDependencies,
	getDependents,
	getMyTasks,
	getTask,
	listSubtasks,
	listTasks,
	removeDependencies,
	removeDependents,
	removeFollowersFromTask,
	removeTaskFromProject,
	type SearchTasksOptions,
	scanTodos,
	searchTasks,
	type TodoMatch,
	updateTask,
} from './api.js'
import { buildTaskCreateFields, buildTaskUpdateFields } from './write-options.js'

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

function collectOption(value: string, previous: string[] = []) {
	return [...previous, value]
}

export function taskCommand() {
	const cmd = new Command('task').description('Manage Asana tasks')

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List tasks in a project'), 'project', 'Project GID')
			.option('--completed-since <date>', 'Only include tasks completed on or after this date (ISO 8601 or "now")')
			.option('--incomplete', 'Only show incomplete tasks (shorthand for --completed-since now)'),
	).action(
		async (opts: {
			project?: string
			projectGid?: string
			completedSince?: string
			incomplete?: boolean
			limit?: number
			offset?: string
			optFields?: string
		}) => {
			const data = await listTasks(requiredGid(opts, 'project', 'Project GID'), {
				completedSince: opts.incomplete ? 'now' : opts.completedSince,
				...paginationOptionsFromCli(opts),
			})
			output(data, () => {
				fmtTaskList(itemsForOutput(data))
				printNextPageHint(data)
			})
		},
	)

	const myTasksCmd = cmd.command('my-tasks').description('Manage My Tasks for the authenticated user')

	addPaginationOptions(
		addGidOption(myTasksCmd.command('list').description('List My Tasks'), 'workspace', 'Workspace GID', {
			env: 'ASANA_WORKSPACE',
		})
			.option('--completed-since <date>', 'Only include tasks completed on or after this date (ISO 8601 or "now")')
			.option('--incomplete', 'Only show incomplete tasks (shorthand for --completed-since now)'),
	).action(
		async (opts: {
			workspace?: string
			workspaceGid?: string
			completedSince?: string
			incomplete?: boolean
			limit?: number
			offset?: string
			optFields?: string
		}) => {
			const data = await getMyTasks(requiredGid(opts, 'workspace', 'Workspace GID'), {
				completedSince: opts.incomplete ? 'now' : opts.completedSince,
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
				addGidOption(cmd.command('create <name>').description('Create a new task'), 'workspace', 'Workspace GID', {
					env: 'ASANA_WORKSPACE',
				}),
				'project',
				'Project GID',
			),
			'parent',
			'Parent task GID',
		),
		'assignee',
		'Assignee user GID',
	)
		.option('--notes <text>', 'Task notes')
		.option('--html-notes <html>', 'Task notes as HTML')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.option('--resource-subtype <subtype>', 'Task resource subtype (e.g. default_task, milestone)')
		.option('--follower <gid[,gid...]>', 'Follower user GIDs')
		.option('--custom-fields-json <json>', 'Custom field values as a JSON object')
		.option('--custom-field <gid=value>', 'Custom field value override', collectOption, [])
		.action(
			async (
				name: string,
				opts: {
					workspace?: string
					workspaceGid?: string
					project?: string
					projectGid?: string
					parent?: string
					parentGid?: string
					assignee?: string
					assigneeGid?: string
					notes?: string
					htmlNotes?: string
					dueOn?: string
					resourceSubtype?: string
					follower?: string
					customFieldsJson?: string
					customField: string[]
				},
			) => {
				const data = await createTask(
					requiredGid(opts, 'workspace', 'Workspace GID'),
					name,
					buildTaskCreateFields({
						notes: opts.notes,
						htmlNotes: opts.htmlNotes,
						assignee: normalizedGid(opts, 'assignee'),
						projectInput: opts.projectGid ?? opts.project,
						followerInput: opts.follower,
						dueOn: opts.dueOn,
						parent: normalizedGid(opts, 'parent'),
						resourceSubtype: opts.resourceSubtype,
						customFieldsJson: opts.customFieldsJson,
						customFieldEntries: opts.customField,
					}),
				)
				output(data, () => fmtTask(data))
			},
		)

	addGidOption(
		addGidOption(
			cmd
				.command('update <gid>')
				.description('Update a task')
				.option('--name <name>', 'New name')
				.option('--notes <text>', 'New notes')
				.option('--html-notes <html>', 'New notes as HTML')
				.option('--completed', 'Mark as completed')
				.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
				.option('--clear-due-on', 'Clear the due date')
				.option('--clear-parent', 'Remove the parent task relationship')
				.option('--resource-subtype <subtype>', 'Task resource subtype (e.g. default_task, milestone)')
				.option('--custom-fields-json <json>', 'Custom field values as a JSON object')
				.option('--custom-field <gid=value>', 'Custom field value override', collectOption, []),
			'parent',
			'Parent task GID',
		),
		'assignee',
		'Assignee user GID',
	).action(
		async (
			gid: string,
			opts: {
				name?: string
				notes?: string
				htmlNotes?: string
				completed?: boolean
				dueOn?: string
				clearDueOn?: boolean
				parent?: string
				parentGid?: string
				clearParent?: boolean
				resourceSubtype?: string
				customFieldsJson?: string
				customField: string[]
				assignee?: string
				assigneeGid?: string
			},
		) => {
			const data = await updateTask(
				gid,
				buildTaskUpdateFields({
					name: opts.name,
					notes: opts.notes,
					htmlNotes: opts.htmlNotes,
					completed: opts.completed,
					dueOn: opts.dueOn,
					clearDueOn: opts.clearDueOn,
					assignee: normalizedGid(opts, 'assignee'),
					parent: normalizedGid(opts, 'parent'),
					clearParent: opts.clearParent,
					resourceSubtype: opts.resourceSubtype,
					customFieldsJson: opts.customFieldsJson,
					customFieldEntries: opts.customField,
				}),
			)
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

	const subtaskCmd = cmd.command('subtask').description('Manage subtasks')

	addPaginationOptions(
		subtaskCmd
			.command('list <task-gid>')
			.description('List subtasks of a task')
			.option('--incomplete', 'Only show incomplete subtasks')
			.option('--assignee-email', 'Include assignee email (opt_fields: assignee,assignee.email)')
			.option('--follower-emails', 'Include follower emails (opt_fields: followers,followers.email)')
			.option('--num-subtasks', 'Include subtask count (opt_fields: num_subtasks)')
			.option('--custom-fields', 'Include custom fields (opt_fields: custom_fields)'),
	).action(
		async (
			taskGid: string,
			opts: {
				limit?: number
				offset?: string
				optFields?: string
				incomplete?: boolean
				assigneeEmail?: boolean
				followerEmails?: boolean
				numSubtasks?: boolean
				customFields?: boolean
			},
		) => {
			const extraFields = [
				opts.assigneeEmail && 'assignee,assignee.email',
				opts.followerEmails && 'followers,followers.email',
				opts.numSubtasks && 'num_subtasks',
				opts.customFields && 'custom_fields',
			]
				.filter(Boolean)
				.join(',')
			const pagination = paginationOptionsFromCli(opts)
			if (extraFields) {
				pagination.optFields = [pagination.optFields, extraFields].filter(Boolean).join(',')
			}
			const data = await listSubtasks(taskGid, {
				completedSince: opts.incomplete ? 'now' : undefined,
				...pagination,
			})
			output(data, () => {
				fmtTaskList(itemsForOutput(data))
				printNextPageHint(data)
			})
		},
	)

	addGidOption(
		subtaskCmd
			.command('create <task-gid> <name>')
			.description('Create a subtask under a task')
			.option('--notes <text>', 'Task notes')
			.option('--due-on <date>', 'Due date (YYYY-MM-DD)'),
		'assignee',
		'Assignee user GID',
	).action(
		async (
			taskGid: string,
			name: string,
			opts: { notes?: string; dueOn?: string; assignee?: string; assigneeGid?: string },
		) => {
			const data = await createSubtask(taskGid, name, {
				notes: opts.notes,
				assignee: normalizedGid(opts, 'assignee'),
				dueOn: opts.dueOn,
			})
			output(data, () => fmtTask(data))
		},
	)

	addGidOption(cmd.command('search [text]').description('Search tasks in a workspace'), 'workspace', 'Workspace GID', {
		env: 'ASANA_WORKSPACE',
	})
		.option('--completed', 'Only completed tasks')
		.option('--no-completed', 'Only incomplete tasks')
		.option('--subtask', 'Only subtasks')
		.option('--no-subtask', 'Exclude subtasks')
		.option('--has-attachment', 'Only tasks with attachments')
		.option('--is-blocking', 'Only tasks blocking others')
		.option('--is-blocked', 'Only tasks blocked by others')
		.option('--assignee <gid[,gid...]>', 'Assignee GIDs (any match)')
		.option('--assignee-not <gid[,gid...]>', 'Assignee GIDs to exclude')
		.option('--project <gid[,gid...]>', 'Project GIDs (any match)')
		.option('--project-not <gid[,gid...]>', 'Project GIDs to exclude')
		.option('--project-all <gid[,gid...]>', 'Project GIDs (all must match)')
		.option('--section <gid[,gid...]>', 'Section GIDs (any match)')
		.option('--section-not <gid[,gid...]>', 'Section GIDs to exclude')
		.option('--section-all <gid[,gid...]>', 'Section GIDs (all must match)')
		.option('--tag <gid[,gid...]>', 'Tag GIDs (any match)')
		.option('--tag-not <gid[,gid...]>', 'Tag GIDs to exclude')
		.option('--tag-all <gid[,gid...]>', 'Tag GIDs (all must match)')
		.option('--team <gid[,gid...]>', 'Team GIDs (any match)')
		.option('--portfolio <gid[,gid...]>', 'Portfolio GIDs (any match)')
		.option('--follower <gid[,gid...]>', 'Follower user GIDs (any match)')
		.option('--follower-not <gid[,gid...]>', 'Follower user GIDs to exclude')
		.option('--created-by <gid[,gid...]>', 'Created-by user GIDs (any match)')
		.option('--created-by-not <gid[,gid...]>', 'Created-by user GIDs to exclude')
		.option('--assigned-by <gid[,gid...]>', 'Assigned-by user GIDs (any match)')
		.option('--assigned-by-not <gid[,gid...]>', 'Assigned-by user GIDs to exclude')
		.option('--liked-by-not <gid[,gid...]>', 'User GIDs who did not like the task')
		.option('--commented-on-by-not <gid[,gid...]>', 'User GIDs who did not comment on the task')
		.option('--due-on <date>', 'Exact due date (YYYY-MM-DD)')
		.option('--due-on-before <date>', 'Due date before (YYYY-MM-DD)')
		.option('--due-on-after <date>', 'Due date after (YYYY-MM-DD)')
		.option('--due-at-before <datetime>', 'Due datetime before (ISO 8601)')
		.option('--due-at-after <datetime>', 'Due datetime after (ISO 8601)')
		.option('--start-on <date>', 'Exact start date (YYYY-MM-DD)')
		.option('--start-on-before <date>', 'Start date before (YYYY-MM-DD)')
		.option('--start-on-after <date>', 'Start date after (YYYY-MM-DD)')
		.option('--created-on <date>', 'Exact creation date (YYYY-MM-DD)')
		.option('--created-on-before <date>', 'Creation date before (YYYY-MM-DD)')
		.option('--created-on-after <date>', 'Creation date after (YYYY-MM-DD)')
		.option('--created-at-before <datetime>', 'Creation datetime before (ISO 8601)')
		.option('--created-at-after <datetime>', 'Creation datetime after (ISO 8601)')
		.option('--completed-on <date>', 'Exact completion date (YYYY-MM-DD)')
		.option('--completed-on-before <date>', 'Completion date before (YYYY-MM-DD)')
		.option('--completed-on-after <date>', 'Completion date after (YYYY-MM-DD)')
		.option('--completed-at-before <datetime>', 'Completion datetime before (ISO 8601)')
		.option('--completed-at-after <datetime>', 'Completion datetime after (ISO 8601)')
		.option('--modified-on <date>', 'Exact modification date (YYYY-MM-DD)')
		.option('--modified-on-before <date>', 'Modification date before (YYYY-MM-DD)')
		.option('--modified-on-after <date>', 'Modification date after (YYYY-MM-DD)')
		.option('--modified-at-before <datetime>', 'Modification datetime before (ISO 8601)')
		.option('--modified-at-after <datetime>', 'Modification datetime after (ISO 8601)')
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
					assigneeNot?: string
					project?: string
					projectNot?: string
					projectAll?: string
					section?: string
					sectionNot?: string
					sectionAll?: string
					tag?: string
					tagNot?: string
					tagAll?: string
					team?: string
					portfolio?: string
					follower?: string
					followerNot?: string
					createdBy?: string
					createdByNot?: string
					assignedBy?: string
					assignedByNot?: string
					likedByNot?: string
					commentedOnByNot?: string
					dueOn?: string
					dueOnBefore?: string
					dueOnAfter?: string
					dueAtBefore?: string
					dueAtAfter?: string
					startOn?: string
					startOnBefore?: string
					startOnAfter?: string
					createdOn?: string
					createdOnBefore?: string
					createdOnAfter?: string
					createdAtBefore?: string
					createdAtAfter?: string
					completedOn?: string
					completedOnBefore?: string
					completedOnAfter?: string
					completedAtBefore?: string
					completedAtAfter?: string
					modifiedOn?: string
					modifiedOnBefore?: string
					modifiedOnAfter?: string
					modifiedAtBefore?: string
					modifiedAtAfter?: string
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
					assigneeNot: opts.assigneeNot,
					projectsAny: opts.project,
					projectsNot: opts.projectNot,
					projectsAll: opts.projectAll,
					sectionsAny: opts.section,
					sectionsNot: opts.sectionNot,
					sectionsAll: opts.sectionAll,
					tagsAny: opts.tag,
					tagsNot: opts.tagNot,
					tagsAll: opts.tagAll,
					teamsAny: opts.team,
					portfoliosAny: opts.portfolio,
					followersAny: opts.follower,
					followersNot: opts.followerNot,
					createdByAny: opts.createdBy,
					createdByNot: opts.createdByNot,
					assignedByAny: opts.assignedBy,
					assignedByNot: opts.assignedByNot,
					likedByNot: opts.likedByNot,
					commentedOnByNot: opts.commentedOnByNot,
					dueOn: opts.dueOn,
					dueOnBefore: opts.dueOnBefore,
					dueOnAfter: opts.dueOnAfter,
					dueAtBefore: opts.dueAtBefore,
					dueAtAfter: opts.dueAtAfter,
					startOn: opts.startOn,
					startOnBefore: opts.startOnBefore,
					startOnAfter: opts.startOnAfter,
					createdOn: opts.createdOn,
					createdOnBefore: opts.createdOnBefore,
					createdOnAfter: opts.createdOnAfter,
					createdAtBefore: opts.createdAtBefore,
					createdAtAfter: opts.createdAtAfter,
					completedOn: opts.completedOn,
					completedOnBefore: opts.completedOnBefore,
					completedOnAfter: opts.completedOnAfter,
					completedAtBefore: opts.completedAtBefore,
					completedAtAfter: opts.completedAtAfter,
					modifiedOn: opts.modifiedOn,
					modifiedOnBefore: opts.modifiedOnBefore,
					modifiedOnAfter: opts.modifiedOnAfter,
					modifiedAtBefore: opts.modifiedAtBefore,
					modifiedAtAfter: opts.modifiedAtAfter,
					resourceSubtype: opts.subtype,
					sortBy: opts.sortBy,
					sortAscending: opts.sortAsc,
					optFields: opts.optFields,
				}
				const data = await searchTasks(requiredGid(opts, 'workspace', 'Workspace GID'), searchOpts)
				output(data, () => fmtTaskList(data))
			},
		)

	const projectCmd = cmd.command('project').description('Manage project membership for a task')

	addGidOption(
		projectCmd
			.command('add <task-gid> <project-gid>')
			.description('Add a task to a project')
			.option('--insert-after <gid>', 'Insert after this task GID')
			.option('--insert-before <gid>', 'Insert before this task GID'),
		'section',
		'Section GID',
	).action(
		async (
			taskGid: string,
			projectGid: string,
			opts: { section?: string; sectionGid?: string; insertAfter?: string; insertBefore?: string },
		) => {
			if (opts.insertAfter && opts.insertBefore) {
				throw new Error('--insert-after and --insert-before are mutually exclusive')
			}
			await addTaskToProject(taskGid, projectGid, {
				sectionGid: normalizedGid(opts, 'section'),
				insertAfter: opts.insertAfter,
				insertBefore: opts.insertBefore,
			})
			console.log(`Added task ${taskGid} to project ${projectGid}`)
		},
	)

	projectCmd
		.command('remove <task-gid> <project-gid>')
		.description('Remove a task from a project')
		.action(async (taskGid: string, projectGid: string) => {
			await removeTaskFromProject(taskGid, projectGid)
			console.log(`Removed task ${taskGid} from project ${projectGid}`)
		})

	const followerCmd = cmd.command('follower').description('Manage followers for a task')

	followerCmd
		.command('add <task-gid> <follower-gids...>')
		.description('Add followers to a task')
		.action(async (taskGid: string, followerGids: string[]) => {
			await addFollowersToTask(taskGid, followerGids)
			console.log(`Added ${followerGids.length} follower(s) to task ${taskGid}`)
		})

	followerCmd
		.command('remove <task-gid> <follower-gids...>')
		.description('Remove followers from a task')
		.action(async (taskGid: string, followerGids: string[]) => {
			await removeFollowersFromTask(taskGid, followerGids)
			console.log(`Removed ${followerGids.length} follower(s) from task ${taskGid}`)
		})

	const dependencyCmd = cmd.command('dependency').description('Manage task dependencies (tasks this task depends on)')

	dependencyCmd
		.command('list <task-gid>')
		.description('List dependencies of a task')
		.option('--opt-fields <fields>', 'Comma-separated Asana fields to include')
		.action(async (taskGid: string, opts: { optFields?: string }) => {
			const data = await getDependencies(taskGid, { optFields: opts.optFields })
			output(data, () => fmtTaskList(data))
		})

	dependencyCmd
		.command('add <task-gid> <dep-gids...>')
		.description('Add dependencies to a task (space-separated GIDs)')
		.action(async (taskGid: string, depGids: string[]) => {
			await addDependencies(taskGid, depGids)
			console.log(`Added ${depGids.length} dependency(s) to task ${taskGid}`)
		})

	dependencyCmd
		.command('remove <task-gid> <dep-gids...>')
		.description('Remove dependencies from a task (space-separated GIDs)')
		.action(async (taskGid: string, depGids: string[]) => {
			await removeDependencies(taskGid, depGids)
			console.log(`Removed ${depGids.length} dependency(s) from task ${taskGid}`)
		})

	const dependentCmd = cmd.command('dependent').description('Manage task dependents (tasks that depend on this task)')

	dependentCmd
		.command('list <task-gid>')
		.description('List dependents of a task')
		.option('--opt-fields <fields>', 'Comma-separated Asana fields to include')
		.action(async (taskGid: string, opts: { optFields?: string }) => {
			const data = await getDependents(taskGid, { optFields: opts.optFields })
			output(data, () => fmtTaskList(data))
		})

	dependentCmd
		.command('add <task-gid> <dep-gids...>')
		.description('Add dependents to a task (space-separated GIDs)')
		.action(async (taskGid: string, depGids: string[]) => {
			await addDependents(taskGid, depGids)
			console.log(`Added ${depGids.length} dependent(s) to task ${taskGid}`)
		})

	dependentCmd
		.command('remove <task-gid> <dep-gids...>')
		.description('Remove dependents from a task (space-separated GIDs)')
		.action(async (taskGid: string, depGids: string[]) => {
			await removeDependents(taskGid, depGids)
			console.log(`Removed ${depGids.length} dependent(s) from task ${taskGid}`)
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
