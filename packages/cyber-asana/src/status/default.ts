import { createClient } from '../platform/client.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createAsanaPortfolioGateway } from '../portfolios/gateway.js'
import { createAsanaProjectGateway } from '../projects/gateway.js'
import { createStatusApi } from './api.js'
import { createAsanaStatusGateway, type StatusCreateFields, type StatusListOptions } from './gateway.js'
import type { StatusOverviewOptions } from './overview.js'

function defaultStatusApi() {
	const client = createClient()
	return createStatusApi(createAsanaStatusGateway(client), {
		portfolios: createAsanaPortfolioGateway(client),
		projects: createAsanaProjectGateway(client),
	})
}

export async function listStatuses(parentGid: string, opts?: StatusListOptions) {
	return defaultStatusApi().listStatuses(parentGid, opts)
}

export async function getStatus(statusGid: string, opts?: ReadOptions) {
	return defaultStatusApi().getStatus(statusGid, opts)
}

export async function createStatus(parentGid: string, fields: StatusCreateFields) {
	return defaultStatusApi().createStatus(parentGid, fields)
}

export async function deleteStatus(statusGid: string) {
	return defaultStatusApi().deleteStatus(statusGid)
}

export async function getStatusOverview(parentGid: string, opts?: StatusOverviewOptions) {
	return defaultStatusApi().getStatusOverview(parentGid, opts)
}
