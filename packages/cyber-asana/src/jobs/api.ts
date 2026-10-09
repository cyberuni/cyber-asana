import type { Job } from '../platform/job-polling.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { JobGateway } from './gateway.js'

export type { Job }

export type JobApi = ReturnType<typeof createJobApi>

export function createJobApi(gateway: JobGateway) {
	return {
		getJob(jobGid: string, opts?: ReadOptions) {
			return gateway.getJob(jobGid, opts)
		},
	}
}
