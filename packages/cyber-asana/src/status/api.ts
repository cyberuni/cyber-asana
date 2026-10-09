import type { ReadOptions } from '../platform/read-options.js'
import type { StatusCreateFields, StatusGateway, StatusListOptions } from './gateway.js'
import { getStatusOverview as rollUpStatus, type StatusOverviewDeps, type StatusOverviewOptions } from './overview.js'

export type { StatusListOptions } from './gateway.js'
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
