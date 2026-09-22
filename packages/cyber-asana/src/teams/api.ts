import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import type { ReadOptions } from '../read-options.js'
import { createAsanaTeamGateway, type TeamGateway } from './gateway.js'

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

function defaultTeamApi() {
	return createTeamApi(createAsanaTeamGateway(createClient()))
}

export async function listTeams(workspaceGid: string, opts?: PaginationOptions) {
	return defaultTeamApi().listTeams(workspaceGid, opts)
}

export async function getTeam(teamGid: string, opts?: ReadOptions) {
	return defaultTeamApi().getTeam(teamGid, opts)
}
