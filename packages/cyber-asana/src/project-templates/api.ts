import type { JobGateway } from '../jobs/gateway.js'
import { assertJobSucceeded, type Job, type WaitForJobOptions, waitForJob } from '../platform/job-polling.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type {
	InstantiateProjectFields,
	ProjectTemplateFilters,
	ProjectTemplateGateway,
	ProjectTemplatePrivacySetting,
	RequestedDate,
	RequestedRole,
} from './gateway.js'

export type {
	InstantiateProjectFields,
	ProjectTemplateFilters,
	ProjectTemplatePrivacySetting,
	RequestedDate,
	RequestedRole,
}

/** The project an instantiation job produced, once it has succeeded. */
export type NewProject = { gid?: string; name?: string }

export function newProjectOf(job: Job): NewProject | undefined {
	return (job.new_project ?? undefined) as NewProject | undefined
}

/** A project takes longer to build than a single task, so the wait is longer than the shared default. */
export const DEFAULT_INSTANTIATE_TIMEOUT_SECONDS = 60

/** Instantiation is asynchronous, so the templates API also needs to read jobs. */
export type ProjectTemplateDeps = { jobs: JobGateway }

export type ProjectTemplateApi = ReturnType<typeof createProjectTemplateApi>

export function createProjectTemplateApi(gateway: ProjectTemplateGateway, deps: ProjectTemplateDeps) {
	return {
		listProjectTemplates(filters?: ProjectTemplateFilters, opts?: PaginationOptions) {
			return gateway.listProjectTemplates(filters, opts)
		},
		listProjectTemplatesForTeam(teamGid: string, opts?: PaginationOptions) {
			return gateway.listProjectTemplatesForTeam(teamGid, opts)
		},
		getProjectTemplate(templateGid: string, opts?: ReadOptions) {
			return gateway.getProjectTemplate(templateGid, opts)
		},
		instantiateProject(templateGid: string, fields: InstantiateProjectFields) {
			return gateway.instantiateProject(templateGid, fields)
		},
		/**
		 * Instantiate and wait for Asana to finish building the project.
		 * Resolves with the succeeded job — whose `new_project` carries the GID.
		 * A job that failed, and a wait that ran out while it was still running,
		 * both raise `JobFailedError` rather than reading as success.
		 */
		async instantiateProjectAndWait(
			templateGid: string,
			fields: InstantiateProjectFields,
			opts?: WaitForJobOptions,
		): Promise<Job> {
			const job = await gateway.instantiateProject(templateGid, fields)
			return assertJobSucceeded(await waitForJob(job, (jobGid) => deps.jobs.getJob(jobGid), opts))
		},
	}
}
