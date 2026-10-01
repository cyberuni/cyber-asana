import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { AiStudioApi } from './api.js'

export type AiStudioListPaginationAcceptanceDeps = {
	getApi: () => Pick<AiStudioApi, 'listAiStudioRuns' | 'listAiStudioSeats'>
	workspaceGid: string
	includeFetchAll?: boolean
}

export function defineAiStudioRunListPaginationAcceptanceSpecs(deps: AiStudioListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listAiStudioRuns(deps.workspaceGid, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}

export function defineAiStudioSeatListPaginationAcceptanceSpecs(deps: AiStudioListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listAiStudioSeats(deps.workspaceGid, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}
