import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { TeamGateway, TeamProjectListOptions } from './gateway.js'

export type TeamApi = ReturnType<typeof createTeamApi>

export function createTeamApi(gateway: TeamGateway) {
	return {
		listTeams(workspaceGid: string, opts?: PaginationOptions) {
			return gateway.listTeams(workspaceGid, opts)
		},
		getTeam(teamGid: string, opts?: ReadOptions) {
			return gateway.getTeam(teamGid, opts)
		},
		listTeamMembers(teamGid: string, opts?: PaginationOptions) {
			return gateway.listTeamMembers(teamGid, opts)
		},
		listTeamProjects(teamGid: string, opts?: TeamProjectListOptions) {
			return gateway.listTeamProjects(teamGid, opts)
		},
	}
}
