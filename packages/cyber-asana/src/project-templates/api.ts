import { createClient } from '../client.js'
import { assertJobSucceeded, type Job, type WaitForJobOptions, waitForJob } from '../job-polling.js'
import type { JobGateway } from '../jobs/gateway.js'
import { createAsanaJobGateway } from '../jobs/gateway.js'
import type { PaginationOptions } from '../pagination.js'
import type { ReadOptions } from '../read-options.js'
import {
	createAsanaProjectTemplateGateway,
	type InstantiateProjectFields,
	type ProjectTemplateFilters,
	type ProjectTemplateGateway,
	type ProjectTemplatePrivacySetting,
	type RequestedDate,
	type RequestedRole,
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

function defaultProjectTemplateApi() {
	const client = createClient()
	return createProjectTemplateApi(createAsanaProjectTemplateGateway(client), {
		jobs: createAsanaJobGateway(client),
	})
}

export async function listProjectTemplates(filters?: ProjectTemplateFilters, opts?: PaginationOptions) {
	return defaultProjectTemplateApi().listProjectTemplates(filters, opts)
}

export async function listProjectTemplatesForTeam(teamGid: string, opts?: PaginationOptions) {
	return defaultProjectTemplateApi().listProjectTemplatesForTeam(teamGid, opts)
}

export async function getProjectTemplate(templateGid: string, opts?: ReadOptions) {
	return defaultProjectTemplateApi().getProjectTemplate(templateGid, opts)
}

export async function instantiateProject(templateGid: string, fields: InstantiateProjectFields) {
	return defaultProjectTemplateApi().instantiateProject(templateGid, fields)
}

export async function instantiateProjectAndWait(
	templateGid: string,
	fields: InstantiateProjectFields,
	opts?: WaitForJobOptions,
) {
	return defaultProjectTemplateApi().instantiateProjectAndWait(templateGid, fields, opts)
}
