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

export type TeamMembersPaginationAcceptanceDeps = {
	getApi: () => Pick<TeamApi, 'listTeamMembers'>
	teamGid: string
	includeFetchAll?: boolean
}

/** `team members <gid>` pages like every other list. */
export function defineTeamMembersPaginationAcceptanceSpecs(deps: TeamMembersPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listTeamMembers(deps.teamGid, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}

export type TeamProjectsPaginationAcceptanceDeps = {
	getApi: () => Pick<TeamApi, 'listTeamProjects'>
	teamGid: string
	includeFetchAll?: boolean
}

/** `team projects <gid>` pages like every other list. */
export function defineTeamProjectsPaginationAcceptanceSpecs(deps: TeamProjectsPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listTeamProjects(deps.teamGid, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}
