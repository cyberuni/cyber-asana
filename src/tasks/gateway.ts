import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'

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

export type TaskGateway = {
	listTasks(projectGid: string, opts?: PaginationOptions & { completedSince?: string }): Promise<ListResult<any>>
	listTasksForSection(sectionGid: string, opts?: PaginationOptions & { completedSince?: string }): Promise<ListResult<any>>
	getTask(taskGid: string): Promise<any>
	getTasksByGid(taskGids: string[], opts?: { optFields?: string }): Promise<TaskBatchLookupResult[]>
	createTask(workspaceGid: string, name: string, opts?: CreateTaskFields): Promise<any>
	updateTask(taskGid: string, fields: UpdateTaskFields): Promise<any>
	deleteTask(taskGid: string): Promise<void>
	getMyTasks(workspaceGid: string, opts?: PaginationOptions & { completedSince?: string }): Promise<ListResult<any>>
	listSubtasks(taskGid: string, opts?: PaginationOptions & { completedSince?: string }): Promise<ListResult<any>>
	createSubtask(parentTaskGid: string, name: string, opts?: { notes?: string; assignee?: string; dueOn?: string }): Promise<any>
	addTaskToProject(taskGid: string, projectGid: string, opts?: { sectionGid?: string; insertAfter?: string; insertBefore?: string }): Promise<any>
	removeTaskFromProject(taskGid: string, projectGid: string): Promise<any>
	addFollowersToTask(taskGid: string, followerGids: string[]): Promise<any>
	removeFollowersFromTask(taskGid: string, followerGids: string[]): Promise<any>
	getDependencies(taskGid: string, opts?: { optFields?: string }): Promise<any>
	getDependents(taskGid: string, opts?: { optFields?: string }): Promise<any>
	addDependencies(taskGid: string, dependencyGids: string[]): Promise<any>
	addDependents(taskGid: string, dependentGids: string[]): Promise<any>
	removeDependencies(taskGid: string, dependencyGids: string[]): Promise<void>
	removeDependents(taskGid: string, dependentGids: string[]): Promise<void>
	searchTasks(workspaceGid: string, opts?: SearchTasksOptions): Promise<any>
}

const TASK_BATCH_ACTION_LIMIT = 10

function taskRelativePath(taskGid: string, optFields?: string) {
	return optFields ? `/tasks/${taskGid}?opt_fields=${optFields}` : `/tasks/${taskGid}`
}

const DEFAULT_DEP_FIELDS = 'gid,name,completed,due_on'

