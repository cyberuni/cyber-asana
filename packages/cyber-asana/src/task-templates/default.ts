import { createClient } from '../platform/client.js'
import type { WaitForJobOptions } from '../platform/job-polling.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createTaskTemplateApi } from './api.js'
import { createAsanaTaskTemplateGateway, type InstantiateTaskFields } from './gateway.js'

function defaultTaskTemplateApi() {
	return createTaskTemplateApi(createAsanaTaskTemplateGateway(createClient()))
}

export async function listTaskTemplates(projectGid: string, opts?: PaginationOptions) {
	return defaultTaskTemplateApi().listTaskTemplates(projectGid, opts)
}

export async function getTaskTemplate(taskTemplateGid: string, opts?: ReadOptions) {
	return defaultTaskTemplateApi().getTaskTemplate(taskTemplateGid, opts)
}

export async function instantiateTask(
	taskTemplateGid: string,
	fields?: InstantiateTaskFields,
	opts?: WaitForJobOptions,
) {
	return defaultTaskTemplateApi().instantiateTask(taskTemplateGid, fields, opts)
}
