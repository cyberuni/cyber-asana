import { createAsanaJobGateway } from '../jobs/gateway.js'
import { createClient } from '../platform/client.js'
import type { WaitForJobOptions } from '../platform/job-polling.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createProjectApi, type ProjectExport } from './api.js'
import {
	type CreateProjectFields,
	createAsanaProjectGateway,
	type DuplicateProjectFields,
	type ProjectListOptions,
	type SearchProjectsOptions,
	type UpdateProjectFields,
} from './gateway.js'

function defaultProjectApi() {
	const client = createClient()
	return createProjectApi(createAsanaProjectGateway(client), { jobs: createAsanaJobGateway(client) })
}

export async function listProjects(workspaceGid: string, opts?: ProjectListOptions) {
	return defaultProjectApi().listProjects(workspaceGid, opts)
}

export async function getProject(projectGid: string, opts?: ReadOptions) {
	return defaultProjectApi().getProject(projectGid, opts)
}

export async function getProjectTaskCounts(projectGid: string, opts?: { optFields?: string }) {
	return defaultProjectApi().getProjectTaskCounts(projectGid, opts)
}

export async function createProject(workspaceGid: string, name: string, opts?: CreateProjectFields) {
	return defaultProjectApi().createProject(workspaceGid, name, opts)
}

export async function updateProject(projectGid: string, fields: UpdateProjectFields) {
	return defaultProjectApi().updateProject(projectGid, fields)
}

export async function deleteProject(projectGid: string) {
	return defaultProjectApi().deleteProject(projectGid)
}

export async function searchProjects(workspaceGid: string, opts?: SearchProjectsOptions) {
	return defaultProjectApi().searchProjects(workspaceGid, opts)
}

export async function exportProject(projectGid: string): Promise<ProjectExport> {
	return defaultProjectApi().exportProject(projectGid)
}

export async function duplicateProject(projectGid: string, fields: DuplicateProjectFields) {
	return defaultProjectApi().duplicateProject(projectGid, fields)
}

export async function duplicateProjectAndWait(
	projectGid: string,
	fields: DuplicateProjectFields,
	opts?: WaitForJobOptions,
) {
	return defaultProjectApi().duplicateProjectAndWait(projectGid, fields, opts)
}
