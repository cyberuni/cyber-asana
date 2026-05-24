import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import Asana from 'asana'
import { createClient } from '../client.js'
import { collectListResponse, type PaginationOptions, toAsanaPaginationOptions } from '../pagination.js'

export type TodoMatch = {
	file: string
	line: number
	pattern: string
	text: string
}

const TODO_RE = /\b(TODO|FIXME|HACK|XXX)\b[:\s]*(.*)/i
const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', '.go', '.rs', '.java', '.rb']
const DEFAULT_EXCLUDE = ['node_modules', 'dist', '.git', 'build', 'coverage', '__pycache__']

async function* walkFiles(dir: string, extensions: string[], exclude: string[]): AsyncGenerator<string> {
	let entries: { name: string; isDirectory(): boolean }[]
	try {
		entries = (await readdir(dir, { withFileTypes: true, encoding: 'utf-8' })) as {
			name: string
			isDirectory(): boolean
		}[]
	} catch {
		return
	}
	for (const entry of entries) {
		if (exclude.includes(entry.name)) continue
		const fullPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			yield* walkFiles(fullPath, extensions, exclude)
		} else if (extensions.some((ext) => entry.name.endsWith(ext))) {
			yield fullPath
		}
	}
}

export async function scanTodos(
	rootDir: string,
	opts?: { extensions?: string[]; exclude?: string[] },
): Promise<TodoMatch[]> {
	const extensions = opts?.extensions ?? DEFAULT_EXTENSIONS
	const exclude = opts?.exclude ?? DEFAULT_EXCLUDE
	const results: TodoMatch[] = []
	for await (const file of walkFiles(rootDir, extensions, exclude)) {
		const content = await readFile(file, 'utf-8')
		for (const [i, line] of content.split('\n').entries()) {
			const match = TODO_RE.exec(line)
			if (match) {
				results.push({
					file: path.relative(rootDir, file),
					line: i + 1,
					pattern: match[1].toUpperCase(),
					text: match[2].trim(),
				})
			}
		}
	}
	return results
}

export async function listTasks(projectGid: string, opts?: PaginationOptions & { completedSince?: string }) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.getTasksForProject(projectGid, {
		completed_since: opts?.completedSince,
		...toAsanaPaginationOptions(opts),
	})
	return await collectListResponse(res, opts)
}

export async function listTasksForSection(sectionGid: string, opts?: PaginationOptions & { completedSince?: string }) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.getTasksForSection(sectionGid, {
		completed_since: opts?.completedSince,
		...toAsanaPaginationOptions(opts),
	})
	return await collectListResponse(res, opts)
}

export async function getTask(taskGid: string) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.getTask(taskGid, {})
	return res.data
}

export type TaskBatchLookupSuccess = {
	gid: string
	ok: true
	task: Record<string, unknown>
}

export type TaskBatchLookupFailure = {
	gid: string
	ok: false
	status: number
	errors: unknown[]
}

export type TaskBatchLookupResult = TaskBatchLookupSuccess | TaskBatchLookupFailure

const TASK_BATCH_ACTION_LIMIT = 10

function taskRelativePath(taskGid: string, optFields?: string) {
	return optFields ? `/tasks/${taskGid}?opt_fields=${optFields}` : `/tasks/${taskGid}`
}

export async function getTasksByGid(
	taskGids: string[],
	opts?: { optFields?: string },
): Promise<TaskBatchLookupResult[]> {
	const api = new Asana.BatchAPIApi(createClient())
	const results: TaskBatchLookupResult[] = []

	for (let i = 0; i < taskGids.length; i += TASK_BATCH_ACTION_LIMIT) {
		const chunk = taskGids.slice(i, i + TASK_BATCH_ACTION_LIMIT)
		const res = await api.createBatchRequest({
			data: {
				actions: chunk.map((gid) => ({
					method: 'get',
					relative_path: taskRelativePath(gid, opts?.optFields),
				})),
			},
		})

		for (const [index, item] of (
			res.data as { status_code: number; body?: { data?: Record<string, unknown>; errors?: unknown[] } }[]
		).entries()) {
			const gid = chunk[index]
			if (item.status_code >= 200 && item.status_code < 300 && item.body?.data) {
				results.push({ gid, ok: true, task: item.body.data })
			} else {
				results.push({
					gid,
					ok: false,
					status: item.status_code,
					errors: item.body?.errors ?? [],
				})
			}
		}
	}

	return results
}

export async function createTask(workspaceGid: string, name: string, opts?: CreateTaskFields) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.createTask({
		data: {
			name,
			workspace: workspaceGid,
			...opts,
		},
	})
	if (opts?.followers?.length) {
		return await addFollowersToTask(res.data.gid, opts.followers)
	}
	return res.data
}

