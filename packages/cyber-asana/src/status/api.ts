import type { GoalGateway } from '../goals/gateway.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { StatusCreateFields, StatusGateway, StatusListOptions } from './gateway.js'
import { getStatusOverview as rollUpStatus, type StatusOverviewDeps, type StatusOverviewOptions } from './overview.js'
import { assertKnownStatusType, assertStatusType, type StatusParentType, statusTypeIsExclusive } from './status-type.js'

export type { StatusListOptions } from './gateway.js'
export type {
	StatusOverview,
	StatusOverviewEntry,
	StatusOverviewOptions,
	StatusOverviewParentType,
} from './overview.js'

/** Gateways the status roll-up composes beyond the status gateway itself. */
export type StatusOverviewGateways = Pick<StatusOverviewDeps, 'portfolios' | 'projects'> & {
	/** Lets `createStatus` tell a goal from a project when the status_type fits only one of them. */
	goals?: Pick<GoalGateway, 'getGoal'>
}

export type { StatusParentType } from './status-type.js'
export type CreateStatusOptions = {
	/** Skips parent detection, saving up to three calls. */
	parentType?: StatusParentType
}

export type StatusApi = ReturnType<typeof createStatusApi>

export function createStatusApi(gateway: StatusGateway, overviewGateways: StatusOverviewGateways) {
	return {
		listStatuses(parentGid: string, opts?: StatusListOptions) {
			return gateway.listStatuses(parentGid, opts)
		},
		getStatus(statusGid: string, opts?: ReadOptions) {
			return gateway.getStatus(statusGid, opts)
		},
		/**
		 * Validates `status_type` per parent type (G13) before posting. A type every parent accepts needs
		 * no lookup; one only some accept needs the parent's type, stated or detected.
		 */
		async createStatus(parentGid: string, fields: StatusCreateFields, opts?: CreateStatusOptions) {
			if (opts?.parentType) assertStatusType(fields.status_type, opts.parentType)
			else {
				assertKnownStatusType(fields.status_type)
				if (statusTypeIsExclusive(fields.status_type)) {
					const detected = await detectParentType(overviewGateways, parentGid)
					if (detected) assertStatusType(fields.status_type, detected)
				}
			}
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

/** Probes portfolio, then project, then goal; undefined when none answers, so Asana judges the call. */
async function detectParentType(gateways: StatusOverviewGateways, gid: string): Promise<StatusParentType | undefined> {
	const probes: Array<[StatusParentType, (() => Promise<unknown>) | undefined]> = [
		['portfolio', () => gateways.portfolios.getPortfolio(gid)],
		['project', () => gateways.projects.getProject(gid)],
		['goal', gateways.goals && (() => gateways.goals?.getGoal(gid) as Promise<unknown>)],
	]
	for (const [type, probe] of probes) {
		if (!probe) continue
		try {
			await probe()
			return type
		} catch {
			// not that kind of parent; try the next
		}
	}
	return undefined
}
