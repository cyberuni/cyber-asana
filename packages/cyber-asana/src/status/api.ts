import { createClient } from '../client.js'
import { createAsanaPortfolioGateway } from '../portfolios/gateway.js'
import { createAsanaProjectGateway } from '../projects/gateway.js'
import {
	createAsanaStatusGateway,
	type StatusCreateFields,
	type StatusGateway,
	type StatusListOptions,
} from './gateway.js'

export type { StatusListOptions } from './gateway.js'

import type { ReadOptions } from '../read-options.js'
import { getStatusOverview as rollUpStatus, type StatusOverviewDeps, type StatusOverviewOptions } from './overview.js'

export type {
	StatusOverview,
	StatusOverviewEntry,
	StatusOverviewOptions,
	StatusOverviewParentType,
} from './overview.js'

/** Gateways the status roll-up composes beyond the status gateway itself. */
export type StatusOverviewGateways = Pick<StatusOverviewDeps, 'portfolios' | 'projects'>

export type StatusApi = ReturnType<typeof createStatusApi>

export function createStatusApi(gateway: StatusGateway, overviewGateways: StatusOverviewGateways) {
	return {
		listStatuses(parentGid: string, opts?: StatusListOptions) {
			return gateway.listStatuses(parentGid, opts)
		},
		getStatus(statusGid: string, opts?: ReadOptions) {
			return gateway.getStatus(statusGid, opts)
		},
		createStatus(parentGid: string, fields: StatusCreateFields) {
			return gateway.createStatus(parentGid, fields)
		},
		deleteStatus(statusGid: string) {
			return gateway.deleteStatus(statusGid)
		},
		getStatusOverview(parentGid: string, opts?: StatusOverviewOptions) {
			return rollUpStatus({ status: gateway, ...overviewGateways }, parentGid, opts)
		},
	}
}

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
