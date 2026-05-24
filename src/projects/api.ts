import Asana from 'asana'
import { createClient } from '../client.js'
import { collectListResponse, listItems, type PaginationOptions, toAsanaPaginationOptions } from '../pagination.js'
import { listSections } from '../sections/api.js'
import { listTasksForSection } from '../tasks/api.js'

export async function listProjects(workspaceGid: string, opts?: PaginationOptions & { archived?: boolean }) {
	const api = new Asana.ProjectsApi(createClient())
	const res = await api.getProjectsForWorkspace(workspaceGid, {
		archived: opts?.archived,
		...toAsanaPaginationOptions(opts),
	})
	return await collectListResponse(res, opts)
}

export async function getProject(projectGid: string) {
	const api = new Asana.ProjectsApi(createClient())
	const res = await api.getProject(projectGid, {})
	return res.data
}

export async function getProjectTaskCounts(projectGid: string, opts?: { optFields?: string }) {
	const api = new Asana.ProjectsApi(createClient())
	const res = await api.getTaskCountsForProject(projectGid, {
		opt_fields: opts?.optFields ?? 'num_tasks,num_incomplete_tasks,num_completed_tasks',
	})
	return res.data
}

export async function createProject(workspaceGid: string, name: string, opts?: { notes?: string; color?: string }) {
	const api = new Asana.ProjectsApi(createClient())
	const res = await api.createProject({
		data: { name, workspace: workspaceGid, ...opts },
	})
	return res.data
}

export async function updateProject(projectGid: string, fields: { name?: string; notes?: string; color?: string }) {
	const api = new Asana.ProjectsApi(createClient())
	const res = await api.updateProject({ data: fields }, projectGid, {})
	return res.data
}

export async function deleteProject(projectGid: string) {
	const api = new Asana.ProjectsApi(createClient())
	await api.deleteProject(projectGid)
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

export async function searchProjects(workspaceGid: string, opts?: SearchProjectsOptions) {
	const api = new Asana.ProjectsApi(createClient())
	const res = await api.searchProjectsForWorkspace(workspaceGid, {
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
}

export type ExportedTask = {
	gid: string
	name: string
	completed: boolean
	due_on: string | null
	assignee: { name: string } | null
	notes: string
}

export type ExportedSection = {
	gid: string
	name: string
	tasks: ExportedTask[]
}

export type ProjectExport = {
	gid: string
	name: string
	notes: string
	sections: ExportedSection[]
}

export async function exportProject(projectGid: string): Promise<ProjectExport> {
	const project = await getProject(projectGid)
	const sections = listItems(await listSections(projectGid))
	const exportedSections: ExportedSection[] = await Promise.all(
		sections.map(async (section: { gid: string; name: string }) => ({
			gid: section.gid,
			name: section.name,
			tasks: listItems(await listTasksForSection(section.gid)),
		})),
	)
	return {
		gid: project.gid,
		name: project.name,
		notes: project.notes ?? '',
		sections: exportedSections,
	}
}

function checkbox(completed: boolean) {
	return completed ? '[x]' : '[ ]'
}

export function renderProjectMarkdown(data: ProjectExport): string {
	const lines: string[] = [`# ${data.name}`]
	if (data.notes) lines.push('', `> ${data.notes.replace(/\n/g, '\n> ')}`)
	for (const section of data.sections) {
		lines.push('', `## ${section.name}`, '')
		if (section.tasks.length === 0) {
			lines.push('_(no tasks)_')
		} else {
			for (const task of section.tasks) {
				const parts = [task.name]
				if (task.assignee?.name) parts.push(`— ${task.assignee.name}`)
				if (task.due_on) parts.push(`— due ${task.due_on}`)
				lines.push(`- ${checkbox(task.completed)} ${parts.join(' ')}`)
			}
		}
	}
	return lines.join('\n')
}
