import { createClient } from '../platform/client.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createJobApi } from './api.js'
import { createAsanaJobGateway } from './gateway.js'

function defaultJobApi() {
	return createJobApi(createAsanaJobGateway(createClient()))
}

export async function getJob(jobGid: string, opts?: ReadOptions) {
	return defaultJobApi().getJob(jobGid, opts)
}
