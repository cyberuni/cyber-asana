import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { TeamApi } from './api.js'

export type TeamListPaginationAcceptanceDeps = {
	getApi: () => Pick<TeamApi, 'listTeams'>
	workspaceGid: string
	includeFetchAll?: boolean
}

export function defineTeamListPaginationAcceptanceSpecs(deps: TeamListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listTeams(deps.workspaceGid, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}
