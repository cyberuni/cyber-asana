import { observeProjectIfConfigured, projectObservationFromApi } from '../config/repo-config.js'
import type { JobGateway } from '../jobs/gateway.js'
import { assertJobSucceeded, type Job, type WaitForJobOptions, waitForJob } from '../platform/job-polling.js'
import { listItems } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type {
	CreateProjectFields,
	DuplicateProjectFields,
	ProjectGateway,
	ProjectListOptions,
	SearchProjectsOptions,
	UpdateProjectFields,
} from './gateway.js'

export type {
	CreateProjectFields,
	DuplicateProjectFields,
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

/** Duplicating is asynchronous, so waiting for the copy also needs to read jobs. */
export type ProjectDeps = { jobs?: Pick<JobGateway, 'getJob'> }

/** A copy takes longer to build than a single task, so the wait is longer than the shared default. */
export const DEFAULT_DUPLICATE_TIMEOUT_SECONDS = 60

export function createProjectApi(gateway: ProjectGateway, deps: ProjectDeps = {}) {
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
		duplicateProject(projectGid: string, fields: DuplicateProjectFields) {
			return gateway.duplicateProject(projectGid, fields)
		},
		/**
		 * Duplicate and wait for Asana to finish building the copy. Resolves with the succeeded job, whose
		 * `new_project` carries the GID. A failed job, and a wait that ran out, raise `JobFailedError`.
		 */
		async duplicateProjectAndWait(
			projectGid: string,
			fields: DuplicateProjectFields,
			opts?: WaitForJobOptions,
		): Promise<Job> {
			const jobs = deps.jobs
			if (!jobs) throw new Error('duplicateProjectAndWait needs a job gateway to poll the duplication')
			const job = await gateway.duplicateProject(projectGid, fields)
			return assertJobSucceeded(await waitForJob(job, (jobGid) => jobs.getJob(jobGid), opts))
		},
		searchProjects(workspaceGid: string, opts?: SearchProjectsOptions) {
			return gateway.searchProjects(workspaceGid, opts)
		},
		async exportProject(projectGid: string): Promise<ProjectExport> {
			const project = await gateway.getProject(projectGid)
			const sections = listItems(await gateway.listSections(projectGid))
			const exportedSections: ExportedSection[] = await Promise.all(
				sections.map(async (section) => ({
					gid: section.gid,
					name: section.name ?? '',
					tasks: listItems(await gateway.listTasksForSection(section.gid)).map((task) => ({
						gid: task.gid,
						name: task.name ?? '',
						completed: task.completed ?? false,
						due_on: task.due_on ?? null,
						assignee: task.assignee ? { name: task.assignee.name ?? '' } : null,
						notes: task.notes ?? '',
					})),
				})),
			)
			return {
				gid: project.gid,
				name: project.name ?? '',
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
