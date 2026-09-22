import Asana from 'asana'
import type { Job } from '../job-polling.js'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../read-options.js'

export type InstantiateTaskFields = {
	/** Name for the created task; Asana falls back to the template's own name. */
	name?: string
}

export type TaskTemplateGateway = {
	listTaskTemplates(projectGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	getTaskTemplate(taskTemplateGid: string, opts?: ReadOptions): Promise<any>
	instantiateTask(taskTemplateGid: string, fields?: InstantiateTaskFields): Promise<Job>
	getJob(jobGid: string): Promise<Job>
}

export function createAsanaTaskTemplateGateway(client: Asana.ApiClient): TaskTemplateGateway {
	const taskTemplatesApi = new Asana.TaskTemplatesApi(client)
	const jobsApi = new Asana.JobsApi(client)

	return {
		async listTaskTemplates(projectGid, opts) {
			const res = await taskTemplatesApi.getTaskTemplates({
				project: projectGid,
				...toAsanaPaginationOptions(opts),
			})
			return await collectListResponse(res, opts)
		},
		async getTaskTemplate(taskTemplateGid, opts) {
			const res = await taskTemplatesApi.getTaskTemplate(taskTemplateGid, toAsanaReadOptions(opts))
			return res.data
		},
		async instantiateTask(taskTemplateGid, fields) {
			const res = await taskTemplatesApi.instantiateTask(taskTemplateGid, {
				body: { data: { ...fields } },
			})
			return res.data
		},
		async getJob(jobGid) {
			const res = await jobsApi.getJob(jobGid, {})
			return res.data
		},
	}
}