export async function updateTask(taskGid: string, fields: UpdateTaskFields) {
	const api = new Asana.TasksApi(createClient())
	const { parent, clear_parent, ...taskFields } = fields
	let updatedTask: any | undefined
	if (Object.keys(taskFields).length > 0) {
		const res = await api.updateTask({ data: taskFields }, taskGid, {})
		updatedTask = res.data
	}
	if (parent !== undefined || clear_parent) {
		const res = await api.setParentForTask({ data: { parent: clear_parent ? null : parent } }, taskGid, {})
		updatedTask = res.data
	}
	return updatedTask
}

export type TaskCustomFields = Record<string, unknown>

export type CreateTaskFields = {
	notes?: string
	html_notes?: string
	assignee?: string
	projects?: string[]
	due_on?: string
	parent?: string
	resource_subtype?: string
	custom_fields?: TaskCustomFields
	followers?: string[]
}

export type UpdateTaskFields = {
	name?: string
	notes?: string
	html_notes?: string
	completed?: boolean
	due_on?: string | null
	assignee?: string
	parent?: string
	clear_parent?: boolean
	resource_subtype?: string
	custom_fields?: TaskCustomFields
}

export async function getMyTasks(workspaceGid: string, opts?: PaginationOptions & { completedSince?: string }) {
	const utlApi = new Asana.UserTaskListsApi(createClient())
	const utlRes = await utlApi.getUserTaskListForUser('me', workspaceGid, {})
	const userTaskListGid = utlRes.data.gid
	const tasksApi = new Asana.TasksApi(createClient())
	const res = await tasksApi.getTasksForUserTaskList(userTaskListGid, {
		completed_since: opts?.completedSince,
		...toAsanaPaginationOptions(opts),
	})
	return await collectListResponse(res, opts)
}

export async function listSubtasks(taskGid: string, opts?: PaginationOptions & { completedSince?: string }) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.getSubtasksForTask(taskGid, {
		...(opts?.completedSince && { completed_since: opts.completedSince }),
		...toAsanaPaginationOptions(opts),
	} as Parameters<typeof api.getSubtasksForTask>[1])
	return await collectListResponse(res, opts)
}

export async function createSubtask(
	parentTaskGid: string,
	name: string,
	opts?: { notes?: string; assignee?: string; dueOn?: string },
) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.createSubtaskForTask(
		{
			data: {
				name,
				...(opts?.notes !== undefined && { notes: opts.notes }),
				...(opts?.assignee !== undefined && { assignee: opts.assignee }),
				...(opts?.dueOn !== undefined && { due_on: opts.dueOn }),
			},
		},
		parentTaskGid,
		{},
	)
	return res.data
}

export async function addTaskToProject(
	taskGid: string,
	projectGid: string,
	opts?: { sectionGid?: string; insertAfter?: string; insertBefore?: string },
) {
	const api = new Asana.TasksApi(createClient())
	return api.addProjectForTask(
		{
			data: {
				project: projectGid,
				...(opts?.sectionGid !== undefined && { section: opts.sectionGid }),
				...(opts?.insertAfter !== undefined && { insert_after: opts.insertAfter }),
				...(opts?.insertBefore !== undefined && { insert_before: opts.insertBefore }),
			},
		},
		taskGid,
	)
}

export async function removeTaskFromProject(taskGid: string, projectGid: string) {
	const api = new Asana.TasksApi(createClient())
	return api.removeProjectForTask({ data: { project: projectGid } }, taskGid)
}

export async function addFollowersToTask(taskGid: string, followerGids: string[]) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.addFollowersForTask({ data: { followers: followerGids } }, taskGid, {})
	return res.data
}

export async function removeFollowersFromTask(taskGid: string, followerGids: string[]) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.removeFollowerForTask({ data: { followers: followerGids } }, taskGid, {})
	return res.data
}

export async function deleteTask(taskGid: string) {
	const api = new Asana.TasksApi(createClient())
	await api.deleteTask(taskGid)
}

const DEFAULT_DEP_FIELDS = 'gid,name,completed,due_on'

export async function getDependencies(taskGid: string, opts?: { optFields?: string }) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.getDependenciesForTask(taskGid, { opt_fields: opts?.optFields ?? DEFAULT_DEP_FIELDS })
	return res.data
}

export async function getDependents(taskGid: string, opts?: { optFields?: string }) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.getDependentsForTask(taskGid, { opt_fields: opts?.optFields ?? DEFAULT_DEP_FIELDS })
	return res.data
}

