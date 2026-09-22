import { createClient } from '../client.js'
import type { Job } from '../job-polling.js'
import type { ReadOptions } from '../read-options.js'
import { createAsanaJobGateway, type JobGateway } from './gateway.js'

export type { Job }

export type JobApi = ReturnType<typeof createJobApi>

export function createJobApi(gateway: JobGateway) {
	return {
		getJob(jobGid: string, opts?: ReadOptions) {
			return gateway.getJob(jobGid, opts)
		},
	}
}

function defaultJobApi() {
	return createJobApi(createAsanaJobGateway(createClient()))
}

export async function getJob(jobGid: string, opts?: ReadOptions) {
	return defaultJobApi().getJob(jobGid, opts)
}
