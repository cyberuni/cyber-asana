import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { TeamGateway } from './gateway.js'

export type TeamApi = ReturnType<typeof createTeamApi>

export function createTeamApi(gateway: TeamGateway) {
	return {
		listTeams(workspaceGid: string, opts?: PaginationOptions) {
			return gateway.listTeams(workspaceGid, opts)
		},
		getTeam(teamGid: string, opts?: ReadOptions) {
			return gateway.getTeam(teamGid, opts)
		},
	}
}