export async function addDependencies(taskGid: string, dependencyGids: string[]) {
	const api = new Asana.TasksApi(createClient())
	return api.addDependenciesForTask({ data: { dependencies: dependencyGids.map((gid) => ({ gid })) } }, taskGid)
}

export async function addDependents(taskGid: string, dependentGids: string[]) {
	const api = new Asana.TasksApi(createClient())
	return api.addDependentsForTask({ data: { dependents: dependentGids.map((gid) => ({ gid })) } }, taskGid)
}

export async function removeDependencies(taskGid: string, dependencyGids: string[]) {
	const api = new Asana.TasksApi(createClient())
	await api.removeDependenciesForTask({ data: { dependencies: dependencyGids.map((gid) => ({ gid })) } }, taskGid)
}

export async function removeDependents(taskGid: string, dependentGids: string[]) {
	const api = new Asana.TasksApi(createClient())
	await api.removeDependentsForTask({ data: { dependents: dependentGids.map((gid) => ({ gid })) } }, taskGid)
}

export type SearchTasksOptions = {
	text?: string
	completed?: boolean
	isSubtask?: boolean
	hasAttachment?: boolean
	isBlocking?: boolean
	isBlocked?: boolean
	assigneeAny?: string
	assigneeNot?: string
	projectsAny?: string
	projectsNot?: string
	projectsAll?: string
	sectionsAny?: string
	sectionsNot?: string
	sectionsAll?: string
	tagsAny?: string
	tagsNot?: string
	tagsAll?: string
	teamsAny?: string
	portfoliosAny?: string
	followersAny?: string
	followersNot?: string
	createdByAny?: string
	createdByNot?: string
	assignedByAny?: string
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
	resourceSubtype?: string
	sortBy?: string
	sortAscending?: boolean
	optFields?: string
}

export async function searchTasks(workspaceGid: string, opts?: SearchTasksOptions) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.searchTasksForWorkspace(workspaceGid, {
		text: opts?.text,
		completed: opts?.completed,
		is_subtask: opts?.isSubtask,
		has_attachment: opts?.hasAttachment,
		is_blocking: opts?.isBlocking,
		is_blocked: opts?.isBlocked,
		'assignee.any': opts?.assigneeAny,
		'assignee.not': opts?.assigneeNot,
		'projects.any': opts?.projectsAny,
		'projects.not': opts?.projectsNot,
		'projects.all': opts?.projectsAll,
		'sections.any': opts?.sectionsAny,
		'sections.not': opts?.sectionsNot,
		'sections.all': opts?.sectionsAll,
		'tags.any': opts?.tagsAny,
		'tags.not': opts?.tagsNot,
		'tags.all': opts?.tagsAll,
		'teams.any': opts?.teamsAny,
		'portfolios.any': opts?.portfoliosAny,
		'followers.any': opts?.followersAny,
		'followers.not': opts?.followersNot,
		'created_by.any': opts?.createdByAny,
		'created_by.not': opts?.createdByNot,
		'assigned_by.any': opts?.assignedByAny,
		'assigned_by.not': opts?.assignedByNot,
		'liked_by.not': opts?.likedByNot,
		'commented_on_by.not': opts?.commentedOnByNot,
		due_on: opts?.dueOn,
		'due_on.before': opts?.dueOnBefore,
		'due_on.after': opts?.dueOnAfter,
		'due_at.before': opts?.dueAtBefore,
		'due_at.after': opts?.dueAtAfter,
		start_on: opts?.startOn,
		'start_on.before': opts?.startOnBefore,
		'start_on.after': opts?.startOnAfter,
		created_on: opts?.createdOn,
		'created_on.before': opts?.createdOnBefore,
		'created_on.after': opts?.createdOnAfter,
		'created_at.before': opts?.createdAtBefore,
		'created_at.after': opts?.createdAtAfter,
		completed_on: opts?.completedOn,
		'completed_on.before': opts?.completedOnBefore,
		'completed_on.after': opts?.completedOnAfter,
		'completed_at.before': opts?.completedAtBefore,
		'completed_at.after': opts?.completedAtAfter,
		modified_on: opts?.modifiedOn,
		'modified_on.before': opts?.modifiedOnBefore,
		'modified_on.after': opts?.modifiedOnAfter,
		'modified_at.before': opts?.modifiedAtBefore,
		'modified_at.after': opts?.modifiedAtAfter,
		resource_subtype: opts?.resourceSubtype,
		sort_by: opts?.sortBy,
		sort_ascending: opts?.sortAscending,
		opt_fields: opts?.optFields,
	})
	return res.data
}
