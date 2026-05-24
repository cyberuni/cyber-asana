import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'

export type ProjectPrivacySetting = 'public_to_workspace' | 'private' | 'private_to_team'
export type ProjectDefaultView = 'list' | 'board' | 'calendar' | 'timeline'

export type CreateProjectFields = {
	notes?: string
	html_notes?: string
	color?: string
	privacy_setting?: ProjectPrivacySetting
	default_view?: ProjectDefaultView
	due_on?: string
	start_on?: string
}

export type UpdateProjectFields = {
	name?: string
	notes?: string
	html_notes?: string
	color?: string
	privacy_setting?: ProjectPrivacySetting
	default_view?: ProjectDefaultView
	due_on?: string | null
	start_on?: string | null
}

export type SearchProjectsOptions = {
	text?: string
	completed?: boolean
	teamsAny?: string
	ownerAny?: string
	membersAny?: string
	membersNot?: string
	portfoliosAny?: string
	completedOn?: string
	completedOnBefore?: string
	completedOnAfter?: string
	completedAtBefore?: string
	completedAtAfter?: string
	createdOn?: string
	createdOnBefore?: string
	createdOnAfter?: string
	createdAtBefore?: string
	createdAtAfter?: string
	dueOn?: string
	dueOnBefore?: string
	dueOnAfter?: string
	dueAtBefore?: string
	dueAtAfter?: string
	startOn?: string
	startOnBefore?: string
	startOnAfter?: string
	sortBy?: string
	sortAscending?: boolean
	optFields?: string
}

export type ProjectGateway = {
	listProjects(workspaceGid: string, opts?: PaginationOptions & { archived?: boolean }): Promise<ListResult<any>>
	getProject(projectGid: string): Promise<any>
	getProjectTaskCounts(projectGid: string, opts?: { optFields?: string }): Promise<any>
	createProject(workspaceGid: string, name: string, opts?: CreateProjectFields): Promise<any>
	updateProject(projectGid: string, fields: UpdateProjectFields): Promise<any>
	deleteProject(projectGid: string): Promise<void>
	searchProjects(workspaceGid: string, opts?: SearchProjectsOptions): Promise<any>
	listSections(projectGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	listTasksForSection(sectionGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
}

export function createAsanaProjectGateway(client: Asana.ApiClient): ProjectGateway {
	const projectsApi = new Asana.ProjectsApi(client)
	const sectionsApi = new Asana.SectionsApi(client)
	const tasksApi = new Asana.TasksApi(client)

	return {
		async listProjects(workspaceGid, opts) {
			const res = await projectsApi.getProjectsForWorkspace(workspaceGid, {
				archived: opts?.archived,
				...toAsanaPaginationOptions(opts),
			})
			return await collectListResponse(res, opts)
		},
		async getProject(projectGid) {
			const res = await projectsApi.getProject(projectGid, {})
			return res.data
		},
		async getProjectTaskCounts(projectGid, opts) {
			const res = await projectsApi.getTaskCountsForProject(projectGid, {
				opt_fields: opts?.optFields ?? 'num_tasks,num_incomplete_tasks,num_completed_tasks',
			})
			return res.data
		},
		async createProject(workspaceGid, name, opts) {
			const res = await projectsApi.createProject({ data: { name, workspace: workspaceGid, ...opts } })
			return res.data
		},
		async updateProject(projectGid, fields) {
			const res = await projectsApi.updateProject({ data: fields }, projectGid, {})
			return res.data
		},
		async deleteProject(projectGid) {
			await projectsApi.deleteProject(projectGid)
		},
		async searchProjects(workspaceGid, opts) {
			const res = await projectsApi.searchProjectsForWorkspace(workspaceGid, {
				text: opts?.text,
				completed: opts?.completed,
				'teams.any': opts?.teamsAny,
				'owner.any': opts?.ownerAny,
				'members.any': opts?.membersAny,
				'members.not': opts?.membersNot,
				'portfolios.any': opts?.portfoliosAny,
				completed_on: opts?.completedOn,
				'completed_on.before': opts?.completedOnBefore,
				'completed_on.after': opts?.completedOnAfter,
				'completed_at.before': opts?.completedAtBefore,
				'completed_at.after': opts?.completedAtAfter,
				created_on: opts?.createdOn,
				'created_on.before': opts?.createdOnBefore,
				'created_on.after': opts?.createdOnAfter,
				'created_at.before': opts?.createdAtBefore,
				'created_at.after': opts?.createdAtAfter,
				due_on: opts?.dueOn,
				'due_on.before': opts?.dueOnBefore,
				'due_on.after': opts?.dueOnAfter,
				'due_at.before': opts?.dueAtBefore,
				'due_at.after': opts?.dueAtAfter,
				start_on: opts?.startOn,
				'start_on.before': opts?.startOnBefore,
				'start_on.after': opts?.startOnAfter,
				sort_by: opts?.sortBy,
				sort_ascending: opts?.sortAscending,
				opt_fields: opts?.optFields,
			})
			return res.data
		},
		async listSections(projectGid, opts) {
			const res = await sectionsApi.getSectionsForProject(projectGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async listTasksForSection(sectionGid, opts) {
			const res = await tasksApi.getTasksForSection(sectionGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
	}
}
