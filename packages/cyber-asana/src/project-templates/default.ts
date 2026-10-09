import { createAsanaJobGateway } from '../jobs/gateway.js'
import { createClient } from '../platform/client.js'
import type { WaitForJobOptions } from '../platform/job-polling.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createProjectTemplateApi } from './api.js'
import {
	createAsanaProjectTemplateGateway,
	type InstantiateProjectFields,
	type ProjectTemplateFilters,
} from './gateway.js'

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