export function createAsanaTaskGateway(client: Asana.ApiClient): TaskGateway {
	const tasksApi = new Asana.TasksApi(client)
	const batchApi = new Asana.BatchAPIApi(client)
	const utlApi = new Asana.UserTaskListsApi(client)

	return {
		async listTasks(projectGid, opts) {
			const res = await tasksApi.getTasksForProject(projectGid, {
				completed_since: opts?.completedSince,
				...toAsanaPaginationOptions(opts),
			})
			return await collectListResponse(res, opts)
		},
		async listTasksForSection(sectionGid, opts) {
			const res = await tasksApi.getTasksForSection(sectionGid, {
				completed_since: opts?.completedSince,
				...toAsanaPaginationOptions(opts),
			})
			return await collectListResponse(res, opts)
		},
		async getTask(taskGid) {
			const res = await tasksApi.getTask(taskGid, {})
			return res.data
		},
		async getTasksByGid(taskGids, opts) {
			const results: TaskBatchLookupResult[] = []
			for (let i = 0; i < taskGids.length; i += TASK_BATCH_ACTION_LIMIT) {
				const chunk = taskGids.slice(i, i + TASK_BATCH_ACTION_LIMIT)
				const res = await batchApi.createBatchRequest({
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
						results.push({ gid, ok: false, status: item.status_code, errors: item.body?.errors ?? [] })
					}
				}
			}
			return results
		},
		async createTask(workspaceGid, name, opts) {
			const res = await tasksApi.createTask({ data: { name, workspace: workspaceGid, ...opts } })
			if (opts?.followers?.length) {
				return await this.addFollowersToTask(res.data.gid, opts.followers)
			}
			return res.data
		},
		async updateTask(taskGid, fields) {
			const { parent, clear_parent, ...taskFields } = fields
			let updatedTask: any | undefined
			if (Object.keys(taskFields).length > 0) {
				const res = await tasksApi.updateTask({ data: taskFields }, taskGid, {})
				updatedTask = res.data
			}
			if (parent !== undefined || clear_parent) {
				const res = await tasksApi.setParentForTask({ data: { parent: clear_parent ? null : parent } }, taskGid, {})
				updatedTask = res.data
			}
			return updatedTask
		},
		async deleteTask(taskGid) {
			await tasksApi.deleteTask(taskGid)
		},
		async getMyTasks(workspaceGid, opts) {
			const utlRes = await utlApi.getUserTaskListForUser('me', workspaceGid, {})
			const userTaskListGid = utlRes.data.gid
			const res = await tasksApi.getTasksForUserTaskList(userTaskListGid, {
				completed_since: opts?.completedSince,
				...toAsanaPaginationOptions(opts),
			})
			return await collectListResponse(res, opts)
		},
		async listSubtasks(taskGid, opts) {
			const res = await tasksApi.getSubtasksForTask(taskGid, {
				...(opts?.completedSince && { completed_since: opts.completedSince }),
				...toAsanaPaginationOptions(opts),
			} as Parameters<typeof tasksApi.getSubtasksForTask>[1])
			return await collectListResponse(res, opts)
		},
		async createSubtask(parentTaskGid, name, opts) {
			const res = await tasksApi.createSubtaskForTask(
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
		},
		async addTaskToProject(taskGid, projectGid, opts) {
			return tasksApi.addProjectForTask(
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
		},
		async removeTaskFromProject(taskGid, projectGid) {
			return tasksApi.removeProjectForTask({ data: { project: projectGid } }, taskGid)
		},
		async addFollowersToTask(taskGid, followerGids) {
			const res = await tasksApi.addFollowersForTask({ data: { followers: followerGids } }, taskGid, {})
			return res.data
		},
		async removeFollowersFromTask(taskGid, followerGids) {
			const res = await tasksApi.removeFollowerForTask({ data: { followers: followerGids } }, taskGid, {})
			return res.data
		},
		async getDependencies(taskGid, opts) {
			const res = await tasksApi.getDependenciesForTask(taskGid, { opt_fields: opts?.optFields ?? DEFAULT_DEP_FIELDS })
			return res.data
		},
		async getDependents(taskGid, opts) {
			const res = await tasksApi.getDependentsForTask(taskGid, { opt_fields: opts?.optFields ?? DEFAULT_DEP_FIELDS })
			return res.data
		},
		async addDependencies(taskGid, dependencyGids) {
			return tasksApi.addDependenciesForTask(
				{ data: { dependencies: dependencyGids.map((gid) => ({ gid })) } },
				taskGid,
			)
		},
		async addDependents(taskGid, dependentGids) {
			return tasksApi.addDependentsForTask(
				{ data: { dependents: dependentGids.map((gid) => ({ gid })) } },
				taskGid,
			)
		},
		async removeDependencies(taskGid, dependencyGids) {
			await tasksApi.removeDependenciesForTask(
				{ data: { dependencies: dependencyGids.map((gid) => ({ gid })) } },
				taskGid,
			)
		},
		async removeDependents(taskGid, dependentGids) {
			await tasksApi.removeDependentsForTask(
				{ data: { dependents: dependentGids.map((gid) => ({ gid })) } },
				taskGid,
			)
		},
		async searchTasks(workspaceGid, opts) {
			const res = await tasksApi.searchTasksForWorkspace(workspaceGid, {
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
		},
	}
}
