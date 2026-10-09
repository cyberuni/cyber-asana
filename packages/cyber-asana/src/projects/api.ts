import { observeProjectIfConfigured, projectObservationFromApi } from '../config/repo-config.js'
import { listItems } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type {
	CreateProjectFields,
	ProjectGateway,
	ProjectListOptions,
	SearchProjectsOptions,
	UpdateProjectFields,
} from './gateway.js'

export type {
	CreateProjectFields,
	ProjectAccessLevel,
	ProjectDefaultView,
	ProjectListOptions,
	ProjectPrivacySetting,
	SearchProjectsOptions,
	UpdateProjectFields,
} from './gateway.js'

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

export type ProjectApi = ReturnType<typeof createProjectApi>

export function createProjectApi(gateway: ProjectGateway) {
	return {
		listProjects(workspaceGid: string, opts?: ProjectListOptions) {
			return gateway.listProjects(workspaceGid, opts)
		},
		async getProject(projectGid: string, opts?: ReadOptions) {
			const project = await gateway.getProject(projectGid, opts)
			const observation = projectObservationFromApi(project)
			if (observation) {
				await observeProjectIfConfigured(observation).catch(() => undefined)
			}
			return project
		},
		getProjectTaskCounts(projectGid: string, opts?: { optFields?: string }) {
			return gateway.getProjectTaskCounts(projectGid, opts)
		},
		createProject(workspaceGid: string, name: string, opts?: CreateProjectFields) {
			return gateway.createProject(workspaceGid, name, opts)
		},
		updateProject(projectGid: string, fields: UpdateProjectFields) {
			return gateway.updateProject(projectGid, fields)
		},
		deleteProject(projectGid: string) {
			return gateway.deleteProject(projectGid)
		},
		searchProjects(workspaceGid: string, opts?: SearchProjectsOptions) {
			return gateway.searchProjects(workspaceGid, opts)
		},
		async exportProject(projectGid: string): Promise<ProjectExport> {
			const project = await gateway.getProject(projectGid)
			const sections = listItems(await gateway.listSections(projectGid))
			const exportedSections: ExportedSection[] = await Promise.all(
				sections.map(async (section: { gid: string; name: string }) => ({
					gid: section.gid,
					name: section.name,
					tasks: listItems(await gateway.listTasksForSection(section.gid)),
				})),
			)
			return {
				gid: project.gid,
				name: project.name,
				notes: project.notes ?? '',
				sections: exportedSections,
			}
		},
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
