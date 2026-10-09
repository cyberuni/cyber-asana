import { type Job, type WaitForJobOptions, waitForJob } from '../platform/job-polling.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { InstantiateTaskFields, TaskTemplateGateway } from './gateway.js'

export type TaskTemplateApi = ReturnType<typeof createTaskTemplateApi>

export function createTaskTemplateApi(gateway: TaskTemplateGateway) {
	return {
		listTaskTemplates(projectGid: string, opts?: PaginationOptions) {
			return gateway.listTaskTemplates(projectGid, opts)
		},
		getTaskTemplate(taskTemplateGid: string, opts?: ReadOptions) {
			return gateway.getTaskTemplate(taskTemplateGid, opts)
		},
		async instantiateTask(
			taskTemplateGid: string,
			fields?: InstantiateTaskFields,
			opts?: WaitForJobOptions,
		): Promise<Job> {
			const job = await gateway.instantiateTask(taskTemplateGid, fields)
			return await waitForJob(job, (jobGid) => gateway.getJob(jobGid), opts)
		},
	}
}
