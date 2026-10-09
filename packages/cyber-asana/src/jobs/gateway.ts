import Asana from 'asana'
import type { Job } from '../platform/job-polling.js'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'

export type JobGateway = {
	getJob(jobGid: string, opts?: ReadOptions): Promise<Job>
}

export function createAsanaJobGateway(client: Asana.ApiClient): JobGateway {
	const jobsApi = new Asana.JobsApi(client)

	return {
		async getJob(jobGid, opts) {
			const res = await jobsApi.getJob(jobGid, toAsanaReadOptions(opts))
			return res.data
		},
	}
}
